import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CameraView as CameraViewRaw,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { Video as VideoRaw, ResizeMode } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MAX_VIDEO_NOTE_DURATION_MS, VIDEO_NOTE_DIMENSION } from '@corp/shared-constants';
import {
  useVideoNoteRecorder,
  type VideoNoteRecording,
} from '../../hooks/useVideoNoteRecorder';
import { useOrganizationStore } from '../../stores/organization.store';
import * as filesApi from '../../api/files.api';
import { getExistingSocket } from '../../socket/socket';
import { WS_EVENTS } from '../../constants/ws-events';
import type { ChatStackParamList } from '../../navigation/types';

// expo-camera/expo-av React-typing quirks under React 18 — cast to satisfy JSX.
const CameraView = CameraViewRaw as unknown as React.ComponentType<any>;
type CameraView = CameraViewRaw;
const Video = VideoRaw as unknown as React.ComponentType<any>;

type Props = NativeStackScreenProps<ChatStackParamList, 'VideoNoteRecorder'>;

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoNoteRecorderScreen({ route, navigation }: Props) {
  const { chatId } = route.params;
  const cameraRef = useRef<CameraView>(null);
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [sending, setSending] = useState(false);
  const [pendingRec, setPendingRec] = useState<VideoNoteRecording | null>(null);
  const currentOrg = useOrganizationStore((state) => state.currentOrg);

  const recorder = useVideoNoteRecorder({
    cameraRef,
    onComplete: (rec) => {
      setPendingRec(rec);
    },
    onError: (err) => {
      Alert.alert('Ошибка камеры', err.message || 'Не удалось начать запись');
    },
  });

  useEffect(() => {
    if (!cameraPerm?.granted) requestCameraPerm();
    if (!micPerm?.granted) requestMicPerm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartStop = () => {
    if (sending) return;
    if (recorder.state === 'idle') {
      void recorder.start();
    } else if (recorder.state === 'recording') {
      recorder.stop();
    }
  };

  const handleRetake = () => {
    setPendingRec(null);
  };

  const handleSend = async () => {
    if (!pendingRec || !currentOrg) return;
    setSending(true);
    try {
      const fileInfo = await filesApi.uploadFile({
        uri: pendingRec.uri,
        name: `video-note-${Date.now()}.mp4`,
        mimeType: pendingRec.mimeType,
        orgId: currentOrg.id,
        durationMs: pendingRec.durationMs,
      });
      const socket = getExistingSocket();
      if (socket?.connected) {
        socket.emit(WS_EVENTS.MESSAGE_SEND, {
          chatId,
          type: 'VIDEO_NOTE',
          fileIds: [fileInfo.id],
          metadata: { duration: pendingRec.durationMs },
        });
      }
      navigation.goBack();
    } catch (err) {
      console.warn('Failed to send video note', err);
      Alert.alert('Не удалось отправить', String((err as Error).message));
      setSending(false);
    }
  };

  const handleClose = () => {
    recorder.cancel();
    navigation.goBack();
  };

  if (!cameraPerm?.granted || !micPerm?.granted) {
    return (
      <View style={styles.permWrap}>
        <Text style={styles.permText}>
          Нужен доступ к камере и микрофону, чтобы записать кружок.
        </Text>
        <Pressable
          style={styles.permBtn}
          onPress={async () => {
            await requestCameraPerm();
            await requestMicPerm();
          }}
        >
          <Text style={styles.permBtnText}>Дать доступ</Text>
        </Pressable>
        <Pressable style={styles.cancelLink} onPress={handleClose}>
          <Text style={styles.cancelLinkText}>Отмена</Text>
        </Pressable>
      </View>
    );
  }

  const isRecording = recorder.state === 'recording';
  const showPreview = !!pendingRec;
  const progress = Math.min(1, recorder.elapsedMs / MAX_VIDEO_NOTE_DURATION_MS);

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeBtn} onPress={handleClose} disabled={sending}>
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>

      <View style={styles.circleWrap}>
        {showPreview && pendingRec ? (
          <Video
            style={styles.circle}
            source={{ uri: pendingRec.uri }}
            shouldPlay
            isLooping
            isMuted={false}
            resizeMode={ResizeMode.COVER}
          />
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.circle}
            facing="front"
            mode="video"
            videoQuality="480p"
            mute={false}
          />
        )}
      </View>

      {showPreview && pendingRec ? (
        <Text style={styles.elapsed}>{formatElapsed(pendingRec.durationMs)}</Text>
      ) : isRecording ? (
        <Text style={styles.elapsed}>{formatElapsed(recorder.elapsedMs)}</Text>
      ) : (
        <Text style={styles.hint}>Нажмите кнопку, чтобы начать запись (до 60 сек)</Text>
      )}

      {showPreview ? (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, sending && styles.disabled]}
            onPress={handleRetake}
            disabled={sending}
          >
            <Text style={styles.actionText}>Перезаписать</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.sendActionBtn, sending && styles.disabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.actionText, styles.sendActionText]}>Отправить</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.recordWrap}>
          {isRecording && (
            <View
              style={[
                styles.progressRing,
                { transform: [{ rotate: `${progress * 360}deg` }] },
              ]}
            />
          )}
          <Pressable onPress={handleStartStop} style={styles.recordBtn}>
            {isRecording ? (
              <View style={styles.recordSquare} />
            ) : (
              <View style={styles.recordCircle} />
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  circleWrap: {
    width: VIDEO_NOTE_DIMENSION,
    height: VIDEO_NOTE_DIMENSION,
    borderRadius: VIDEO_NOTE_DIMENSION / 2,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  circle: { width: '100%', height: '100%' },
  elapsed: { color: '#fff', fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, paddingHorizontal: 32, textAlign: 'center' },
  recordWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#dc3545',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  recordBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  recordCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  recordSquare: { width: 24, height: 24, borderRadius: 4, backgroundColor: '#fff' },
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  actionBtn: {
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActionBtn: {
    backgroundColor: '#9f7a3d',
    borderColor: 'transparent',
  },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sendActionText: { color: '#fff' },
  disabled: { opacity: 0.5 },
  permWrap: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  permText: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, backgroundColor: '#fff' },
  permBtnText: { color: '#000', fontWeight: '600' },
  cancelLink: { paddingVertical: 8 },
  cancelLinkText: { color: 'rgba(255,255,255,0.6)' },
});
