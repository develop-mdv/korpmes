/**
 * WebRTC call manager — групповые звонки (mesh P2P) + шаринг экрана.
 *
 * Схема сигналинга (1-1 и группа):
 *  1. Alice звонит  → REST POST /calls → бэкенд шлёт всем chat:members call:initiate (WS)
 *  2. Bob принимает → REST PATCH /calls/:id/answer
 *                   → бэкенд шлёт Alice call:accepted (WS)
 *                   → если есть ещё участники — бэкенд шлёт им call:participant-joined (WS)
 *  3. Alice/остальные → создают PeerConnection с Bob → шлют offer (WS relay)
 *  4. Bob → отвечает answer каждому (WS relay)
 *  5. ICE exchange → соединение для каждой пары
 *
 * Screen sharing:
 *  - startScreenShare() → getDisplayMedia() → replaceTrack во всех PC → emit call:screen-share
 *  - stopScreenShare() → restore original video track → emit call:screen-share-stop
 */

import { getSocket } from '@/socket/socket';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';
import { getIceServers } from '@/api/calls.api';

// ─── Per-peer state ───────────────────────────────────────────────────────────

interface PeerState {
  pc: RTCPeerConnection;
  remoteDescSet: boolean;
  pendingCandidates: RTCIceCandidateInit[];
}

const peers = new Map<string, PeerState>();
let currentCallId: string | null = null;
let cachedIceServers: RTCIceServer[] | null = null;

async function resolveIceServers(): Promise<RTCIceServer[]> {
  if (cachedIceServers) return cachedIceServers;
  try {
    const res = await getIceServers();
    cachedIceServers = res.iceServers;
    return cachedIceServers;
  } catch {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }
}

function log(msg: string, ...args: unknown[]) {
  console.log(`[Call] ${msg}`, ...args);
}

function store() {
  return useCallStore.getState();
}

// ─── PeerConnection ──────────────────────────────────────────────────────────

async function createPC(targetUserId: string): Promise<RTCPeerConnection> {
  // Close existing PC for this user if any
  peers.get(targetUserId)?.pc.close();

  const iceServers = await resolveIceServers();
  const conn = new RTCPeerConnection({ iceServers });

  const state: PeerState = { pc: conn, remoteDescSet: false, pendingCandidates: [] };
  peers.set(targetUserId, state);

  conn.onicecandidate = (e) => {
    if (e.candidate && currentCallId) {
      getSocket().emit('call:ice-candidate', {
        callId: currentCallId,
        targetUserId,
        candidate: e.candidate.toJSON(),
      });
    }
  };

  conn.ontrack = (e) => {
    if (e.streams?.[0]) {
      log('← Remote track from', targetUserId, 'kind:', e.track.kind);
      store().addRemoteStream(targetUserId, e.streams[0]);
    }
  };

  conn.onconnectionstatechange = () => {
    log(`[${targetUserId}] Connection state:`, conn.connectionState);
    if (conn.connectionState === 'failed' || conn.connectionState === 'disconnected') {
      closePeer(targetUserId);
    }
  };

  return conn;
}

function closePeer(userId: string) {
  const s = peers.get(userId);
  if (s) {
    s.pc.close();
    peers.delete(userId);
  }
  store().removeRemoteStream(userId);
}

async function flushPending(targetUserId: string) {
  const s = peers.get(targetUserId);
  if (!s || s.pendingCandidates.length === 0) return;
  log(`Flushing ${s.pendingCandidates.length} queued ICE for`, targetUserId);
  for (const c of s.pendingCandidates) {
    try {
      await s.pc.addIceCandidate(new RTCIceCandidate(c));
    } catch (e) {
      log('addIceCandidate error:', e);
    }
  }
  s.pendingCandidates = [];
}

// ─── Media ───────────────────────────────────────────────────────────────────

async function getMedia(type: 'audio' | 'video'): Promise<MediaStream> {
  log('Requesting media, type:', type);
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
  } catch (err) {
    log('getUserMedia failed with video, falling back to audio-only. Error:', err);
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }
}

