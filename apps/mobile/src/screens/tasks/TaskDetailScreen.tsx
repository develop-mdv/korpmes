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
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore - expo-document-picker types may not resolve until full install
import * as DocumentPicker from 'expo-document-picker';
import { Avatar } from '../../components/Avatar';
import { useTheme } from '../../theme';
import { getExistingSocket } from '../../socket/socket';
import { getMembers, type OrganizationMember } from '../../api/organizations.api';
import { uploadFile } from '../../api/files.api';
import {
  addChecklistItem,
  addComment,
  deleteTask,
  detachFile,
  getAttachments,
  getChecklist,
  getComments,
  getTask,
  removeChecklistItem,
  TaskStatus,
  updateChecklistItem,
  updateTask,
  type ChecklistItem,
  type Task,
  type TaskAttachment,
  type TaskComment,
} from '../../api/tasks.api';
import type { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskDetail'>;

const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: TaskStatus.NEW, label: 'К работе' },
  { id: TaskStatus.IN_PROGRESS, label: 'В работе' },
  { id: TaskStatus.IN_REVIEW, label: 'На проверке' },
  { id: TaskStatus.DONE, label: 'Готово' },
  { id: TaskStatus.CANCELLED, label: 'Отменена' },
];

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'низкий',
  MEDIUM: 'средний',
  HIGH: 'высокий',
  URGENT: 'срочный',
};

