/**
 * WebRTC stub — react-native-webrtc is excluded from this build.
 * Voice/video calls will not function until a development build with
 * react-native-webrtc is created (requires expo run:android).
 */

export function useWebRTC() {
  const noop = async () => {};
  return {
    startCall: noop,
    handleOffer: noop,
    handleAnswer: noop,
    handleIceCandidate: noop,
    toggleMute: () => {},
    toggleVideo: () => {},
    cleanup: () => {},
  };
}
