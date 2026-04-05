import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../../components/Avatar';
import { apiClient } from '../../api/client';
import type { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskDetail'>;

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

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: string;
}

const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;

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

export function TaskDetailScreen({ route }: Props) {
  const { taskId } = route.params;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);

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
    async (newStatus: string) => {
      if (!task) return;
      try {
        await apiClient.patch(`/tasks/${taskId}`, { status: newStatus });
        setTask((prev) => (prev ? { ...prev, status: newStatus as TaskDetail['status'] } : null));
      } catch (err) {
        Alert.alert('Error', 'Failed to update status');
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
      setTask((prev) =>
        prev ? { ...prev, comments: [...prev.comments, data] } : null,
      );
      setCommentText('');
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setIsSending(false);
    }
  }, [commentText, taskId]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{task.title}</Text>

      <View style={styles.metaRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {task.status.replace('_', ' ')}
          </Text>
        </View>
        <View style={styles.priorityContainer}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={styles.priorityLabel}>{task.priority}</Text>
        </View>
      </View>

      {task.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{task.description}</Text>
        </View>
      )}

      {task.assignee && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignee</Text>
          <View style={styles.assigneeRow}>
            <Avatar
              name={`${task.assignee.firstName} ${task.assignee.lastName}`}
              uri={task.assignee.avatarUrl}
              size={32}
            />
            <Text style={styles.assigneeName}>
              {task.assignee.firstName} {task.assignee.lastName}
            </Text>
          </View>
        </View>
      )}

      {task.dueDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due Date</Text>
          <Text style={styles.dueDate}>
            {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const sc = STATUS_COLORS[s];
            const isActive = s === task.status;
            return (
              <Pressable
                key={s}
                style={[
                  styles.statusOption,
                  { backgroundColor: isActive ? sc.bg : '#F9FAFB', borderColor: isActive ? sc.text : '#E5E7EB' },
                ]}
                onPress={() => handleStatusChange(s)}
              >
                <Text
                  style={[styles.statusOptionText, { color: isActive ? sc.text : '#9CA3AF' }]}
                >
                  {s.replace('_', ' ')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Comments ({task.comments.length})
        </Text>
        {task.comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <View style={styles.commentHeader}>
              <Avatar name={comment.authorName} uri={comment.authorAvatarUrl} size={28} />
              <Text style={styles.commentAuthor}>{comment.authorName}</Text>
              <Text style={styles.commentTime}>
                {new Date(comment.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.commentContent}>{comment.content}</Text>
          </View>
        ))}

        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <Pressable
            style={[styles.commentSend, isSending && styles.commentSendDisabled]}
            onPress={handleAddComment}
            disabled={isSending || !commentText.trim()}
          >
            <Text style={styles.commentSendText}>Post</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityLabel: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assigneeName: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  dueDate: {
    fontSize: 15,
    color: '#374151',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  comment: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  commentSend: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
  },
  commentSendDisabled: {
    opacity: 0.5,
  },
  commentSendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
