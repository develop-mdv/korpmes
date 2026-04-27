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

export type AudioOutput = 'speaker' | 'earpiece';

interface CallState {
  activeCall: ActiveCall | null;
  // MediaStream from react-native-webrtc — typed as unknown to avoid hard dep in store
  localStream: unknown | null;
  remoteStream: unknown | null;
  isMuted: boolean;
  isVideoOff: boolean;
  connectionQuality: 'good' | 'fair' | 'poor';
  audioOutput: AudioOutput;
  isPolite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;

  setActiveCall: (call: ActiveCall | null) => void;
  setLocalStream: (stream: unknown | null) => void;
  setRemoteStream: (stream: unknown | null) => void;
  setConnectionQuality: (quality: 'good' | 'fair' | 'poor') => void;
  setAudioOutput: (output: AudioOutput) => void;
  setPolitePeer: (isPolite: boolean) => void;
  setMakingOffer: (value: boolean) => void;
  setIgnoreOffer: (value: boolean) => void;
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
  audioOutput: 'earpiece',
  isPolite: false,
  makingOffer: false,
  ignoreOffer: false,

  setActiveCall: (call) =>
    set({
      activeCall: call,
      isMuted: false,
      isVideoOff: false,
      audioOutput: call?.type === 'VIDEO' ? 'speaker' : 'earpiece',
    }),

  setLocalStream: (stream) => set({ localStream: stream }),

  setRemoteStream: (stream) => set({ remoteStream: stream }),

  setConnectionQuality: (quality) => set({ connectionQuality: quality }),

  setAudioOutput: (output) => set({ audioOutput: output }),

  setPolitePeer: (isPolite) => set({ isPolite }),

  setMakingOffer: (value) => set({ makingOffer: value }),

  setIgnoreOffer: (value) => set({ ignoreOffer: value }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),

  endCall: () =>
    set({
      activeCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      connectionQuality: 'good',
      audioOutput: 'earpiece',
      isPolite: false,
      makingOffer: false,
      ignoreOffer: false,
    }),
}));
