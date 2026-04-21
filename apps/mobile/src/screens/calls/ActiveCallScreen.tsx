import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallStore } from '../../stores/call.store';
import { useWebRTC } from '../../hooks/useWebRTC';
import { setWebRTCHandlers } from '../../socket/events';
import * as callsApi from '../../api/calls.api';
import { getExistingSocket } from '../../socket/socket';
import type { RootStackParamList } from '../../navigation/types';

// RTCView is from react-native-webrtc — imported lazily to avoid crash if not installed
let RTCView: React.ComponentType<{
  streamURL: string;
  style?: object;
  objectFit?: 'contain' | 'cover';
  mirror?: boolean;
}> | null = null;
try {
  RTCView = require('react-native-webrtc').RTCView;
} catch {
  RTCView = null;
}

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveCall'>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActiveCallScreen({ navigation }: Props) {
  const { activeCall, localStream, remoteStream, isMuted, isVideoOff } = useCallStore();
  const { startCall, handleOffer, handleAnswer, handleIceCandidate, toggleMute, toggleVideo, upgradeToVideo, downgradeToAudio, cleanup } = useWebRTC();
  const durationRef = useRef(0);

  // Register WebRTC handlers so socket events can delegate here
  useEffect(() => {
    setWebRTCHandlers({ handleOffer, handleAnswer, handleIceCandidate });
    return () => setWebRTCHandlers(null as any);
  }, [handleOffer, handleAnswer, handleIceCandidate]);
  const [duration, setDuration] = React.useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVideo = activeCall?.type === 'VIDEO';

  // Start timer when call becomes active
  useEffect(() => {
    if (activeCall?.status === 'ACTIVE') {
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall?.status]);

  // If no active call navigate back
  useEffect(() => {
    if (!activeCall) {
      navigation.goBack();
    }
  }, [activeCall, navigation]);

  // Caller: when call transitions to ACTIVE (call:accepted received), start WebRTC
  useEffect(() => {
    if (!activeCall) return;

    const socket = getExistingSocket();
    if (!socket) {
      return;
    }

    const onCallAccepted = (data: { callId: string; userId: string }) => {
      if (data.callId !== activeCall.id) return;
      // Status is already flipped to ACTIVE by socket/events.ts.
      // Here we only kick off the WebRTC offer from the caller side.
      startCall(activeCall.id, data.userId, activeCall.type);
    };

    const onCallOffer = (data: { callId: string; fromUserId: string; sdp: string }) => {
      if (data.callId !== activeCall.id) return;
      // useWebRTC handleOffer is called from events.ts
    };

    const onCallHangup = (data: { callId: string }) => {
      if (data.callId !== activeCall.id) return;
      cleanup();
    };

    socket.on('call:accepted', onCallAccepted);
    socket.on('call:offer', onCallOffer);
    socket.on('call:hangup', onCallHangup);

    return () => {
      socket.off('call:accepted', onCallAccepted);
      socket.off('call:offer', onCallOffer);
      socket.off('call:hangup', onCallHangup);
    };
  }, [activeCall, startCall, cleanup]);

  const handleHangup = async () => {
    if (activeCall) {
      try {
        await callsApi.hangupCall(activeCall.id);
      } catch {
        // best-effort
      }
      const socket = getExistingSocket();
      socket?.emit('call:hangup', {
        callId: activeCall.id,
        targetUserId: activeCall.participantId,
      });
    }
    cleanup();
  };

  const handleAccept = async () => {
    if (!activeCall) return;
    try {
      await callsApi.answerCall(activeCall.id);
      useCallStore.getState().setActiveCall({ ...activeCall, status: 'ACTIVE' });
    } catch {
      cleanup();
    }
  };

  const handleReject = async () => {
    if (!activeCall) return;
    try {
      await callsApi.rejectCall(activeCall.id);
    } catch {
      // best-effort
    }
    cleanup();
  };

  if (!activeCall) return null;

  const isRinging = activeCall.status === 'RINGING';
  const isActive = activeCall.status === 'ACTIVE';
  const isIncoming = activeCall.isIncoming;

  const localStreamURL = (localStream as any)?.toURL?.() as string | undefined;
  const remoteStreamURL = (remoteStream as any)?.toURL?.() as string | undefined;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Remote video / background */}
      {isVideo && remoteStreamURL && RTCView ? (
        <RTCView
          streamURL={remoteStreamURL}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
        />
      ) : (
        <View style={styles.audioBackground} />
      )}

      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.participantName}>{activeCall.participantName}</Text>
          <Text style={styles.callStatus}>
            {isRinging && isIncoming && 'Incoming call…'}
            {isRinging && !isIncoming && 'Calling…'}
            {isActive && formatDuration(duration)}
          </Text>
        </View>

        {/* Local video (PiP) */}
        {isVideo && isActive && localStreamURL && RTCView && (
          <RTCView
            streamURL={localStreamURL}
            style={styles.localVideo}
            objectFit="cover"
            mirror
          />
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {isActive && (
            <>
              <ControlButton
                label={isMuted ? 'Unmute' : 'Mute'}
                icon={isMuted ? '🔇' : '🎤'}
                onPress={toggleMute}
              />
              {!isVideo && (
                <ControlButton
                  label="Video"
                  icon="📹"
                  onPress={upgradeToVideo}
                />
              )}
              {isVideo && (
                <ControlButton
                  label={isVideoOff ? 'Start Video' : 'Stop Video'}
                  icon={isVideoOff ? '📷' : '🎥'}
                  onPress={toggleVideo}
                />
              )}
              {isVideo && (
                <ControlButton
                  label="Audio"
                  icon="🔊"
                  onPress={downgradeToAudio}
                />
              )}
              <ControlButton
                label="End"
                icon="📵"
                onPress={handleHangup}
                danger
              />
            </>
          )}

          {isRinging && isIncoming && (
            <>
              <ControlButton label="Decline" icon="📵" onPress={handleReject} danger />
              <ControlButton label="Accept" icon="📞" onPress={handleAccept} success />
            </>
          )}

          {isRinging && !isIncoming && (
            <ControlButton label="Cancel" icon="📵" onPress={handleHangup} danger />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function ControlButton({
  label,
  icon,
  onPress,
  danger,
  success,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
  success?: boolean;
}) {
  const bg = danger ? '#EF4444' : success ? '#10B981' : 'rgba(255,255,255,0.15)';
  return (
    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: bg }]} onPress={onPress}>
      <Text style={styles.controlIcon}>{icon}</Text>
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  audioBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1F2937',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingHorizontal: 24,
  },
  participantName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 40,
  },
  callStatus: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  localVideo: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 4,
  },
});
