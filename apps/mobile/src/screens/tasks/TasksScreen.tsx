import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';
import { useTheme } from '../../theme';
import { useOrganizationStore } from '../../stores/organization.store';
import { getExistingSocket } from '../../socket/socket';
import { getTasks, TaskStatus, type Task } from '../../api/tasks.api';
import type { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'TasksList'>;

const FILTERS: { id: TaskStatus | 'ALL' | 'MY'; label: string }[] = [
  { id: 'ALL', label: 'Все' },
  { id: 'MY', label: 'Мои' },
  { id: TaskStatus.NEW, label: 'Новые' },
  { id: TaskStatus.IN_PROGRESS, label: 'В работе' },
  { id: TaskStatus.IN_REVIEW, label: 'На проверке' },
  { id: TaskStatus.DONE, label: 'Готово' },
  { id: TaskStatus.CANCELLED, label: 'Отменены' },
];

const STATUS_LABELS: Record<string, string> = {
  NEW: 'к работе',
  IN_PROGRESS: 'в работе',
  IN_REVIEW: 'на проверке',
  DONE: 'готово',
  CANCELLED: 'отменена',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'низкий',
  MEDIUM: 'средний',
  HIGH: 'высокий',
  URGENT: 'срочный',
};

export function TasksScreen({ navigation }: Props) {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((s) => s.currentOrg);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    NEW: { bg: theme.colors.surfaceSoft, text: theme.colors.textSecondary },
    IN_PROGRESS: { bg: 'rgba(58,109,194,0.18)', text: theme.colors.info },
    IN_REVIEW: { bg: 'rgba(213,139,34,0.18)', text: theme.colors.warning },
    DONE: { bg: 'rgba(30,157,104,0.18)', text: theme.colors.success },
    CANCELLED: { bg: 'rgba(201,78,78,0.18)', text: theme.colors.error },
  };
  const PRIORITY_COLORS: Record<string, string> = {
    LOW: theme.colors.textTertiary,
    MEDIUM: theme.colors.info,
    HIGH: theme.colors.warning,
    URGENT: theme.colors.error,
  };

  const fetchTasks = useCallback(async () => {
    if (!currentOrg) return;
    try {
      setIsLoading(true);
      const data = await getTasks(currentOrg.id);
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!currentOrg) return;
    const socket = getExistingSocket();
    if (!socket) return;
    socket.emit('org:join', { orgId: currentOrg.id });

    const refetch = () => {
      fetchTasks();
    };
    socket.on('task:created', refetch);
    socket.on('task:updated', refetch);
    socket.on('task:deleted', refetch);

    return () => {
      socket.off('task:created', refetch);
      socket.off('task:updated', refetch);
      socket.off('task:deleted', refetch);
    };
  }, [currentOrg, fetchTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }, [fetchTasks]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'ALL') return true;
    if (filter === 'MY') return !!task.assignedToUser;
    return task.status === filter;
  });

  const renderTask = useCallback(
    ({ item }: { item: Task }) => {
      const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.NEW;
      const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.LOW;
      const assignee = item.assignedToUser;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              transform: [{ translateY: pressed ? 1 : 0 }],
            },
          ]}
          onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.cardMeta}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.priorityText, { color: theme.colors.textSecondary }]}>
                {PRIORITY_LABELS[item.priority] ?? item.priority}
              </Text>
            </View>
            {assignee && (
              <Avatar
                name={`${assignee.firstName} ${assignee.lastName}`}
                uri={assignee.avatarUrl}
                size={26}
              />
            )}
            {item.dueDate && (
              <Text style={[styles.dueDate, { color: theme.colors.textTertiary }]}>
                {new Date(item.dueDate).toLocaleDateString('ru-RU')}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [navigation, theme, STATUS_COLORS, PRIORITY_COLORS],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.headerRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={{ flex: 1 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setFilter(f.id)}
              >
                <Text style={[styles.filterChipText, { color: active ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          accessibilityLabel="Создать задачу"
          onPress={() => navigation.navigate('CreateTask')}
          style={({ pressed }) => [
            styles.createButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={22} color={theme.colors.onPrimary} />
        </Pressable>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="Задач не найдено"
              description="Попробуйте сменить фильтр или создать новую задачу."
              icon={<Ionicons name="checkbox-outline" size={56} color={theme.colors.primary} />}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filtersContainer: { gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  createButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { borderRadius: 20, padding: 18, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 12 },
  dueDate: { fontSize: 12, marginLeft: 'auto' },
});
