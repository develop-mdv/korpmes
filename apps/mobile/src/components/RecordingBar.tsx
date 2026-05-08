import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VoiceRecorderState } from '../hooks/useVoiceRecorder';
import { useTheme } from '../theme';

interface RecordingBarProps {
  state: VoiceRecorderState;
  elapsedMs: number;
  amplitude: number;
  onCancel: () => void;
  onSend: () => void;
  onLock?: () => void;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RecordingBar({
  state,
  elapsedMs,
  amplitude,
  onCancel,
  onSend,
  onLock,
}: RecordingBarProps) {
  const theme = useTheme();
  const bars = 18;
  const isLocked = state === 'locked';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg, borderTopColor: theme.colors.border },
      ]}
    >
      <Pressable style={[styles.iconBtn, { backgroundColor: 'rgba(220,53,69,0.12)' }]} onPress={onCancel}>
        <Ionicons name="close" size={20} color="#dc3545" />
      </Pressable>
      <View style={styles.dot} />
      <Text style={[styles.elapsed, { color: theme.colors.textPrimary }]}>{formatElapsed(elapsedMs)}</Text>

      <View style={styles.barsWrap}>
        {Array.from({ length: bars }).map((_, i) => {
          const seed = 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + elapsedMs / 200));
          const h = Math.max(3, Math.round(amplitude * 22 * seed));
          return <View key={i} style={[styles.bar, { height: h, backgroundColor: theme.colors.primary }]} />;
        })}
      </View>

      <Text style={[styles.hint, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {isLocked ? 'Запись зафиксирована' : 'Тяните вверх — фиксация'}
      </Text>

      {!isLocked && onLock && (
        <Pressable style={[styles.iconBtn, { backgroundColor: theme.colors.surfaceSoft }]} onPress={onLock}>
          <Ionicons name="lock-closed" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      )}

      <Pressable
        style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
        onPress={onSend}
      >
        <Ionicons name="send" size={18} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc3545',
  },
  elapsed: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 44,
    fontVariant: ['tabular-nums'],
  },
  barsWrap: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 22,
    width: 90,
  },
  bar: { width: 3, borderRadius: 2, opacity: 0.85 },
  hint: { flex: 1, fontSize: 12 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
