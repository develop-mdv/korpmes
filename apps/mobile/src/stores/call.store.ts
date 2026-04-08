import { create } from 'zustand';

export interface ActiveCall {
  id: string;
  chatId: string;
  type: 'AUDIO' | 'VIDEO';
  status: 'RINGING' | 'ACTIVE' | 'ENDED';
  participantName: string;
  participantId: string;
  isIncoming: boolean;
  initiatorId: string;
}

interface CallState {
  activeCall: ActiveCall | null;
  // MediaStream from react-native-webrtc — typed as unknown to avoid hard dep in store
  localStream: unknown | null;
  remoteStream: unknown | null;
  isMuted: boolean;
  isVideoOff: boolean;
  connectionQuality: 'good' | 'fair' | 'poor';

  setActiveCall: (call: ActiveCall | null) => void;
  setLocalStream: (stream: unknown | null) => void;
  setRemoteStream: (stream: unknown | null) => void;
  setConnectionQuality: (quality: 'good' | 'fair' | 'poor') => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  connectionQuality: 'good',

  setActiveCall: (call) => set({ activeCall: call, isMuted: false, isVideoOff: false }),

  setLocalStream: (stream) => set({ localStream: stream }),

  setRemoteStream: (stream) => set({ remoteStream: stream }),

  setConnectionQuality: (quality) => set({ connectionQuality: quality }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),

  endCall: () =>
    set({ activeCall: null, localStream: null, remoteStream: null, isMuted: false, isVideoOff: false, connectionQuality: 'good' }),
}));
