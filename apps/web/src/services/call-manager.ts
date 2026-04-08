/**
 * WebRTC call manager — mesh P2P calls + screen sharing + audio/video toggle.
 *
 * Features:
 *  - Mesh P2P for group calls (each peer connects to every other peer)
 *  - ICE reconnection on network blips (restartIce + iceRestart offer)
 *  - Bandwidth constraints (64kbps audio, 800kbps video, 1500kbps screen)
 *  - Codec preferences (Opus for audio, VP8 for video)
 *  - Connection quality monitoring with adaptive bitrate
 *  - Mid-call audio ↔ video upgrade/downgrade via renegotiation
 *  - Screen sharing with track replacement
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
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
let currentCallId: string | null = null;
let cachedIceServers: RTCIceServer[] | null = null;
let statsInterval: ReturnType<typeof setInterval> | null = null;

// ─── Constants ──────────────────────────────────────────────────────────────

const AUDIO_MAX_BITRATE = 64_000;
const VIDEO_MAX_BITRATE = 800_000;
const SCREEN_MAX_BITRATE = 1_500_000;
const VIDEO_DEGRADED_BITRATE = 400_000;
const VIDEO_FAIR_BITRATE = 600_000;

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640, max: 1280 },
  height: { ideal: 480, max: 720 },
  frameRate: { ideal: 24, max: 30 },
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function myUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

/** "Polite peer" — smaller userId yields on glare (simultaneous offers). */
function isPolite(targetUserId: string): boolean {
  const me = myUserId();
  return me ? me < targetUserId : false;
}

// ─── Codec preferences (web only) ──────────────────────────────────────────

function preferCodecs(pc: RTCPeerConnection) {
  try {
    for (const transceiver of pc.getTransceivers()) {
      if (!transceiver.sender.track) continue;
      const kind = transceiver.sender.track.kind;

      if (kind === 'audio') {
        const caps = RTCRtpSender.getCapabilities?.('audio');
        if (caps) {
          const opus = caps.codecs.filter((c) => c.mimeType.toLowerCase() === 'audio/opus');
          const rest = caps.codecs.filter((c) => c.mimeType.toLowerCase() !== 'audio/opus');
          if (opus.length) transceiver.setCodecPreferences([...opus, ...rest]);
        }
      }

      if (kind === 'video') {
        const caps = RTCRtpSender.getCapabilities?.('video');
        if (caps) {
          const vp8 = caps.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/vp8');
          const rest = caps.codecs.filter((c) => c.mimeType.toLowerCase() !== 'video/vp8');
          if (vp8.length) transceiver.setCodecPreferences([...vp8, ...rest]);
        }
      }
    }
  } catch {
    // setCodecPreferences not supported — fine, use defaults
  }
}

// ─── Bandwidth constraints ──────────────────────────────────────────────────

async function applyBandwidthConstraints(pc: RTCPeerConnection) {
  const { isScreenSharing } = store();
  for (const sender of pc.getSenders()) {
    if (!sender.track) continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      if (sender.track.kind === 'audio') {
        params.encodings[0].maxBitrate = AUDIO_MAX_BITRATE;
      } else if (sender.track.kind === 'video') {
        params.encodings[0].maxBitrate = isScreenSharing ? SCREEN_MAX_BITRATE : VIDEO_MAX_BITRATE;
      }
      await sender.setParameters(params);
    } catch (e) {
      log('setParameters error:', e);
    }
  }
}

async function adaptBitrate(pc: RTCPeerConnection, quality: 'good' | 'fair' | 'poor') {
  for (const sender of pc.getSenders()) {
    if (!sender.track || sender.track.kind !== 'video') continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) continue;
      if (quality === 'poor') {
        params.encodings[0].maxBitrate = VIDEO_DEGRADED_BITRATE;
        params.encodings[0].maxFramerate = 15;
      } else if (quality === 'fair') {
        params.encodings[0].maxBitrate = VIDEO_FAIR_BITRATE;
        params.encodings[0].maxFramerate = 24;
      } else {
        params.encodings[0].maxBitrate = store().isScreenSharing ? SCREEN_MAX_BITRATE : VIDEO_MAX_BITRATE;
        delete params.encodings[0].maxFramerate;
      }
      await sender.setParameters(params);
    } catch {
      // ignore
    }
  }
}

// ─── Stats monitoring ───────────────────────────────────────────────────────

