import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { AlertMessage, HeroBlock, LoadingBlock, Panel, Pill } from '../../components/ScreenPrimitives';
import { useOrganizationStore } from '../../stores/organization.store';
import { useTheme } from '../../theme';
import * as organizationsApi from '../../api/organizations.api';

export function RequestsScreen() {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const [requests, setRequests] = useState<organizationsApi.JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      const res = await organizationsApi.listJoinRequests(currentOrg.id);
      setRequests(res);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить заявки.');
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDecision = async (requestId: string, decision: 'approve' | 'reject') => {
    if (!currentOrg) return;
    setBusyId(requestId);
    setError('');
    try {
      if (decision === 'approve') {
        await organizationsApi.approveJoinRequest(currentOrg.id, requestId);
      } else {
        await organizationsApi.rejectJoinRequest(currentOrg.id, requestId);
      }
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось обработать заявку.');
    } finally {
      setBusyId('');
    }
  };

  if (!currentOrg) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <EmptyState title="Нет активной организации" description="Выберите пространство, чтобы просматривать заявки." />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={requests}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <HeroBlock
            kicker="Доступ"
            title="Заявки на вступление."
            description={`Пользователи, которые хотят попасть в «${currentOrg.name}», собраны здесь.`}
          >
            <Pill label={`Ожидают: ${requests.length}`} tone={requests.length > 0 ? 'warning' : 'success'} />
          </HeroBlock>
          {error ? <AlertMessage>{error}</AlertMessage> : null}
          {loading ? <LoadingBlock label="Загружаем заявки..." /> : null}
        </View>
      }
      renderItem={({ item }) => {
        const name = [item.user?.firstName, item.user?.lastName].filter(Boolean).join(' ') || item.user?.email || 'Пользователь';
        return (
          <Panel style={styles.requestCard}>
            <View style={styles.requestTop}>
              <Avatar name={name} uri={item.user?.avatarUrl} size={44} />
              <View style={styles.requestBody}>
                <Text style={[styles.requestName, { color: theme.colors.textPrimary }]}>{name}</Text>
                <Text style={[styles.requestEmail, { color: theme.colors.textSecondary }]}>{item.user?.email}</Text>
                <Text style={[styles.requestMeta, { color: theme.colors.textTertiary }]}>
                  {new Date(item.createdAt).toLocaleString('ru-RU')}
                </Text>
              </View>
            </View>
            {item.message ? <Text style={[styles.requestMessage, { color: theme.colors.textSecondary }]}>{item.message}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                disabled={busyId === item.id}
                onPress={() => handleDecision(item.id, 'approve')}
                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.actionText, { color: theme.colors.onPrimary }]}>Одобрить</Text>
              </Pressable>
              <Pressable
                disabled={busyId === item.id}
                onPress={() => handleDecision(item.id, 'reject')}
                style={[styles.actionButton, { backgroundColor: `${theme.colors.error}18`, borderColor: theme.colors.error, borderWidth: 1 }]}
              >
                <Text style={[styles.actionText, { color: theme.colors.error }]}>Отклонить</Text>
              </Pressable>
            </View>
          </Panel>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            title="Нет ожидающих заявок"
            description="Когда кто-то попросит доступ, заявка появится здесь."
            icon={<Ionicons name="person-add-outline" size={54} color={theme.colors.primary} />}
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
  requestCard: { gap: 12 },
  requestTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  requestBody: { flex: 1, minWidth: 0 },
  requestName: { fontSize: 15, fontWeight: '800' },
  requestEmail: { fontSize: 13, marginTop: 3 },
  requestMeta: { fontSize: 12, marginTop: 5 },
  requestMessage: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '800' },
});
