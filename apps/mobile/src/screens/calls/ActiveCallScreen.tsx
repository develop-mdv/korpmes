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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallStore } from '../../stores/call.store';
import { useWebRTC } from '../../hooks/useWebRTC';
import { setWebRTCHandlers } from '../../socket/events';
import * as callsApi from '../../api/calls.api';
import { getExistingSocket } from '../../socket/socket';
import { useTheme } from '../../theme';
import type { ComponentProps } from 'react';
import type { RootStackParamList } from '../../navigation/types';
import { QualityIndicator } from '../../components/calls/QualityIndicator';

type IonName = ComponentProps<typeof Ionicons>['name'];

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
  const theme = useTheme();
  const { activeCall, localStream, remoteStream, isMuted, isVideoOff, connectionQuality, audioOutput } = useCallStore();
  const { startCall, handleOffer, handleAnswer, handleIceCandidate, toggleMute, toggleVideo, toggleAudioOutput, upgradeToVideo, downgradeToAudio, cleanup } = useWebRTC();
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

      {/* Quality indicator overlay (video mode) */}
      {isVideo && isActive && (
        <View style={styles.qualityOverlay}>
          <QualityIndicator quality={connectionQuality} />
        </View>
      )}

      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.participantName}>{activeCall.participantName}</Text>
          <Text style={styles.callStatus}>
            {isRinging && isIncoming && 'Входящий звонок…'}
            {isRinging && !isIncoming && 'Соединение…'}
            {isActive && formatDuration(duration)}
          </Text>
          {!isVideo && isActive && (
            <View style={styles.qualityRow}>
              <Text style={styles.qualityLabel}>Качество связи</Text>
              <QualityIndicator quality={connectionQuality} size="md" />
            </View>
          )}
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
                label={isMuted ? 'Включить' : 'Микрофон'}
                icon={isMuted ? 'mic-off' : 'mic'}
                onPress={toggleMute}
              />
              <ControlButton
                label={audioOutput === 'speaker' ? 'Динамик' : 'Разговор'}
                icon={audioOutput === 'speaker' ? 'volume-high' : 'call'}
                onPress={toggleAudioOutput}
              />
              {!isVideo && <ControlButton label="Видео" icon="videocam-outline" onPress={upgradeToVideo} />}
              {isVideo && (
                <ControlButton
                  label={isVideoOff ? 'Включить' : 'Камера'}
                  icon={isVideoOff ? 'videocam-off' : 'videocam'}
                  onPress={toggleVideo}
                />
              )}
              {isVideo && <ControlButton label="Аудио" icon="volume-high" onPress={downgradeToAudio} />}
              <ControlButton label="Завершить" icon="close" onPress={handleHangup} variant="danger" theme={theme} />
            </>
          )}

          {isRinging && isIncoming && (
            <>
              <ControlButton label="Отклонить" icon="close" onPress={handleReject} variant="danger" theme={theme} />
              <ControlButton label="Принять" icon="call" onPress={handleAccept} variant="success" theme={theme} />
            </>
          )}

          {isRinging && !isIncoming && (
            <ControlButton label="Отмена" icon="close" onPress={handleHangup} variant="danger" theme={theme} />
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
  variant,
  theme,
}: {
  label: string;
  icon: IonName;
  onPress: () => void;
  variant?: 'danger' | 'success';
  theme?: ReturnType<typeof useTheme>;
}) {
  const bg =
    variant === 'danger'
      ? theme?.colors.error ?? '#d46262'
      : variant === 'success'
      ? theme?.colors.success ?? '#1e9d68'
      : 'rgba(255,255,255,0.18)';
  return (
    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={26} color="#FFFFFF" />
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
  controlLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 6,
    fontWeight: '600',
  },
  qualityOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 24,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 10,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  qualityLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});
