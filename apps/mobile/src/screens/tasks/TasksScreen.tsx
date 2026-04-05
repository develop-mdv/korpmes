import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';
import { apiClient } from '../../api/client';
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

const FILTERS = ['All', 'My', 'In Progress', 'Review', 'Done'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  todo: { bg: '#F3F4F6', text: '#374151' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8' },
  review: { bg: '#FEF3C7', text: '#B45309' },
  done: { bg: '#D1FAE5', text: '#047857' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export function TasksScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      const statusLabel = item.status.replace('_', ' ');

      return (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.cardMeta}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
            {item.assignee && (
              <Avatar
                name={`${item.assignee.firstName} ${item.assignee.lastName}`}
                uri={item.assignee.avatarUrl}
                size={24}
              />
            )}
            {item.dueDate && (
              <Text style={styles.dueDate}>
                {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f && styles.filterChipTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState title="No tasks found" description="Try a different filter" />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  dueDate: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 'auto',
  },
});
