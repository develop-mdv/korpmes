import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useOrganizationStore } from '../stores/organization.store';
import { useTheme } from '../theme';

export function WorkspaceSwitcher() {
  const theme = useTheme();
  const { currentOrg, organizations, setCurrentOrg } = useOrganizationStore();
  const spaces = [{ id: 'personal', name: 'Личное', org: null }, ...organizations.map((org) => ({ id: org.id, name: org.name, org }))];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list} accessibilityLabel="Выбор пространства">
    {spaces.map((space) => {
      const active = (currentOrg?.id ?? 'personal') === space.id;
      return <Pressable key={space.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setCurrentOrg(space.org)}
        style={[styles.option, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft, borderColor: theme.colors.border }]}>
        <Text style={{ color: active ? theme.colors.onPrimary : theme.colors.textPrimary, fontWeight: '700' }}>{space.name}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  option: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
});
