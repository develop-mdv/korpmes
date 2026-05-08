import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
// expo-av's Video is exported as a class with React-typing quirks under React 18.
// Cast to any so JSX accepts the component without losing usage typing on the ref.
import { Video as VideoRaw, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useFileStore } from '../stores/file.store';
import { VIDEO_NOTE_DIMENSION } from '@corp/shared-constants';

const Video = VideoRaw as unknown as React.ComponentType<any>;

interface VideoNotePlayerProps {
  fileId: string;
  durationMs?: number;
}

const SIZE = VIDEO_NOTE_DIMENSION;

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoNotePlayer({ fileId, durationMs }: VideoNotePlayerProps) {
  const fetchFile = useFileStore((s) => s.fetchFile);
  const file = useFileStore((s) => s.filesById[fileId]);
  const videoRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    if (!file) void fetchFile(fileId);
  }, [fileId, file, fetchFile]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      await v.pauseAsync();
    } else {
      await v.playAsync();
    }
  };

  const handleStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setCurrentMs(status.positionMillis);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setCurrentMs(0);
      void videoRef.current?.setPositionAsync(0);
    }
  };

  const totalMs = durationMs || file?.durationMs || 0;
  const remainingMs = isPlaying ? Math.max(0, totalMs - currentMs) : totalMs;

  if (!file?.signedUrl) {
    return (
      <View style={[styles.wrap, styles.placeholder]}>
        <Text style={styles.placeholderText}>Загружается…</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={togglePlay}>
      <View style={styles.wrap}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: file.signedUrl }}
          resizeMode={ResizeMode.COVER}
          isLooping={false}
          onPlaybackStatusUpdate={handleStatus}
        />
        {totalMs > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatDuration(remainingMs)}</Text>
          </View>
        )}
        {!isPlaying && (
          <View style={styles.playOverlay} pointerEvents="none">
            <View style={styles.playTriangle} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: '100%' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  placeholderText: { color: '#fff', opacity: 0.7, fontSize: 12 },
  badge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontVariant: ['tabular-nums'] },
  playOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(255,255,255,0.85)',
    marginLeft: 6,
  },
});
