import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { ActionRow, AlertMessage, HeroBlock, LoadingBlock, Pill } from '../../components/ScreenPrimitives';
import { useTheme } from '../../theme';
import * as notificationsApi from '../../api/notifications.api';
import type { MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MoreStackParamList, 'Notifications'>;

const TYPE_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  message: { label: 'Сообщение', icon: 'chatbubble-outline' },
  mention: { label: 'Упоминание', icon: 'at-outline' },
  task: { label: 'Задача', icon: 'checkbox-outline' },
  call: { label: 'Звонок', icon: 'call-outline' },
  system: { label: 'Система', icon: 'sparkles-outline' },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const [items, setItems] = useState<notificationsApi.NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const unreadCount = items.filter((item) => !item.isRead).length;

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await notificationsApi.listNotifications(1, 50);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить уведомления');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const handleMarkRead = useCallback(async (item: notificationsApi.NotificationItem) => {
    if (!item.isRead) {
      await notificationsApi.markAsRead(item.id);
      setItems((prev) => prev.map((current) => (current.id === item.id ? { ...current, isRead: true } : current)));
    }

    const chatId = item.data?.chatId;
    const taskId = item.data?.taskId;
    const parent = navigation.getParent() as any;
    if (typeof chatId === 'string') {
      parent?.navigate('ChatsTab', { screen: 'ChatView', params: { chatId } });
    } else if (typeof taskId === 'string') {
      parent?.navigate('TasksTab', { screen: 'TaskDetail', params: { taskId } });
    }
  }, [navigation]);

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true);
    setError('');
    try {
      await notificationsApi.markAllAsRead();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось отметить уведомления');
    } finally {
      setMarkingAll(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <LoadingBlock label="Загружаем уведомления..." />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <HeroBlock
            kicker="Сигналы"
            title="Уведомления под контролем."
            description="Сообщения, задачи, звонки и системные события собраны в такой же ленте, как на вебе."
          >
            <Pill label={`Всего: ${total}`} />
            <Pill label={`Новых: ${unreadCount}`} tone={unreadCount > 0 ? 'error' : 'success'} />
          </HeroBlock>
          {unreadCount > 0 ? (
            <ActionRow
              icon="checkmark-done-outline"
              title={markingAll ? 'Отмечаем...' : `Прочитать все (${unreadCount})`}
              subtitle="Снимет индикаторы новых событий"
              onPress={markingAll ? undefined : handleMarkAll}
              disabled={markingAll}
            />
          ) : null}
          {error ? <AlertMessage>{error}</AlertMessage> : null}
        </View>
      }
      renderItem={({ item }) => {
        const meta = TYPE_LABELS[item.type] ?? TYPE_LABELS.system;
        return (
          <ActionRow
            icon={meta.icon}
            title={item.title}
            subtitle={item.body ?? meta.label}
            meta={`${meta.label} · ${formatDate(item.createdAt)}`}
            onPress={() => handleMarkRead(item)}
            right={!item.isRead ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : undefined}
          />
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        <EmptyState
          title="Пока уведомлений нет"
          description="Когда появится важное событие, оно попадет в эту ленту."
          icon={<Ionicons name="notifications-outline" size={54} color={theme.colors.primary} />}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36 },
  header: { gap: 12, marginBottom: 12 },
  centered: { flex: 1 },
  dot: { width: 11, height: 11, borderRadius: 999 },
});
