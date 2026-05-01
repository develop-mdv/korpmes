import React, { memo } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  online?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const tonePalette = ['#9f7a3d', '#5d431d', '#168c7c', '#3a6dc2', '#1e9d68', '#d58b22', '#a0526a'];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tonePalette[Math.abs(hash) % tonePalette.length];
}

export const Avatar = memo(function Avatar({ uri, name, size = 40, online }: AvatarProps) {
  const theme = useTheme();
  const initials = getInitials(name) || '·';
  const bgColor = getColorFromName(name);
  const fontSize = Math.round(size * 0.4);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}
      {online !== undefined && (
        <View
          style={[
            styles.indicator,
            {
              width: Math.round(size * 0.28),
              height: Math.round(size * 0.28),
              borderRadius: Math.round(size * 0.14),
              borderWidth: Math.max(1, Math.round(size * 0.06)),
              borderColor: theme.colors.bg,
              backgroundColor: online ? theme.colors.success : theme.colors.textTertiary,
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'relative' },
  image: { resizeMode: 'cover' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontWeight: '700' },
  indicator: { position: 'absolute', bottom: 0, right: 0 },
});
