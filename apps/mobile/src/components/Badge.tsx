import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  count: number;
  maxCount?: number;
}

export const Badge = memo(function Badge({ count, maxCount = 99 }: BadgeProps) {
  if (count <= 0) return null;

  const label = count > maxCount ? `${maxCount}+` : String(count);

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
