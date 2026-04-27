import { create } from 'zustand';

export interface Call {
  id: string;
  type: 'audio' | 'video';
  chatId: string;
  initiatorId: string;
  participants: string[];
  status: 'ringing' | 'active' | 'ended';
  startedAt: string;
}

export type LayoutMode = 'grid' | 'speaker';

interface CallState {
  activeCall: Call | null;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  connectionQuality: Record<string, 'good' | 'fair' | 'poor'>;
  layoutMode: LayoutMode;
  activeSpeakerId: string | null;
  fullscreenUserId: string | null;
  screenSharerId: string | null;

  setActiveCall: (call: Call | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setScreenSharing: (sharing: boolean) => void;
  setScreenSharerId: (userId: string | null) => void;
  setConnectionQuality: (userId: string, quality: 'good' | 'fair' | 'poor') => void;
  setCallType: (type: 'audio' | 'video') => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setActiveSpeakerId: (userId: string | null) => void;
  setFullscreenUserId: (id: string | null) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>()((set, get) => ({
  activeCall: null,
  localStream: null,
  remoteStreams: {},
  screenStream: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  connectionQuality: {},
  layoutMode: 'grid',
  activeSpeakerId: null,
  fullscreenUserId: null,
  screenSharerId: null,

  setActiveCall: (activeCall) => set({ activeCall }),

  setLocalStream: (localStream) => set({ localStream }),

  addRemoteStream: (userId, stream) =>
    set((state) => ({
      remoteStreams: { ...state.remoteStreams, [userId]: stream },
    })),

  removeRemoteStream: (userId) =>
    set((state) => {
      const { [userId]: _, ...rest } = state.remoteStreams;
      return { remoteStreams: rest };
    }),

  setScreenStream: (screenStream) => set({ screenStream }),

  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),

  setScreenSharerId: (screenSharerId) => set({ screenSharerId }),

  setLayoutMode: (layoutMode) => set({ layoutMode }),

  setActiveSpeakerId: (activeSpeakerId) => set({ activeSpeakerId }),

  setFullscreenUserId: (fullscreenUserId) => set({ fullscreenUserId }),

  setConnectionQuality: (userId, quality) =>
    set((state) => ({
      connectionQuality: { ...state.connectionQuality, [userId]: quality },
    })),

  setCallType: (type) => {
    const { activeCall } = get();
    if (activeCall) set({ activeCall: { ...activeCall, type } });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
    }
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = isVideoOff;
      });
    }
    set({ isVideoOff: !isVideoOff });
  },

  endCall: () => {
    const { localStream, screenStream } = get();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    set({
      activeCall: null,
      localStream: null,
      remoteStreams: {},
      screenStream: null,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      connectionQuality: {},
      layoutMode: 'grid',
      activeSpeakerId: null,
      fullscreenUserId: null,
      screenSharerId: null,
    });
  },
}));
