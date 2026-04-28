import React, { memo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export const EmptyState = memo(function EmptyState({ title, description, icon }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64 },
  icon: { marginBottom: 16, opacity: 0.7 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
