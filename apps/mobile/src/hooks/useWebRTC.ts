import { useCallback, useRef } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { useCallStore } from '../stores/call.store';
import { getExistingSocket } from '../socket/socket';
import { getIceServers } from '../api/calls.api';

// ─── Constants ──────────────────────────────────────────────────────────────

const AUDIO_MAX_BITRATE = 64_000;
const VIDEO_MAX_BITRATE = 800_000;
const RECONNECT_TIMEOUT = 5000;

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const VIDEO_CONSTRAINTS = {
  width: { ideal: 640, max: 1280 },
  height: { ideal: 480, max: 720 },
  frameRate: { ideal: 24, max: 30 },
};

export function useWebRTC() {
  const pcRef = useRef<InstanceType<typeof RTCPeerConnection> | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const remoteDescSet = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const stopStatsMonitor = useCallback(() => {
    if (statsTimer.current) {
      clearInterval(statsTimer.current);
      statsTimer.current = null;
    }
  }, []);

  const applyBandwidthConstraints = useCallback(async (pc: InstanceType<typeof RTCPeerConnection>) => {
    try {
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (!sender.track) continue;
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}] as any;
        }
        if (sender.track.kind === 'audio') {
          params.encodings[0].maxBitrate = AUDIO_MAX_BITRATE;
        } else if (sender.track.kind === 'video') {
          params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE;
        }
        await sender.setParameters(params);
      }
    } catch {
      // setParameters may not be fully supported on all RN-WebRTC versions
    }
  }, []);

  const startStatsMonitor = useCallback((pc: InstanceType<typeof RTCPeerConnection>) => {
    stopStatsMonitor();
    statsTimer.current = setInterval(async () => {
      if ((pc as any).connectionState !== 'connected') return;
      try {
        const stats = await pc.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report: any) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime ?? 0;
          }
          if (report.type === 'inbound-rtp') {
            packetsLost += report.packetsLost ?? 0;
            packetsReceived += report.packetsReceived ?? 0;
          }
        });

        const lossRate = packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;
        let quality: 'good' | 'fair' | 'poor';
        if (rtt < 0.15 && lossRate < 0.02) quality = 'good';
        else if (rtt < 0.3 && lossRate < 0.05) quality = 'fair';
        else quality = 'poor';

        useCallStore.getState().setConnectionQuality(quality);
      } catch {
        // stats not available on this platform
      }
    }, 3000);
  }, [stopStatsMonitor]);

  const attemptReconnect = useCallback(async () => {
    const pc = pcRef.current;
    const { activeCall } = useCallStore.getState();
    if (!pc || !activeCall) return;

    console.log('[Call] Attempting ICE restart');
    try {
      (pc as any).restartIce?.();
      const offer = await pc.createOffer({ iceRestart: true } as any);
      await pc.setLocalDescription(offer as any);
      getExistingSocket()?.emit('call:offer', {
        callId: activeCall.id,
        targetUserId: activeCall.participantId,
        sdp: offer.sdp,
      });
      remoteDescSet.current = false;
      pendingCandidates.current = [];
    } catch (e) {
      console.log('[Call] ICE restart failed:', e);
    }
  }, []);

  const createPC = useCallback(async () => {
    pcRef.current?.close();
    pendingCandidates.current = [];
    remoteDescSet.current = false;
    clearReconnectTimer();

    let iceServers: any[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    try {
      const res = await getIceServers();
      iceServers = res.iceServers as any[];
    } catch { /* fallback */ }

    const pc = new RTCPeerConnection({
      iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    } as any);
    pcRef.current = pc;
    const pcAny = pc as any;

    pcAny.addEventListener('icecandidate', (event: any) => {
      if (!event.candidate) return;
      const { activeCall } = useCallStore.getState();
      if (!activeCall) return;
      getExistingSocket()?.emit('call:ice-candidate', {
        callId: activeCall.id,
        targetUserId: activeCall.participantId,
        candidate: event.candidate.toJSON(),
      });
    });

    pcAny.addEventListener('track', (event: any) => {
      const stream: MediaStream = event.streams?.[0];
      if (stream) useCallStore.getState().setRemoteStream(stream);
    });

    pcAny.addEventListener('connectionstatechange', () => {
      const state = (pc as any).connectionState;
      console.log('[Call] Connection state:', state);

      if (state === 'connected') {
        clearReconnectTimer();
        applyBandwidthConstraints(pc);
        startStatsMonitor(pc);
      } else if (state === 'disconnected') {
        reconnectTimer.current = setTimeout(() => {
          if ((pc as any).connectionState !== 'connected') {
            attemptReconnect();
          }
        }, RECONNECT_TIMEOUT);
      } else if (state === 'failed') {
        attemptReconnect();
      }
    });

    pcAny.addEventListener('negotiationneeded', async () => {
      const { activeCall } = useCallStore.getState();
      if (!activeCall || !pcRef.current) return;
      try {
        const offer = await pcRef.current.createOffer({} as any);
        await pcRef.current.setLocalDescription(offer as any);
        getExistingSocket()?.emit('call:offer', {
          callId: activeCall.id,
          targetUserId: activeCall.participantId,
          sdp: offer.sdp,
        });
        remoteDescSet.current = false;
        pendingCandidates.current = [];
      } catch (e) {
        console.log('[Call] negotiationneeded failed:', e);
      }
    });

    return pc;
  }, [clearReconnectTimer, applyBandwidthConstraints, startStatsMonitor, attemptReconnect]);

  const flushPending = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || pendingCandidates.current.length === 0) return;
    for (const c of pendingCandidates.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    }
    pendingCandidates.current = [];
  }, []);

  const startCall = useCallback(
    async (callId: string, targetUserId: string, type: 'AUDIO' | 'VIDEO') => {
      const stream = (await mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS as any,
        video: type === 'VIDEO' ? VIDEO_CONSTRAINTS : false,
      })) as MediaStream;

      useCallStore.getState().setLocalStream(stream);
      InCallManager.start({ media: type === 'VIDEO' ? 'video' : 'audio' });
      InCallManager.setSpeakerphoneOn(type === 'VIDEO');

      const pc = await createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'VIDEO',
      } as any);
      await pc.setLocalDescription(offer as any);

      getExistingSocket()?.emit('call:offer', { callId, targetUserId, sdp: offer.sdp });
    },
    [createPC],
  );

  const handleOffer = useCallback(
    async (callId: string, fromUserId: string, sdp: string, type: 'AUDIO' | 'VIDEO') => {
      // Renegotiation: reuse existing PC if one exists
      if (pcRef.current && remoteDescSet.current) {
        const pc = pcRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
        remoteDescSet.current = true;
        await flushPending();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer as any);

        getExistingSocket()?.emit('call:answer', {
          callId,
          targetUserId: fromUserId,
          sdp: answer.sdp,
        });
        return;
      }

      const stream = (await mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS as any,
        video: type === 'VIDEO' ? VIDEO_CONSTRAINTS : false,
      })) as MediaStream;

      useCallStore.getState().setLocalStream(stream);
      InCallManager.start({ media: type === 'VIDEO' ? 'video' : 'audio' });
      InCallManager.setSpeakerphoneOn(type === 'VIDEO');

      const pc = await createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      remoteDescSet.current = true;
      await flushPending();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer as any);

      getExistingSocket()?.emit('call:answer', {
        callId,
        targetUserId: fromUserId,
        sdp: answer.sdp,
      });
    },
    [createPC, flushPending],
  );

  const handleAnswer = useCallback(
    async (sdp: string) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      remoteDescSet.current = true;
      await flushPending();
    },
    [flushPending],
  );

  const handleIceCandidate = useCallback(async (candidate: unknown) => {
    if (!remoteDescSet.current) {
      pendingCandidates.current.push(candidate);
      return;
    }
    try {
      await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate as any));
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    const { localStream, isMuted } = useCallStore.getState();
    (localStream as MediaStream | null)
      ?.getAudioTracks()
      .forEach((t) => { t.enabled = isMuted; });
    useCallStore.getState().toggleMute();
  }, []);

  const toggleVideo = useCallback(() => {
    const { localStream, isVideoOff } = useCallStore.getState();
    (localStream as MediaStream | null)
      ?.getVideoTracks()
      .forEach((t) => { t.enabled = isVideoOff; });
    useCallStore.getState().toggleVideo();
  }, []);

  const upgradeToVideo = useCallback(async () => {
    const pc = pcRef.current;
    const { activeCall, localStream } = useCallStore.getState();
    if (!pc || !activeCall || !localStream) return;

    console.log('[Call] Upgrading to video');
    try {
      const videoStream = (await mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: false,
      })) as MediaStream;
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) return;

      // Add video track to local stream and PC (triggers negotiationneeded)
      (localStream as MediaStream).addTrack(videoTrack);
      pc.addTrack(videoTrack, localStream as MediaStream);

      // Switch to speaker + video InCallManager mode
      InCallManager.setSpeakerphoneOn(true);

      // Update store
      useCallStore.getState().setActiveCall({ ...activeCall, type: 'VIDEO' });

      // Notify remote
      getExistingSocket()?.emit('call:video-mode', {
        callId: activeCall.id,
        targetUserId: activeCall.participantId,
        videoEnabled: true,
      });
    } catch (e) {
      console.log('[Call] upgradeToVideo failed:', e);
    }
  }, []);

  const downgradeToAudio = useCallback(async () => {
    const pc = pcRef.current;
    const { activeCall, localStream } = useCallStore.getState();
    if (!pc || !activeCall || !localStream) return;

    console.log('[Call] Downgrading to audio');

    // Stop and remove video tracks
    const videoTracks = (localStream as MediaStream).getVideoTracks();
    for (const track of videoTracks) {
      track.stop();
      (localStream as MediaStream).removeTrack(track);
    }

    // Remove video sender from PC
    const senders = pc.getSenders();
    for (const sender of senders) {
      if (sender.track?.kind === 'video') {
        pc.removeTrack(sender);
      }
    }

    // Switch to earpiece
    InCallManager.setSpeakerphoneOn(false);

    // Update store
    useCallStore.getState().setActiveCall({ ...activeCall, type: 'AUDIO' });

    // Notify remote
    getExistingSocket()?.emit('call:video-mode', {
      callId: activeCall.id,
      targetUserId: activeCall.participantId,
      videoEnabled: false,
    });
  }, []);

  const cleanup = useCallback(() => {
    const { localStream } = useCallStore.getState();
    (localStream as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidates.current = [];
    remoteDescSet.current = false;
    clearReconnectTimer();
    stopStatsMonitor();
    InCallManager.stop();
    useCallStore.getState().endCall();
  }, [clearReconnectTimer, stopStatsMonitor]);

  return {
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    toggleVideo,
    upgradeToVideo,
    downgradeToAudio,
    cleanup,
  };
}
