import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActionRow, AlertMessage, HeroBlock, Panel, Pill, ScreenScroll, SectionTitle } from '../../components/ScreenPrimitives';
import { useOrganizationStore } from '../../stores/organization.store';
import { useTheme } from '../../theme';
import * as organizationsApi from '../../api/organizations.api';
import type { MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MoreStackParamList, 'OrganizationHome'>;

export function OrganizationScreen({ navigation }: Props) {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizations = useOrganizationStore((state) => state.organizations);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const members = useOrganizationStore((state) => state.members);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(currentOrg?.name ?? '');
    setDescription(currentOrg?.description ?? '');
  }, [currentOrg]);

  const handleSave = async () => {
    if (!currentOrg || !name.trim()) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await organizationsApi.updateOrganization(currentOrg.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setCurrentOrg(updated);
      setOrganizations(organizations.map((item) => (item.id === updated.id ? updated : item)));
      setMessage('Параметры организации сохранены.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось сохранить изменения.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentOrg) {
    return (
      <ScreenScroll>
        <HeroBlock
          kicker="Организация"
          title="Рабочее пространство не выбрано."
          description="Когда аккаунт будет привязан к организации, здесь появятся ее параметры, участники и структура."
        />
      </ScreenScroll>
    );
  }

  const admins = members.filter((member) => member.role === 'owner' || member.role === 'admin').length;

  return (
    <ScreenScroll>
      <HeroBlock
        kicker="Организация"
        title={currentOrg.name}
        description="Центр управления пространством: название, участники, заявки и структура отделов."
      >
        <Pill label={`${currentOrg.memberCount} участников`} tone="primary" />
        <Pill label={`Админов: ${admins}`} />
        <Pill label={`Обновлено ${new Date(currentOrg.updatedAt).toLocaleDateString('ru-RU')}`} />
      </HeroBlock>

      {organizations.length > 1 ? (
        <Panel>
          <SectionTitle>Переключить пространство</SectionTitle>
          <View style={styles.orgGrid}>
            {organizations.map((org) => {
              const active = org.id === currentOrg.id;
              return (
                <Pressable
                  key={org.id}
                  onPress={() => setCurrentOrg(org)}
                  style={[
                    styles.orgButton,
                    {
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft,
                    },
                  ]}
                >
                  <Text style={[styles.orgButtonText, { color: active ? theme.colors.onPrimary : theme.colors.textPrimary }]}>
                    {org.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Panel>
      ) : null}

      <Panel style={styles.form}>
        <SectionTitle>Редактирование</SectionTitle>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Название"
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.input, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Описание"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          style={[
            styles.input,
            styles.textarea,
            { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, color: theme.colors.textPrimary },
          ]}
        />
        {message ? <AlertMessage tone="success">{message}</AlertMessage> : null}
        {error ? <AlertMessage>{error}</AlertMessage> : null}
        <Pressable
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.colors.primary, opacity: saving || !name.trim() ? 0.55 : pressed ? 0.82 : 1 },
          ]}
        >
          <Text style={[styles.saveText, { color: theme.colors.onPrimary }]}>{saving ? 'Сохраняем...' : 'Сохранить изменения'}</Text>
        </Pressable>
      </Panel>

      <View style={styles.list}>
        <ActionRow
          icon="people-outline"
          title="Участники"
          subtitle="Приглашения, роли и состав команды"
          meta={`${members.length} загружено, ${currentOrg.memberCount} всего`}
          onPress={() => navigation.navigate('Members')}
        />
        <ActionRow
          icon="git-network-outline"
          title="Отделы"
          subtitle="Структура и вложенность подразделений"
          onPress={() => navigation.navigate('Departments')}
        />
        <ActionRow
          icon="person-add-outline"
          title="Заявки"
          subtitle="Запросы на вступление в организацию"
          onPress={() => navigation.navigate('Requests')}
        />
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  orgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  orgButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  orgButtonText: { fontSize: 13, fontWeight: '800' },
  form: { gap: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, fontSize: 15 },
  textarea: { minHeight: 118, paddingTop: 14, textAlignVertical: 'top' },
  saveButton: { height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15, fontWeight: '800' },
  list: { gap: 10 },
});