// ─── Internal: send offer to a peer ─────────────────────────────────────────

async function sendOfferTo(targetUserId: string, stream: MediaStream): Promise<void> {
  const conn = await createPC(targetUserId);

  // Add local tracks (and replace video track with screen if sharing)
  const { isScreenSharing, screenStream } = store();
  stream.getTracks().forEach((t) => {
    if (isScreenSharing && screenStream && t.kind === 'video') {
      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack) conn.addTrack(screenTrack, stream);
      else conn.addTrack(t, stream);
    } else {
      conn.addTrack(t, stream);
    }
  });

  const offer = await conn.createOffer();
  await conn.setLocalDescription(offer);

  log('→ Sending offer to', targetUserId);
  getSocket().emit('call:offer', { callId: currentCallId, targetUserId, sdp: offer.sdp });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * RECEIVER: вызывается после REST answer.
 */
export async function acceptCall(): Promise<void> {
  const { activeCall, setActiveCall, setLocalStream } = store();
  if (!activeCall) return;

  log('acceptCall: callId=', activeCall.id);
  currentCallId = activeCall.id;

  try {
    const stream = await getMedia(activeCall.type);
    setLocalStream(stream);
  } catch (err) {
    log('acceptCall: media failed:', err);
  }

  setActiveCall({ ...activeCall, status: 'active' });
}

/**
 * CALLER: получает call:accepted — новый участник принял.
 * Берём медиа и шлём offer новому участнику.
 */
export async function onCallAccepted(data: { callId: string; userId: string }): Promise<void> {
  const { activeCall, localStream, setActiveCall, setLocalStream } = store();
  log('onCallAccepted: data=', data, 'activeCall=', activeCall?.id);

  if (!activeCall || data.callId !== activeCall.id) return;

  const targetUserId = data.userId;
  const myId = useAuthStore.getState().user?.id;
  currentCallId = activeCall.id;

  const participants = [
    ...new Set([...(activeCall.participants ?? []), targetUserId, ...(myId ? [myId] : [])]),
  ];
  setActiveCall({ ...activeCall, status: 'active', participants });

  let stream = localStream;
  if (!stream) {
    try {
      stream = await getMedia(activeCall.type);
      setLocalStream(stream);
    } catch (err) {
      log('onCallAccepted: media failed:', err);
      cleanup();
      return;
    }
  }

  await sendOfferTo(targetUserId, stream);
}

/**
 * ANY PARTICIPANT: получает call:participant-joined — ещё кто-то присоединился.
 * Создаём PC и шлём offer новому участнику.
 */
export async function onParticipantJoined(data: { callId: string; userId: string }): Promise<void> {
  const { activeCall, localStream, setActiveCall, setLocalStream } = store();
  log('onParticipantJoined: data=', data, 'activeCall=', activeCall?.id);

  if (!activeCall || data.callId !== activeCall.id) return;

  const newUserId = data.userId;
  const participants = [...new Set([...(activeCall.participants ?? []), newUserId])];
  setActiveCall({ ...activeCall, participants });

  let stream = localStream;
  if (!stream) {
    try {
      stream = await getMedia(activeCall.type);
      setLocalStream(stream);
    } catch (err) {
      log('onParticipantJoined: media failed:', err);
      return;
    }
  }

  await sendOfferTo(newUserId, stream);
}

/**
 * RECEIVER: получает SDP offer от caller.
 */
export async function onCallOffer(data: {
  callId: string;
  fromUserId: string;
  sdp: string;
}): Promise<void> {
  const { activeCall, localStream, setLocalStream } = store();
  log('onCallOffer: from=', data.fromUserId, 'callId=', data.callId);

  if (!activeCall || data.callId !== activeCall.id) return;

  currentCallId = data.callId;
  const conn = await createPC(data.fromUserId);
  const peerState = peers.get(data.fromUserId)!;

  let stream = localStream;
  if (!stream) {
    try {
      stream = await getMedia(activeCall.type);
      setLocalStream(stream);
    } catch (err) {
      log('onCallOffer: media failed:', err);
      return;
    }
  }

  stream.getTracks().forEach((t) => conn.addTrack(t, stream!));

  await conn.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
  peerState.remoteDescSet = true;
  await flushPending(data.fromUserId);

  const answer = await conn.createAnswer();
  await conn.setLocalDescription(answer);

  log('→ Sending answer to', data.fromUserId);
  getSocket().emit('call:answer', {
    callId: data.callId,
    targetUserId: data.fromUserId,
    sdp: answer.sdp,
  });
}

