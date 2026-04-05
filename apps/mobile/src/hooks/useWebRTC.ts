/**
 * Mobile WebRTC hook using react-native-webrtc.
 *
 * SETUP: This requires a development build (not Expo Go):
 *   npx expo install react-native-webrtc
 *   npx expo run:android  OR  npx expo run:ios
 *
 * Signaling flow mirrors the web call-manager:
 *   Caller:   initiate REST → receive call:accepted → send offer → ICE exchange
 *   Receiver: receive call:initiate → answer REST → receive offer → send answer → ICE exchange
 */

import { useRef, useCallback } from 'react';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  type MediaStream,
} from 'react-native-webrtc';
import { getSocket } from '../socket/socket';
import { useCallStore } from '../stores/call.store';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);
  const store = useCallStore;

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidates.current = [];
    remoteDescSet.current = false;
    store.getState().endCall();
  }, [store]);

  const getMedia = useCallback(async (type: 'AUDIO' | 'VIDEO'): Promise<MediaStream> => {
    try {
      return await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'VIDEO'
          ? { facingMode: 'user', width: 640, height: 480 }
          : false,
      }) as MediaStream;
    } catch {
      // Fallback to audio only
      return await mediaDevices.getUserMedia({ audio: true, video: false }) as MediaStream;
    }
  }, []);

  const createPC = useCallback((targetUserId: string, callId: string): RTCPeerConnection => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    remoteDescSet.current = false;
    pendingCandidates.current = [];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        getSocket().emit('call:ice-candidate', {
          callId,
          targetUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    });

    pc.addEventListener('track', (event: RTCTrackEvent) => {
      if (event.streams?.[0]) {
        store.getState().setRemoteStream(event.streams[0]);
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed'
      ) {
        cleanup();
      }
    });

    return pc;
  }, [cleanup, store]);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || pendingCandidates.current.length === 0) return;
    for (const c of pendingCandidates.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // ignore stale candidates
      }
    }
    pendingCandidates.current = [];
  }, []);

  // Called by the CALLER after receiving call:accepted
  const startCall = useCallback(
    async (callId: string, targetUserId: string, type: 'AUDIO' | 'VIDEO') => {
      const stream = await getMedia(type);
      store.getState().setLocalStream(stream);

      const pc = createPC(targetUserId, callId);
      (stream as any).getTracks().forEach((track: any) => pc.addTrack(track, stream as any));

      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer as RTCSessionDescription);

      getSocket().emit('call:offer', {
        callId,
        targetUserId,
        sdp: offer.sdp,
      });
    },
    [createPC, getMedia, store],
  );

  // Called by the RECEIVER after getting the SDP offer
  const handleOffer = useCallback(
    async (callId: string, fromUserId: string, sdp: string, type: 'AUDIO' | 'VIDEO') => {
      const { localStream } = store.getState();
      let stream = localStream as MediaStream | null;

      if (!stream) {
        stream = await getMedia(type);
        store.getState().setLocalStream(stream);
      }

      const pc = createPC(fromUserId, callId);
      (stream as any).getTracks().forEach((track: any) => pc.addTrack(track, stream as any));

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp }),
      );
      remoteDescSet.current = true;
      await flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer as RTCSessionDescription);

      getSocket().emit('call:answer', {
        callId,
        targetUserId: fromUserId,
        sdp: answer.sdp,
      });
    },
    [createPC, flushPendingCandidates, getMedia, store],
  );

  // Called by the CALLER after getting the SDP answer
  const handleAnswer = useCallback(async (sdp: string) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    remoteDescSet.current = true;
    await flushPendingCandidates();
  }, [flushPendingCandidates]);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!remoteDescSet.current) {
      pendingCandidates.current.push(candidate);
      return;
    }
    try {
      await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    const { localStream, isMuted } = store.getState();
    if (localStream) {
      (localStream as any).getAudioTracks().forEach((t: any) => {
        t.enabled = isMuted; // isMuted=true means currently muted → enable
      });
    }
    store.getState().toggleMute();
  }, [store]);

  const toggleVideo = useCallback(() => {
    const { localStream, isVideoOff } = store.getState();
    if (localStream) {
      (localStream as any).getVideoTracks().forEach((t: any) => {
        t.enabled = isVideoOff;
      });
    }
    store.getState().toggleVideo();
  }, [store]);

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
