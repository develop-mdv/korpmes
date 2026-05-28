import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { ActionRow, AlertMessage, HeroBlock, LoadingBlock, Panel, Pill, SectionTitle } from '../../components/ScreenPrimitives';
import { useOrganizationStore } from '../../stores/organization.store';
import { useTheme } from '../../theme';
import * as organizationsApi from '../../api/organizations.api';

function roleLabel(role: organizationsApi.OrganizationMember['role']): string {
  if (role === 'owner') return 'Владелец';
  if (role === 'admin') return 'Администратор';
  return 'Участник';
}

export function MembersScreen() {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizations = useOrganizationStore((state) => state.organizations);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const members = useOrganizationStore((state) => state.members);
  const setMembers = useOrganizationStore((state) => state.setMembers);
  const removeMemberFromStore = useOrganizationStore((state) => state.removeMember);
  const updateMemberRole = useOrganizationStore((state) => state.updateMemberRole);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLink, setInviteLink] = useState<organizationsApi.InviteLinkInfo | null>(null);
  const [busyId, setBusyId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      const [membersResponse, linkResponse] = await Promise.all([
        organizationsApi.getMembers(currentOrg.id, 1, 100),
        organizationsApi.getInviteLink(currentOrg.id).catch(() => null),
      ]);
      setMembers(membersResponse.members ?? []);
      setInviteLink(linkResponse);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить участников');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, setMembers]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncMemberCount = (delta: number) => {
    if (!currentOrg) return;
    const updated = { ...currentOrg, memberCount: Math.max(0, currentOrg.memberCount + delta) };
    setCurrentOrg(updated);
    setOrganizations(organizations.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return;
    setInviting(true);
    setMessage('');
    setError('');
    try {
      await organizationsApi.inviteMember(currentOrg.id, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      setInviteRole('member');
      setMessage('Приглашение отправлено.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось отправить приглашение.');
    } finally {
      setInviting(false);
    }
  };

  const handleCreateLink = async () => {
    if (!currentOrg) return;
    setError('');
    try {
      const next = await organizationsApi.createInviteLink(currentOrg.id);
      setInviteLink(next);
      await Clipboard.setStringAsync(next.url);
      setMessage('Ссылка приглашения создана и скопирована.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось создать ссылку.');
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink?.url) return;
    await Clipboard.setStringAsync(inviteLink.url);
    setMessage('Ссылка скопирована.');
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!currentOrg) return;
    setBusyId(userId);
    setError('');
    try {
      await organizationsApi.changeRole(currentOrg.id, userId, role);
      updateMemberRole(userId, role);
      setMessage('Роль участника обновлена.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось изменить роль.');
    } finally {
      setBusyId('');
    }
  };

  const handleRemove = (userId: string) => {
    if (!currentOrg) return;
    Alert.alert('Удалить участника?', 'Участник потеряет доступ к организации.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setBusyId(userId);
          setError('');
          try {
            await organizationsApi.removeMember(currentOrg.id, userId);
            removeMemberFromStore(userId);
            syncMemberCount(-1);
            setMessage('Участник удален из пространства.');
          } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Не удалось удалить участника.');
          } finally {
            setBusyId('');
          }
        },
      },
    ]);
  };

  if (!currentOrg) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <EmptyState title="Нет активной организации" description="Выберите рабочее пространство, чтобы управлять участниками." />
      </View>
    );
  }

  const admins = members.filter((member) => member.role === 'owner' || member.role === 'admin').length;

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={members}
      keyExtractor={(item) => item.userId}
      ListHeaderComponent={
        <View style={styles.header}>
          <HeroBlock
            kicker="Участники"
            title={`Команда ${currentOrg.name}`}
            description="Приглашайте людей, меняйте роли и управляйте доступом так же, как в веб-версии."
          >
            <Pill label={`${members.length} в списке`} tone="primary" />
            <Pill label={`${admins} админов`} />
          </HeroBlock>

          <Panel style={styles.form}>
            <SectionTitle>Приглашение</SectionTitle>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="teammate@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.input, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
            <View style={styles.roleRow}>
              {(['member', 'admin'] as const).map((role) => {
                const active = inviteRole === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => setInviteRole(role)}
                    style={[styles.roleChip, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                  >
                    <Text style={[styles.roleText, { color: active ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
                      {role === 'admin' ? 'Администратор' : 'Участник'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.colors.primary, opacity: inviting || !inviteEmail.trim() ? 0.55 : pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={[styles.primaryText, { color: theme.colors.onPrimary }]}>
                {inviting ? 'Отправляем...' : 'Пригласить'}
              </Text>
            </Pressable>
          </Panel>

          <ActionRow
            icon="link-outline"
            title={inviteLink?.url ? 'Ссылка приглашения готова' : 'Создать ссылку приглашения'}
            subtitle={inviteLink?.url ?? 'Одноразовое действие для быстрого вступления'}
            onPress={inviteLink?.url ? handleCopyLink : handleCreateLink}
            right={<Ionicons name={inviteLink?.url ? 'copy-outline' : 'add-outline'} size={21} color={theme.colors.primary} />}
          />
          {message ? <AlertMessage tone="success">{message}</AlertMessage> : null}
          {error ? <AlertMessage>{error}</AlertMessage> : null}
          {loading ? <LoadingBlock label="Загружаем участников..." /> : null}
        </View>
      }
      renderItem={({ item }) => {
        const name = `${item.firstName} ${item.lastName}`.trim() || item.email;
        const isOwner = item.role === 'owner';
        return (
          <Panel style={styles.memberCard}>
            <View style={styles.memberTop}>
              <Avatar name={name} uri={item.avatar} size={44} />
              <View style={styles.memberBody}>
                <Text style={[styles.memberName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.memberEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                <Text style={[styles.memberMeta, { color: theme.colors.textTertiary }]}>
                  {roleLabel(item.role)} · {item.department || 'Без отдела'}
                </Text>
              </View>
            </View>
            {isOwner ? (
              <Pill label="Владелец" tone="primary" />
            ) : (
              <View style={styles.memberActions}>
                {(['member', 'admin'] as const).map((role) => {
                  const active = item.role === role;
                  return (
                    <Pressable
                      key={role}
                      disabled={busyId === item.userId}
                      onPress={() => handleRoleChange(item.userId, role)}
                      style={[styles.smallButton, { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft }]}
                    >
                      <Text style={[styles.smallButtonText, { color: active ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
                        {role === 'admin' ? 'Админ' : 'Участник'}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  disabled={busyId === item.userId}
                  onPress={() => handleRemove(item.userId)}
                  style={[styles.smallButton, { borderColor: theme.colors.error, backgroundColor: `${theme.colors.error}18` }]}
                >
                  <Text style={[styles.smallButtonText, { color: theme.colors.error }]}>Удалить</Text>
                </Pressable>
              </View>
            )}
          </Panel>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            title="Пока никого нет"
            description="Пригласите первого участника, чтобы открыть совместную работу."
            icon={<Ionicons name="people-outline" size={54} color={theme.colors.primary} />}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36 },
  header: { gap: 12, marginBottom: 12 },
  centered: { flex: 1 },
  form: { gap: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 11, alignItems: 'center' },
  roleText: { fontSize: 13, fontWeight: '800' },
  primaryButton: { height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '800' },
  memberCard: { gap: 14 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberBody: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 15, fontWeight: '800' },
  memberEmail: { fontSize: 13, marginTop: 3 },
  memberMeta: { fontSize: 12, marginTop: 5 },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  smallButtonText: { fontSize: 12, fontWeight: '800' },
});
