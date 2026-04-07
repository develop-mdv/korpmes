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

export function useWebRTC() {
  const pcRef = useRef<InstanceType<typeof RTCPeerConnection> | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const remoteDescSet = useRef(false);

  const createPC = useCallback(async () => {
    pcRef.current?.close();
    pendingCandidates.current = [];
    remoteDescSet.current = false;

    let iceServers: any[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    try {
      const res = await getIceServers();
      iceServers = res.iceServers as any[];
    } catch { /* fallback */ }

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    // Cast needed: event-target-shim's EventTarget doesn't resolve under moduleResolution:"bundler"
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
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        cleanup();
      }
    });

    return pc;
  }, []);

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
        audio: true,
        video: type === 'VIDEO',
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
      const stream = (await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'VIDEO',
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
      .forEach((t) => { t.enabled = isMuted; }); // isMuted=true → enable (toggle)
    useCallStore.getState().toggleMute();
  }, []);

  const toggleVideo = useCallback(() => {
    const { localStream, isVideoOff } = useCallStore.getState();
    (localStream as MediaStream | null)
      ?.getVideoTracks()
      .forEach((t) => { t.enabled = isVideoOff; }); // isVideoOff=true → enable (toggle)
    useCallStore.getState().toggleVideo();
  }, []);

  const cleanup = useCallback(() => {
    const { localStream } = useCallStore.getState();
    (localStream as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidates.current = [];
    remoteDescSet.current = false;
    InCallManager.stop();
    useCallStore.getState().endCall();
  }, []);

  return {
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    toggleVideo,
    cleanup,
  };
}
