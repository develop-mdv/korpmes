import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';
import { apiClient } from '../../api/client';
import { useTheme } from '../../theme';
import type { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'TasksList'>;

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  dueDate?: string;
}

const FILTERS: { id: string; label: string }[] = [
  { id: 'All', label: 'Все' },
  { id: 'My', label: 'Мои' },
  { id: 'In Progress', label: 'В работе' },
  { id: 'Review', label: 'На ревью' },
  { id: 'Done', label: 'Готово' },
];

const STATUS_LABELS: Record<string, string> = {
  todo: 'к работе',
  in_progress: 'в работе',
  review: 'на ревью',
  done: 'готово',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'низкий',
  medium: 'средний',
  high: 'высокий',
  urgent: 'срочный',
};

export function TasksScreen({ navigation }: Props) {
  const theme = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    todo: { bg: theme.colors.surfaceSoft, text: theme.colors.textSecondary },
    in_progress: { bg: 'rgba(58,109,194,0.18)', text: theme.colors.info },
    review: { bg: 'rgba(213,139,34,0.18)', text: theme.colors.warning },
    done: { bg: 'rgba(30,157,104,0.18)', text: theme.colors.success },
  };
  const PRIORITY_COLORS: Record<string, string> = {
    low: theme.colors.textTertiary,
    medium: theme.colors.info,
    high: theme.colors.warning,
    urgent: theme.colors.error,
  };

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get<Task[]>('/tasks');
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }, [fetchTasks]);

  const filteredTasks = tasks.filter((task) => {
    switch (filter) {
      case 'In Progress':
        return task.status === 'in_progress';
      case 'Review':
        return task.status === 'review';
      case 'Done':
        return task.status === 'done';
      case 'My':
        return !!task.assignee;
      default:
        return true;
    }
  });

  const renderTask = useCallback(
    ({ item }: { item: Task }) => {
      const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.todo;
      const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.low;

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
            {item.assignee && (
              <Avatar
                name={`${item.assignee.firstName} ${item.assignee.lastName}`}
                uri={item.assignee.avatarUrl}
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
    [navigation, theme],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
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
  filtersContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
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
