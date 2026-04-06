/**
 * WebRTC stub — react-native-webrtc is excluded from this build.
 * Voice/video calls will not function until a development build with
 * react-native-webrtc is created (requires expo run:android).
 */

export function useWebRTC() {
  return {
    startCall: async (_callId: string, _targetUserId: string, _type: 'AUDIO' | 'VIDEO') => {},
    handleOffer: async (_callId: string, _fromUserId: string, _sdp: string, _type: 'AUDIO' | 'VIDEO') => {},
    handleAnswer: async (_sdp: string) => {},
    handleIceCandidate: async (_candidate: unknown) => {},
    toggleMute: () => {},
    toggleVideo: () => {},
    cleanup: () => {},
  };
}
