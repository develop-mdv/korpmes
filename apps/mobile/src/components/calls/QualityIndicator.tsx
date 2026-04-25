import React from 'react';
import { View, StyleSheet } from 'react-native';

type Quality = 'good' | 'fair' | 'poor';
type Size = 'sm' | 'md';

interface QualityIndicatorProps {
  quality: Quality;
  size?: Size;
}

const COLORS = {
  good: '#10B981',
  fair: '#F59E0B',
  poor: '#EF4444',
  off: 'rgba(255,255,255,0.25)',
};

export function QualityIndicator({ quality, size = 'md' }: QualityIndicatorProps) {
  const barWidth = size === 'sm' ? 3 : 4;
  const baseHeight = size === 'sm' ? 4 : 6;
  const gap = size === 'sm' ? 2 : 3;

  const activeBars = quality === 'good' ? 3 : quality === 'fair' ? 2 : 1;
  const color = COLORS[quality];

  return (
    <View style={[styles.row, { gap }]}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: baseHeight + i * 3,
            borderRadius: barWidth / 2,
            backgroundColor: i < activeBars ? color : COLORS.off,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});
