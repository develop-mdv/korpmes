import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { Panel, SectionTitle, AlertMessage, ActionRow } from './ScreenPrimitives';
import * as orgsApi from '../api/organizations.api';
import { useOrganizationStore } from '../stores/organization.store';
import { useTheme } from '../theme';

export function OrganizationAccess() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<orgsApi.Organization[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inputStyle = [styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }];
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (err: any) { setError(err.response?.data?.error?.message || 'Не удалось выполнить действие. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  };
  const create = () => run(async () => {
    const org = await orgsApi.createOrganization({ name: name.trim(), slug: slug.trim() });
    const store = useOrganizationStore.getState();
    store.setOrganizations([...store.organizations, org]);
    store.setCurrentOrg(org);
  });
  return <View style={styles.sections}>
    <Panel>
      <SectionTitle>Присоединиться к организации</SectionTitle>
      <Text style={{ color: theme.colors.textSecondary, marginVertical: 12 }}>Найдите компанию и отправьте заявку. По приглашению можно войти через полученную ссылку.</Text>
      <TextInput accessibilityLabel="Название организации для поиска" style={inputStyle} value={query} onChangeText={setQuery} placeholder="Название организации" placeholderTextColor={theme.colors.textTertiary} />
      <Pressable disabled={busy || query.trim().length < 2} onPress={() => void run(async () => setResults(await orgsApi.searchOrganizations(query.trim())))} style={styles.button}>
        <Text style={{ color: theme.colors.primary }}>Найти организацию</Text>
      </Pressable>
      {results.map((org) => <ActionRow key={org.id} title={org.name} subtitle="Отправить заявку на вступление" icon="business-outline" onPress={() => { if (!busy) void run(async () => { await orgsApi.requestJoin(org.id); setMessage('Заявка отправлена. Личные чаты доступны, пока вы ожидаете ответа.'); }); }} />)}
    </Panel>
    <Panel>
      <SectionTitle>Создать организацию</SectionTitle>
      <TextInput accessibilityLabel="Название новой организации" style={inputStyle} value={name} onChangeText={setName} placeholder="Название" placeholderTextColor={theme.colors.textTertiary} />
      <TextInput accessibilityLabel="Адрес организации" style={inputStyle} value={slug} onChangeText={setSlug} placeholder="Адрес: my-team" autoCapitalize="none" placeholderTextColor={theme.colors.textTertiary} />
      <Pressable disabled={busy || !name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)} onPress={() => void create()} style={styles.button}>
        <Text style={{ color: theme.colors.primary }}>Создать организацию</Text>
      </Pressable>
    </Panel>
    {error ? <AlertMessage>{error}</AlertMessage> : null}
    {message ? <AlertMessage tone="success">{message}</AlertMessage> : null}
  </View>;
}
const styles = StyleSheet.create({
  sections: { gap: 16 }, input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginTop: 12 },
  button: { paddingVertical: 16, alignItems: 'center' },
});
