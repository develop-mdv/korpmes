import React, { ReactNode } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, GestureResponderEvent } from 'react-native';
import { useTheme } from '../../theme';

interface PrimaryButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  iconRight?: ReactNode;
}

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', iconRight }: PrimaryButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = (() => {
    if (variant === 'secondary') {
      return {
        bg: theme.colors.surface,
        fg: theme.colors.textPrimary,
        border: theme.colors.borderStrong,
      };
    }
    if (variant === 'ghost') {
      return { bg: 'transparent', fg: theme.colors.primary, border: 'transparent' };
    }
    return { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: theme.colors.primaryDark };
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ translateY: pressed && !isDisabled ? 1 : 0 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
});
