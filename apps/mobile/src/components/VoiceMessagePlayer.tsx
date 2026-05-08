import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useFileStore } from '../stores/file.store';
import { useTheme } from '../theme';
import { VOICE_WAVEFORM_BARS } from '@corp/shared-constants';

interface VoiceMessagePlayerProps {
  fileId: string;
  durationMs?: number;
  waveform?: number[];
  isOwn: boolean;
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fallbackWaveform(): number[] {
  const arr = new Array(VOICE_WAVEFORM_BARS).fill(0);
  for (let i = 0; i < VOICE_WAVEFORM_BARS; i++) {
    arr[i] = 25 + Math.round(45 * Math.abs(Math.sin(i * 1.7)));
  }
  return arr;
}

export function VoiceMessagePlayer({
  fileId,
  durationMs,
  waveform,
  isOwn,
}: VoiceMessagePlayerProps) {
  const theme = useTheme();
  const fetchFile = useFileStore((s) => s.fetchFile);
  const file = useFileStore((s) => s.filesById[fileId]);

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    if (!file) void fetchFile(fileId);
  }, [fileId, file, fetchFile]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const togglePlay = async () => {
    if (!file?.signedUrl) return;
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: file.signedUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setCurrentMs(status.positionMillis);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentMs(0);
            void soundRef.current?.setPositionAsync(0);
          }
        },
      );
      soundRef.current = sound;
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const totalMs = durationMs || file?.durationMs || 0;
  const bars = waveform && waveform.length > 0 ? waveform : fallbackWaveform();
  const progress = totalMs > 0 ? Math.min(1, currentMs / totalMs) : 0;
  const playedColor = isOwn ? theme.colors.onPrimary : theme.colors.primary;
  const restColor = isOwn ? 'rgba(255,255,255,0.45)' : theme.colors.borderStrong;
  const buttonBg = isOwn ? 'rgba(255,255,255,0.18)' : theme.colors.surfaceSoft;
  const textColor = isOwn ? 'rgba(255,255,255,0.85)' : theme.colors.textTertiary;

  return (
    <View style={styles.wrap}>
      <Pressable style={[styles.playBtn, { backgroundColor: buttonBg }]} onPress={togglePlay}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={16}
          color={isOwn ? '#fff' : theme.colors.primary}
        />
      </Pressable>
      <View style={styles.middle}>
        <View style={styles.bars}>
          {bars.map((v, i) => {
            const filled = i / bars.length < progress;
            const h = Math.max(3, Math.round((v / 100) * 22));
            return (
              <View
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  backgroundColor: filled ? playedColor : restColor,
                }}
              />
            );
          })}
        </View>
        <Text style={[styles.duration, { color: textColor }]}>
          {formatDuration(currentMs)} / {formatDuration(totalMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
    paddingVertical: 4,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 4 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 22 },
  duration: { fontSize: 11, fontVariant: ['tabular-nums'] },
});
