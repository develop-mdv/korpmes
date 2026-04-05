import { useRef, useCallback } from 'react';
import { useCallStore } from '@/stores/call.store';
import { getSocket } from '@/socket/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const store = useCallStore;

  const getOrCreatePC = useCallback((targetUserId: string): RTCPeerConnection => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        const callId = store.getState().activeCall?.id;
        if (callId) {
          socket.emit('call:ice-candidate', {
            callId,
            targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      }
    };

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        store.getState().addRemoteStream(targetUserId, event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
      }
    };

    return pc;
  }, []);

  const startCall = useCallback(async (callId: string, targetUserId: string, type: 'audio' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    store.getState().setLocalStream(stream);

    const pc = getOrCreatePC(targetUserId);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const socket = getSocket();
    socket.emit('call:offer', {
      callId,
      targetUserId,
      sdp: offer.sdp,
    });
  }, [getOrCreatePC]);

  const handleOffer = useCallback(async (callId: string, fromUserId: string, sdp: string, type: 'audio' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    store.getState().setLocalStream(stream);

    const pc = getOrCreatePC(fromUserId);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const socket = getSocket();
    socket.emit('call:answer', {
      callId,
      targetUserId: fromUserId,
      sdp: answer.sdp,
    });
  }, [getOrCreatePC]);

  const handleAnswer = useCallback(async (sdp: string) => {
    const pc = pcRef.current;
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    store.getState().endCall();
  }, []);

  return {
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanup,
  };
}