/**
 * CALLER: получает SDP answer от receiver.
 */
export async function onCallAnswer(data: {
  callId: string;
  fromUserId: string;
  sdp: string;
}): Promise<void> {
  log('onCallAnswer: from=', data.fromUserId);
  const peerState = peers.get(data.fromUserId);
  if (!peerState || data.callId !== currentCallId) return;

  await peerState.pc.setRemoteDescription(
    new RTCSessionDescription({ type: 'answer', sdp: data.sdp }),
  );
  peerState.remoteDescSet = true;
  await flushPending(data.fromUserId);
}

/**
 * ICE candidate — добавляем или ставим в очередь.
 */
export async function onIceCandidate(data: {
  callId: string;
  fromUserId: string;
  candidate: RTCIceCandidateInit;
}): Promise<void> {
  if (data.callId !== currentCallId) return;
  const peerState = peers.get(data.fromUserId);
  if (!peerState) return;

  if (!peerState.remoteDescSet) {
    peerState.pendingCandidates.push(data.candidate);
    return;
  }
  try {
    await peerState.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (e) {
    log('addIceCandidate error:', e);
  }
}

// ─── Screen sharing ──────────────────────────────────────────────────────────

export async function startScreenShare(): Promise<void> {
  const { activeCall, localStream, setScreenStream, setScreenSharing } = store();
  if (!activeCall) return;

  try {
    const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
      video: { cursor: 'always' },
      audio: false,
    });
    const screenTrack = screenStream.getVideoTracks()[0];

    // Replace video track in all peer connections
    for (const [, { pc }] of peers) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && screenTrack) await sender.replaceTrack(screenTrack);
    }

    setScreenStream(screenStream);
    setScreenSharing(true);

    // When user stops via browser UI
    screenTrack.onended = () => stopScreenShare();

    // Notify remote participants
    const myId = useAuthStore.getState().user?.id;
    for (const participantId of activeCall.participants ?? []) {
      if (participantId !== myId) {
        getSocket().emit('call:screen-share', {
          callId: activeCall.id,
          targetUserId: participantId,
        });
      }
    }

    log('Screen sharing started');
  } catch (err) {
    log('startScreenShare failed:', err);
  }
}

export async function stopScreenShare(): Promise<void> {
  const { activeCall, localStream, screenStream, setScreenStream, setScreenSharing } = store();
  if (!screenStream) return;

  const originalVideoTrack = localStream?.getVideoTracks()[0] ?? null;

  // Restore original camera track (or null if audio-only call)
  for (const [, { pc }] of peers) {
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(originalVideoTrack);
  }

  screenStream.getTracks().forEach((t) => t.stop());
  setScreenStream(null);
  setScreenSharing(false);

  if (activeCall) {
    const myId = useAuthStore.getState().user?.id;
    for (const participantId of activeCall.participants ?? []) {
      if (participantId !== myId) {
        getSocket().emit('call:screen-share-stop', {
          callId: activeCall.id,
          targetUserId: participantId,
        });
      }
    }
  }

  log('Screen sharing stopped');
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export function cleanup(): void {
  log('cleanup: closing', peers.size, 'peer connections');
  for (const [userId] of peers) {
    closePeer(userId);
  }
  currentCallId = null;
  cachedIceServers = null;
  store().endCall();
}

export function hangup(): void {
  const { activeCall } = store();
  if (activeCall) {
    const myId = useAuthStore.getState().user?.id;
    for (const participantId of activeCall.participants ?? []) {
      if (participantId !== myId) {
        getSocket().emit('call:hangup', { callId: activeCall.id, targetUserId: participantId });
      }
    }
  }
  cleanup();
}
