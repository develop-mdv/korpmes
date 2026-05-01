import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../../components/Avatar';
import { apiClient } from '../../api/client';
import { useTheme } from '../../theme';
import type { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskDetail'>;

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  dueDate?: string;
  comments: Comment[];
}

const STATUSES: { id: TaskDetail['status']; label: string }[] = [
  { id: 'todo', label: 'К работе' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'review', label: 'На ревью' },
  { id: 'done', label: 'Готово' },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: 'низкий',
  medium: 'средний',
  high: 'высокий',
  urgent: 'срочный',
};

export function TaskDetailScreen({ route }: Props) {
  const theme = useTheme();
  const { taskId } = route.params;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const fetchTask = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get<TaskDetail>(`/tasks/${taskId}`);
      setTask(data);
    } catch (err) {
      console.error('Failed to fetch task:', err);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStatusChange = useCallback(
    async (newStatus: TaskDetail['status']) => {
      if (!task) return;
      try {
        await apiClient.patch(`/tasks/${taskId}`, { status: newStatus });
        setTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      } catch {
        Alert.alert('Ошибка', 'Не удалось обновить статус.');
      }
    },
    [task, taskId],
  );

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    try {
      setIsSending(true);
      const { data } = await apiClient.post<Comment>(`/tasks/${taskId}/comments`, {
        content: commentText.trim(),
      });
      setTask((prev) => (prev ? { ...prev, comments: [...prev.comments, data] } : null));
      setCommentText('');
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить комментарий.');
    } finally {
      setIsSending(false);
    }
  }, [commentText, taskId]);

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.bg }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Задача не найдена</Text>
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily }]}>
        {task.title}
      </Text>

      <View style={styles.metaRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {STATUSES.find((s) => s.id === task.status)?.label ?? task.status}
          </Text>
        </View>
        <View style={styles.priorityContainer}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.priorityLabel, { color: theme.colors.textSecondary }]}>
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </Text>
        </View>
      </View>

      {task.description && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Описание</Text>
          <Text style={[styles.description, { color: theme.colors.textPrimary }]}>{task.description}</Text>
        </View>
      )}

      {task.assignee && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Исполнитель</Text>
          <View style={styles.assigneeRow}>
            <Avatar
              name={`${task.assignee.firstName} ${task.assignee.lastName}`}
              uri={task.assignee.avatarUrl}
              size={32}
            />
            <Text style={[styles.assigneeName, { color: theme.colors.textPrimary }]}>
              {task.assignee.firstName} {task.assignee.lastName}
            </Text>
          </View>
        </View>
      )}

      {task.dueDate && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Срок</Text>
          <Text style={[styles.dueDate, { color: theme.colors.textPrimary }]}>
            {new Date(task.dueDate).toLocaleDateString('ru-RU')}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Статус</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const sc = STATUS_COLORS[s.id];
            const isActive = s.id === task.status;
            return (
              <Pressable
                key={s.id}
                style={[
                  styles.statusOption,
                  {
                    backgroundColor: isActive ? sc.bg : theme.colors.surface,
                    borderColor: isActive ? sc.text : theme.colors.border,
                  },
                ]}
                onPress={() => handleStatusChange(s.id)}
              >
                <Text style={[styles.statusOptionText, { color: isActive ? sc.text : theme.colors.textSecondary }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
          Комментарии ({task.comments.length})
        </Text>
        {task.comments.map((comment) => (
          <View key={comment.id} style={[styles.comment, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.commentHeader}>
              <Avatar name={comment.authorName} uri={comment.authorAvatarUrl} size={28} />
              <Text style={[styles.commentAuthor, { color: theme.colors.textPrimary }]}>{comment.authorName}</Text>
              <Text style={[styles.commentTime, { color: theme.colors.textTertiary }]}>
                {new Date(comment.createdAt).toLocaleDateString('ru-RU')}
              </Text>
            </View>
            <Text style={[styles.commentContent, { color: theme.colors.textPrimary }]}>{comment.content}</Text>
          </View>
        ))}

        <View style={styles.commentInputRow}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Добавить комментарий…"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.commentSend,
              {
                backgroundColor: theme.colors.primary,
                opacity: isSending || !commentText.trim() ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleAddComment}
            disabled={isSending || !commentText.trim()}
          >
            <Text style={[styles.commentSendText, { color: theme.colors.onPrimary }]}>Отправить</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  priorityContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityLabel: { fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 22 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assigneeName: { fontSize: 15, fontWeight: '500' },
  dueDate: { fontSize: 15 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  statusOptionText: { fontSize: 12, fontWeight: '600' },
  comment: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '600', flex: 1 },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  commentSend: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  commentSendText: { fontSize: 13, fontWeight: '700' },
});
