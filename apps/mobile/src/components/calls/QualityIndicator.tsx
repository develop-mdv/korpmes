import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

type Quality = 'good' | 'fair' | 'poor';
type Size = 'sm' | 'md';

interface QualityIndicatorProps {
  quality: Quality;
  size?: Size;
}

export function QualityIndicator({ quality, size = 'md' }: QualityIndicatorProps) {
  const theme = useTheme();
  const barWidth = size === 'sm' ? 3 : 4;
  const baseHeight = size === 'sm' ? 4 : 6;
  const gap = size === 'sm' ? 2 : 3;

  const activeBars = quality === 'good' ? 3 : quality === 'fair' ? 2 : 1;
  const colorMap = {
    good: theme.colors.success,
    fair: theme.colors.warning,
    poor: theme.colors.error,
  };
  const color = colorMap[quality];
  const offColor = 'rgba(255,255,255,0.25)';

  return (
    <View style={[styles.row, { gap }]}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: baseHeight + i * 3,
            borderRadius: barWidth / 2,
            backgroundColor: i < activeBars ? color : offColor,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});