function startStatsMonitor() {
  stopStatsMonitor();
  statsInterval = setInterval(async () => {
    for (const [userId, { pc }] of peers) {
      if (pc.connectionState !== 'connected') continue;
      try {
        const stats = await pc.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = (report as any).currentRoundTripTime ?? 0;
          }
          if (report.type === 'inbound-rtp') {
            packetsLost += (report as any).packetsLost ?? 0;
            packetsReceived += (report as any).packetsReceived ?? 0;
          }
        });

        const lossRate = packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;
        let quality: 'good' | 'fair' | 'poor';
        if (rtt < 0.15 && lossRate < 0.02) quality = 'good';
        else if (rtt < 0.3 && lossRate < 0.05) quality = 'fair';
        else quality = 'poor';

        store().setConnectionQuality(userId, quality);
        adaptBitrate(pc, quality);
      } catch {
        // stats not available
      }
    }
  }, 3000);
}

function stopStatsMonitor() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
}

// ─── PeerConnection ──────────────────────────────────────────────────────────

async function createPC(targetUserId: string): Promise<RTCPeerConnection> {
  // Close existing PC for this user if any
  peers.get(targetUserId)?.pc.close();
  clearTimeout(reconnectTimers.get(targetUserId));
  reconnectTimers.delete(targetUserId);

  const iceServers = await resolveIceServers();
  const conn = new RTCPeerConnection({
    iceServers,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  });

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
      log('<- Remote track from', targetUserId, 'kind:', e.track.kind);
      store().addRemoteStream(targetUserId, e.streams[0]);
    }
  };

  conn.onnegotiationneeded = async () => {
    if (!currentCallId) return;
    try {
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      preferCodecs(conn);
      log('-> Renegotiation offer to', targetUserId);
      getSocket().emit('call:offer', { callId: currentCallId, targetUserId, sdp: offer.sdp });
      state.remoteDescSet = false;
      state.pendingCandidates = [];
    } catch (e) {
      log('negotiationneeded failed:', e);
    }
  };

  conn.onconnectionstatechange = () => {
    log(`[${targetUserId}] Connection state:`, conn.connectionState);

    if (conn.connectionState === 'connected') {
      clearTimeout(reconnectTimers.get(targetUserId));
      reconnectTimers.delete(targetUserId);
      applyBandwidthConstraints(conn);
      // Start stats monitoring if not running
      if (!statsInterval) startStatsMonitor();
    } else if (conn.connectionState === 'disconnected') {
      // Give 5 seconds to recover before attempting reconnect
      const timer = setTimeout(() => {
        if (conn.connectionState !== 'connected') {
          attemptReconnect(targetUserId);
        }
      }, 5000);
      reconnectTimers.set(targetUserId, timer);
    } else if (conn.connectionState === 'failed') {
      attemptReconnect(targetUserId);
    }
  };

  return conn;
}

async function attemptReconnect(targetUserId: string): Promise<void> {
  const state = peers.get(targetUserId);
  if (!state || !currentCallId) {
    closePeer(targetUserId);
    return;
  }

  log('Attempting ICE restart for', targetUserId);
  try {
    state.pc.restartIce();
    const offer = await state.pc.createOffer({ iceRestart: true });
    await state.pc.setLocalDescription(offer);
    getSocket().emit('call:offer', { callId: currentCallId, targetUserId, sdp: offer.sdp });
    state.remoteDescSet = false;
    state.pendingCandidates = [];
  } catch (e) {
    log('ICE restart failed, closing peer:', e);
    closePeer(targetUserId);
  }
}

function closePeer(userId: string) {
  clearTimeout(reconnectTimers.get(userId));
  reconnectTimers.delete(userId);
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
    return await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: type === 'video' ? VIDEO_CONSTRAINTS : false,
    });
  } catch (err) {
    log('getUserMedia failed with video, falling back to audio-only. Error:', err);
    return navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: false });
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

  preferCodecs(conn);

  const offer = await conn.createOffer();
  await conn.setLocalDescription(offer);

  log('-> Sending offer to', targetUserId);
  getSocket().emit('call:offer', { callId: currentCallId, targetUserId, sdp: offer.sdp });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * RECEIVER: called after REST answer.
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
 * CALLER: receives call:accepted — new participant accepted.
 */
