import React, { memo } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

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

function getColorFromName(name: string): string {
  const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar = memo(function Avatar({ uri, name, size = 40, online }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);
  const fontSize = size * 0.4;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
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
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              borderWidth: size * 0.06,
              backgroundColor: online ? '#22C55E' : '#9CA3AF',
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: '#FFFFFF',
  },
});
