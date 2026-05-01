import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface BadgeProps {
  count: number;
  maxCount?: number;
  variant?: 'error' | 'success' | 'warning' | 'info' | 'primary';
}

export const Badge = memo(function Badge({ count, maxCount = 99, variant = 'error' }: BadgeProps) {
  const theme = useTheme();
  if (count <= 0) return null;

  const label = count > maxCount ? `${maxCount}+` : String(count);
  const palette: Record<NonNullable<BadgeProps['variant']>, string> = {
    error: theme.colors.error,
    success: theme.colors.success,
    warning: theme.colors.warning,
    info: theme.colors.info,
    primary: theme.colors.primary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: palette[variant] }]}>
      <Text style={[styles.text, { color: theme.colors.onPrimary }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