export async function onCallAccepted(data: { callId: string; userId: string }): Promise<void> {
  const { activeCall, localStream, setActiveCall, setLocalStream } = store();
  log('onCallAccepted: data=', data, 'activeCall=', activeCall?.id);

  if (!activeCall || data.callId !== activeCall.id) return;

  const targetUserId = data.userId;
  const me = myUserId();
  currentCallId = activeCall.id;

  const participants = [
    ...new Set([...(activeCall.participants ?? []), targetUserId, ...(me ? [me] : [])]),
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
 * ANY PARTICIPANT: receives call:participant-joined.
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
 * RECEIVER: receives SDP offer from caller.
 * Supports renegotiation — reuses existing PC if one exists for this peer.
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

  const existingPeer = peers.get(data.fromUserId);

  if (existingPeer) {
    // Renegotiation (ICE restart or mid-call track change)
    const { pc } = existingPeer;

    // Glare handling: if we also have a pending local offer, polite peer rolls back
    if (pc.signalingState === 'have-local-offer') {
      if (isPolite(data.fromUserId)) {
        log('Polite peer: rolling back local offer for renegotiation from', data.fromUserId);
        await pc.setLocalDescription({ type: 'rollback' });
      } else {
        log('Impolite peer: ignoring conflicting offer from', data.fromUserId);
        return;
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
    existingPeer.remoteDescSet = true;
    await flushPending(data.fromUserId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    log('-> Sending renegotiation answer to', data.fromUserId);
    getSocket().emit('call:answer', {
      callId: data.callId,
      targetUserId: data.fromUserId,
      sdp: answer.sdp,
    });
    return;
  }

  // New peer connection
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
  preferCodecs(conn);

  await conn.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
  peerState.remoteDescSet = true;
  await flushPending(data.fromUserId);

  const answer = await conn.createAnswer();
  await conn.setLocalDescription(answer);

  log('-> Sending answer to', data.fromUserId);
  getSocket().emit('call:answer', {
    callId: data.callId,
    targetUserId: data.fromUserId,
    sdp: answer.sdp,
  });
}

/**
 * CALLER: receives SDP answer from receiver.
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
 * ICE candidate — add or queue.
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

// ─── Audio ↔ Video toggle ───────────────────────────────────────────────────

/**
 * Upgrade current audio call to video — acquires camera and adds video track.
 */
export async function upgradeToVideo(): Promise<void> {
  const { activeCall, localStream, setLocalStream, setActiveCall } = store();
  if (!activeCall || !localStream) return;

  log('Upgrading to video call');

  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: VIDEO_CONSTRAINTS,
      audio: false,
    });
    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Add video track to local stream
    localStream.addTrack(videoTrack);
    setLocalStream(localStream); // trigger re-render

    // Add video track to all peer connections (triggers onnegotiationneeded)
    for (const [, { pc }] of peers) {
      pc.addTrack(videoTrack, localStream);
    }

    // Update call type
    setActiveCall({ ...activeCall, type: 'video' });

    // Notify remote peers
    const me = myUserId();
    for (const participantId of activeCall.participants ?? []) {
      if (participantId !== me) {
        getSocket().emit('call:video-mode', {
          callId: activeCall.id,
          targetUserId: participantId,
          videoEnabled: true,
        });
      }
    }

    log('Upgraded to video');
  } catch (err) {
    log('upgradeToVideo failed:', err);
  }
}

/**
 * Downgrade current video call to audio — stops camera and removes video track.
 */
export async function downgradeToAudio(): Promise<void> {
  const { activeCall, localStream, setActiveCall } = store();
  if (!activeCall || !localStream) return;

  log('Downgrading to audio call');

  // Stop and remove video tracks
  const videoTracks = localStream.getVideoTracks();
  for (const track of videoTracks) {
    track.stop();
    localStream.removeTrack(track);
  }

  // Remove video senders from all PCs (triggers onnegotiationneeded)
  for (const [, { pc }] of peers) {
    const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (videoSender) {
      pc.removeTrack(videoSender);
    }
  }

  // Update call type and reset video state
  useCallStore.setState({ isVideoOff: false, isScreenSharing: false });
  setActiveCall({ ...activeCall, type: 'audio' });

  // Notify remote peers
  const me = myUserId();
  for (const participantId of activeCall.participants ?? []) {
    if (participantId !== me) {
      getSocket().emit('call:video-mode', {
        callId: activeCall.id,
        targetUserId: participantId,
        videoEnabled: false,
      });
    }
  }

  log('Downgraded to audio');
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
    const me = myUserId();
    for (const participantId of activeCall.participants ?? []) {
      if (participantId !== me) {
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
    const me = myUserId();
    for (const participantId of activeCall.participants ?? []) {
      if (participantId !== me) {
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
  stopStatsMonitor();
  for (const [userId] of reconnectTimers) {
    clearTimeout(reconnectTimers.get(userId));
  }
  reconnectTimers.clear();
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
    const me = myUserId();
    for (const participantId of activeCall.participants ?? []) {
      if (participantId !== me) {
        getSocket().emit('call:hangup', { callId: activeCall.id, targetUserId: participantId });
      }
    }
  }
  cleanup();
}