export function TaskDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { taskId } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [showWatcherPicker, setShowWatcherPicker] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

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

  const reloadAll = useCallback(async () => {
    try {
      const [t, c, cl, att] = await Promise.all([
        getTask(taskId),
        getComments(taskId),
        getChecklist(taskId),
        getAttachments(taskId),
      ]);
      setTask(t);
      setComments(c);
      setChecklist(cl);
      setAttachments(att);
    } catch (err) {
      console.error('Failed to load task:', err);
    }
  }, [taskId]);

  useEffect(() => {
    setIsLoading(true);
    reloadAll().finally(() => setIsLoading(false));
  }, [reloadAll]);

  useEffect(() => {
    if (!task) return;
    getMembers(task.organizationId, 1, 100)
      .then((res) => setMembers(res.members ?? []))
      .catch(() => setMembers([]));
  }, [task?.organizationId]);

  useEffect(() => {
    if (!task) return;
    const socket = getExistingSocket();
    if (!socket) return;
    socket.emit('org:join', { orgId: task.organizationId });

    const onUpdated = (incoming: Task) => {
      if (incoming.id !== taskId) return;
      reloadAll();
    };
    const onDeleted = (payload: { id: string }) => {
      if (payload.id === taskId) navigation.goBack();
    };

    socket.on('task:updated', onUpdated);
    socket.on('task:deleted', onDeleted);

    return () => {
      socket.off('task:updated', onUpdated);
      socket.off('task:deleted', onDeleted);
    };
  }, [task?.organizationId, taskId, navigation, reloadAll]);

  const handleStatusChange = useCallback(
    async (newStatus: TaskStatus) => {
      if (!task || task.status === newStatus) return;
      const prev = task.status;
      setTask({ ...task, status: newStatus });
      try {
        const updated = await updateTask(taskId, { status: newStatus });
        setTask(updated);
      } catch {
        setTask((p) => (p ? { ...p, status: prev } : p));
        Alert.alert('Ошибка', 'Не удалось обновить статус.');
      }
    },
    [task, taskId],
  );

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    try {
      setIsSending(true);
      const created = await addComment(taskId, commentText.trim());
      setComments((prev) => [...prev, created]);
      setCommentText('');
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить комментарий.');
    } finally {
      setIsSending(false);
    }
  }, [commentText, taskId]);

  const handleAddChecklist = useCallback(async () => {
    if (!checklistDraft.trim()) return;
    try {
      const item = await addChecklistItem(taskId, checklistDraft.trim());
      setChecklist((prev) => [...prev, item]);
      setChecklistDraft('');
    } catch {
      Alert.alert('Ошибка', 'Не удалось добавить пункт.');
    }
  }, [checklistDraft, taskId]);

  const handleToggleChecklist = useCallback(async (item: ChecklistItem) => {
    const next = !item.isDone;
    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: next } : i)));
    try {
      await updateChecklistItem(item.id, { isDone: next });
    } catch {
      setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: item.isDone } : i)));
    }
  }, []);

  const handleRemoveChecklist = useCallback(async (itemId: string) => {
    const prev = checklist;
    setChecklist((p) => p.filter((i) => i.id !== itemId));
    try {
      await removeChecklistItem(itemId);
    } catch {
      setChecklist(prev);
    }
  }, [checklist]);

  const handlePickAttachment = useCallback(async () => {
    if (!task) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingAttachment(true);
      await uploadFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        orgId: task.organizationId,
        taskId: task.id,
      });
      const fresh = await getAttachments(task.id);
      setAttachments(fresh);
    } catch (err: any) {
      Alert.alert('Ошибка', err?.message || 'Не удалось загрузить файл.');
    } finally {
      setUploadingAttachment(false);
    }
  }, [task]);

  const handleDetachAttachment = useCallback(async (fileId: string) => {
    Alert.alert('Открепить файл?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Открепить',
        style: 'destructive',
        onPress: async () => {
          const prev = attachments;
          setAttachments((p) => p.filter((a) => a.id !== fileId));
          try {
            await detachFile(taskId, fileId);
          } catch {
            setAttachments(prev);
          }
        },
      },
    ]);
  }, [attachments, taskId]);

  const handleToggleWatcher = useCallback(async (memberId: string) => {
    if (!task) return;
    const currentIds = (task.watchers ?? []).map((w) => w.id);
    const isWatching = currentIds.includes(memberId);
    const next = isWatching
      ? currentIds.filter((id) => id !== memberId)
      : [...currentIds, memberId];
    try {
      const updated = await updateTask(taskId, { watcherIds: next });
      setTask(updated);
    } catch {
      Alert.alert('Ошибка', 'Не удалось обновить наблюдателей.');
    }
  }, [task, taskId]);

  const handleDelete = useCallback(() => {
    Alert.alert('Удалить задачу?', 'Действие нельзя будет отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(taskId);
            navigation.goBack();
          } catch {
            Alert.alert('Ошибка', 'Не удалось удалить задачу.');
          }
        },
      },
    ]);
  }, [taskId, navigation]);

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

  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.NEW;
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.LOW;
  const assignee = task.assignedToUser;
  const watchers = task.watchers ?? [];
  const watcherIds = watchers.map((w) => w.id);

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

      {assignee && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Исполнитель</Text>
          <View style={styles.assigneeRow}>
            <Avatar
              name={`${assignee.firstName} ${assignee.lastName}`}
              uri={assignee.avatarUrl}
              size={32}
            />
            <Text style={[styles.assigneeName, { color: theme.colors.textPrimary }]}>
              {assignee.firstName} {assignee.lastName}
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
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
            Наблюдатели ({watchers.length})
          </Text>
          <Pressable onPress={() => setShowWatcherPicker((v) => !v)}>
            <Text style={[styles.linkAction, { color: theme.colors.primary }]}>
              {showWatcherPicker ? 'Скрыть' : 'Изменить'}
            </Text>
          </Pressable>
        </View>
        {watchers.length > 0 && (
          <View style={styles.watcherChipRow}>
            {watchers.map((w) => (
              <View key={w.id} style={[styles.watcherChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Avatar name={`${w.firstName} ${w.lastName}`} uri={w.avatarUrl} size={20} />
                <Text style={[styles.watcherText, { color: theme.colors.textPrimary }]}>
                  {w.firstName} {w.lastName}
                </Text>
              </View>
            ))}
          </View>
        )}
        {showWatcherPicker && (
          <View style={styles.watcherList}>
            {members.map((m) => {
              const active = watcherIds.includes(m.userId);
              const name = `${m.firstName} ${m.lastName}`.trim() || m.email;
              return (
                <Pressable
                  key={m.userId}
                  style={[
                    styles.watcherPick,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => handleToggleWatcher(m.userId)}
                >
                  <Avatar name={name} uri={m.avatar} size={22} />
                  <Text style={[styles.watcherPickText, { color: active ? theme.colors.onPrimary : theme.colors.textPrimary }]}>
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
          Чек-лист {checklist.length > 0 && `(${checklist.filter((i) => i.isDone).length}/${checklist.length})`}
        </Text>
        {checklist.map((item) => (
          <View key={item.id} style={styles.checklistRow}>
            <Pressable
              onPress={() => handleToggleChecklist(item)}
              style={[
                styles.checklistBox,
                {
                  backgroundColor: item.isDone ? theme.colors.success : 'transparent',
                  borderColor: item.isDone ? theme.colors.success : theme.colors.border,
                },
              ]}
            >
              {item.isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
            </Pressable>
            <Text
              style={[
                styles.checklistText,
                {
                  color: item.isDone ? theme.colors.textTertiary : theme.colors.textPrimary,
                  textDecorationLine: item.isDone ? 'line-through' : 'none',
                },
              ]}
            >
              {item.title}
            </Text>
            <Pressable onPress={() => handleRemoveChecklist(item.id)}>
              <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
        ))}
        <View style={styles.checklistInputRow}>
          <TextInput
            style={[styles.checklistInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            value={checklistDraft}
            onChangeText={setChecklistDraft}
            placeholder="Новый пункт"
            placeholderTextColor={theme.colors.textTertiary}
            onSubmitEditing={handleAddChecklist}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [
              styles.checklistAdd,
              { backgroundColor: theme.colors.primary, opacity: !checklistDraft.trim() ? 0.5 : pressed ? 0.85 : 1 },
            ]}
            disabled={!checklistDraft.trim()}
            onPress={handleAddChecklist}
          >
            <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
          Вложения {attachments.length > 0 && `(${attachments.length})`}
        </Text>
        {attachments.map((att) => (
          <View
            key={att.id}
            style={[styles.attachment, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name="document-attach-outline" size={20} color={theme.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.attachmentName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {att.originalName}
              </Text>
              <Text style={[styles.attachmentMeta, { color: theme.colors.textTertiary }]}>
                {(att.sizeBytes / 1024).toFixed(1)} KB
              </Text>
            </View>
            <Pressable onPress={() => handleDetachAttachment(att.id)}>
              <Ionicons name="close-circle-outline" size={20} color={theme.colors.error} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={handlePickAttachment}
          disabled={uploadingAttachment}
          style={({ pressed }) => [
            styles.attachButton,
            {
              borderColor: theme.colors.border,
              opacity: uploadingAttachment ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
        >
          {uploadingAttachment ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="attach" size={18} color={theme.colors.primary} />
          )}
          <Text style={[styles.attachButtonText, { color: theme.colors.primary }]}>
            {uploadingAttachment ? 'Загружаем…' : 'Прикрепить файл'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
          Комментарии ({comments.length})
        </Text>
        {comments.map((comment) => {
          const author = comment.user
            ? `${comment.user.firstName} ${comment.user.lastName}`.trim() || comment.user.email
            : 'Пользователь';
          return (
            <View key={comment.id} style={[styles.comment, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.commentHeader}>
                <Avatar name={author} uri={comment.user?.avatarUrl} size={28} />
                <Text style={[styles.commentAuthor, { color: theme.colors.textPrimary }]}>{author}</Text>
                <Text style={[styles.commentTime, { color: theme.colors.textTertiary }]}>
                  {new Date(comment.createdAt).toLocaleDateString('ru-RU')}
                </Text>
              </View>
              <Text style={[styles.commentContent, { color: theme.colors.textPrimary }]}>{comment.content}</Text>
            </View>
          );
        })}

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

      <View style={styles.deleteSection}>
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            {
              borderColor: theme.colors.error,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={handleDelete}
        >
          <Text style={[styles.deleteText, { color: theme.colors.error }]}>Удалить задачу</Text>
        </Pressable>
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10 },
  linkAction: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 15, lineHeight: 22 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assigneeName: { fontSize: 15, fontWeight: '500' },
  dueDate: { fontSize: 15 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  statusOptionText: { fontSize: 12, fontWeight: '600' },
  watcherChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  watcherChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  watcherText: { fontSize: 13, fontWeight: '500' },
  watcherList: { gap: 8, marginTop: 12 },
  watcherPick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  watcherPickText: { fontSize: 14, fontWeight: '500' },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  checklistBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checklistText: { flex: 1, fontSize: 14 },
  checklistInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checklistInput: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  checklistAdd: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  attachmentName: { fontSize: 14, fontWeight: '500' },
  attachmentMeta: { fontSize: 11 },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  attachButtonText: { fontSize: 14, fontWeight: '600' },
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
  deleteSection: { marginTop: 32, alignItems: 'center' },
  deleteButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
  deleteText: { fontSize: 13, fontWeight: '700' },
});
