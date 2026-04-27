import { useCallback, useRef } from 'react';
import {
  RTCPeerConnection,
  RTCRtpSender,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { useCallStore, type AudioOutput } from '../stores/call.store';
import { getExistingSocket } from '../socket/socket';
import { getIceServers } from '../api/calls.api';
import { useAuthStore } from '../stores/auth.store';

// ─── Constants ──────────────────────────────────────────────────────────────

const AUDIO_MAX_BITRATE = 64_000;
const VIDEO_MAX_BITRATE = 800_000;
const RECONNECT_TIMEOUT = 5000;

const BITRATE_BY_QUALITY = {
  good: { audio: 64_000, video: 800_000, framerate: undefined as number | undefined },
  fair: { audio: 48_000, video: 600_000, framerate: 24 as number | undefined },
  poor: { audio: 32_000, video: 400_000, framerate: 15 as number | undefined },
};

const PREFERRED_AUDIO_CODEC = 'audio/opus';
const PREFERRED_VIDEO_CODEC = 'video/VP8';

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

  const lastAppliedQuality = useRef<'good' | 'fair' | 'poor' | null>(null);

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

  const preferCodecs = useCallback((pc: InstanceType<typeof RTCPeerConnection>) => {
    try {
      const transceivers = (pc as any).getTransceivers?.() ?? [];
      for (const transceiver of transceivers) {
        const kind = transceiver.sender?.track?.kind as 'audio' | 'video' | undefined;
        if (!kind) continue;
        const target = kind === 'audio' ? PREFERRED_AUDIO_CODEC : PREFERRED_VIDEO_CODEC;
        const caps = (RTCRtpSender as any).getCapabilities?.(kind);
        const codecs = caps?.codecs;
        if (!codecs || codecs.length === 0) continue;
        const sorted = [
          ...codecs.filter((c: any) => c.mimeType?.toLowerCase() === target),
          ...codecs.filter((c: any) => c.mimeType?.toLowerCase() !== target),
        ];
        transceiver.setCodecPreferences?.(sorted);
      }
    } catch {
      // Codec preferences not supported on this platform
    }
  }, []);

  const adaptBitrate = useCallback(async (
    pc: InstanceType<typeof RTCPeerConnection>,
    quality: 'good' | 'fair' | 'poor',
  ) => {
    if (lastAppliedQuality.current === quality) return;
    const settings = BITRATE_BY_QUALITY[quality];
    try {
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (!sender.track) continue;
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}] as any;
        }
        if (sender.track.kind === 'audio') {
          params.encodings[0].maxBitrate = settings.audio;
        } else if (sender.track.kind === 'video') {
          params.encodings[0].maxBitrate = settings.video;
          if (settings.framerate !== undefined) {
            (params.encodings[0] as any).maxFramerate = settings.framerate;
          } else {
            delete (params.encodings[0] as any).maxFramerate;
          }
        }
        await sender.setParameters(params);
      }
      lastAppliedQuality.current = quality;
    } catch {
      // ignore
    }
  }, []);

  const setAudioRoute = useCallback((output: AudioOutput) => {
    try {
      InCallManager.setSpeakerphoneOn(output === 'speaker');
    } catch {}
    useCallStore.getState().setAudioOutput(output);
  }, []);

  const toggleAudioOutput = useCallback(() => {
    const next = useCallStore.getState().audioOutput === 'speaker' ? 'earpiece' : 'speaker';
    setAudioRoute(next);
  }, [setAudioRoute]);

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
        await adaptBitrate(pc, quality);
      } catch {
        // stats not available on this platform
      }
    }, 3000);
  }, [stopStatsMonitor, adaptBitrate]);

  const attemptReconnect = useCallback(async () => {
    const pc = pcRef.current;
    const { activeCall } = useCallStore.getState();
    if (!pc || !activeCall) return;

    console.log('[Call] Attempting ICE restart');
    useCallStore.getState().setMakingOffer(true);
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
    } finally {
      useCallStore.getState().setMakingOffer(false);
    }
  }, []);

  const createPC = useCallback(async () => {
    pcRef.current?.close();
    pendingCandidates.current = [];
    remoteDescSet.current = false;
    clearReconnectTimer();
    lastAppliedQuality.current = null;

    const myUserId = useAuthStore.getState().user?.id ?? '';
    const remoteUserId = useCallStore.getState().activeCall?.participantId ?? '';
    useCallStore.getState().setPolitePeer(myUserId < remoteUserId);
    useCallStore.getState().setMakingOffer(false);
    useCallStore.getState().setIgnoreOffer(false);

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
      useCallStore.getState().setMakingOffer(true);
      try {
        preferCodecs(pcRef.current);
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
      } finally {
        useCallStore.getState().setMakingOffer(false);
      }
    });

    return pc;
  }, [clearReconnectTimer, applyBandwidthConstraints, startStatsMonitor, attemptReconnect, preferCodecs]);

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
      setAudioRoute(type === 'VIDEO' ? 'speaker' : 'earpiece');

      const pc = await createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      preferCodecs(pc);

      useCallStore.getState().setMakingOffer(true);
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === 'VIDEO',
        } as any);
        await pc.setLocalDescription(offer as any);
        getExistingSocket()?.emit('call:offer', { callId, targetUserId, sdp: offer.sdp });
      } finally {
        useCallStore.getState().setMakingOffer(false);
      }
    },
    [createPC, preferCodecs, setAudioRoute],
  );

  const handleOffer = useCallback(
    async (callId: string, fromUserId: string, sdp: string, type: 'AUDIO' | 'VIDEO') => {
      // Renegotiation: reuse existing PC if one exists
      if (pcRef.current && remoteDescSet.current) {
        const pc = pcRef.current;
        const { isPolite, makingOffer } = useCallStore.getState();
        const isCollision = (pc as any).signalingState !== 'stable' || makingOffer;
        const ignore = !isPolite && isCollision;
        if (ignore) {
          useCallStore.getState().setIgnoreOffer(true);
          console.log('[Call] Glare: ignoring incoming offer (impolite peer)');
          return;
        }
        useCallStore.getState().setIgnoreOffer(false);

        if (isPolite && isCollision) {
          try {
            await (pc as any).setLocalDescription({ type: 'rollback' });
          } catch (e) {
            console.log('[Call] rollback failed:', e);
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
        remoteDescSet.current = true;
        await flushPending();

        preferCodecs(pc);
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
      setAudioRoute(type === 'VIDEO' ? 'speaker' : 'earpiece');

      const pc = await createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      remoteDescSet.current = true;
      await flushPending();

      preferCodecs(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer as any);

      getExistingSocket()?.emit('call:answer', {
        callId,
        targetUserId: fromUserId,
        sdp: answer.sdp,
      });
    },
    [createPC, flushPending, preferCodecs, setAudioRoute],
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
    if (useCallStore.getState().ignoreOffer) {
      return;
    }
    if (!remoteDescSet.current) {
      pendingCandidates.current.push(candidate);
      return;
    }
    try {
      await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate as any));
    } catch (e) {
      if (!useCallStore.getState().ignoreOffer) {
        console.log('[Call] addIceCandidate failed:', e);
      }
    }
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
      setAudioRoute('speaker');

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
  }, [setAudioRoute]);

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
    setAudioRoute('earpiece');

    // Update store
    useCallStore.getState().setActiveCall({ ...activeCall, type: 'AUDIO' });

    // Notify remote
    getExistingSocket()?.emit('call:video-mode', {
      callId: activeCall.id,
      targetUserId: activeCall.participantId,
      videoEnabled: false,
    });
  }, [setAudioRoute]);

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
    toggleAudioOutput,
    upgradeToVideo,
    downgradeToAudio,
    cleanup,
  };
}
