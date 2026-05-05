import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { Avatar } from '../../components/Avatar';
import { useTheme } from '../../theme';
import { useOrganizationStore } from '../../stores/organization.store';
import { createTask, TaskPriority } from '../../api/tasks.api';
import { getMembers, type OrganizationMember } from '../../api/organizations.api';
import type { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'CreateTask'>;

const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: TaskPriority.LOW, label: 'Низкий' },
  { id: TaskPriority.MEDIUM, label: 'Средний' },
  { id: TaskPriority.HIGH, label: 'Высокий' },
  { id: TaskPriority.URGENT, label: 'Срочный' },
];

function isValidDateInput(value: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function CreateTaskScreen({ navigation }: Props) {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((s) => s.currentOrg);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    setLoadingMembers(true);
    getMembers(currentOrg.id, 1, 100)
      .then((res) => setMembers(res.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [currentOrg]);

  const handleSubmit = async () => {
    if (!currentOrg) return;
    if (!title.trim()) {
      setError('Заголовок обязателен');
      return;
    }
    if (!isValidDateInput(dueDate)) {
      setError('Срок должен быть в формате ГГГГ-ММ-ДД');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        organizationId: currentOrg.id,
        assignedTo: assigneeId ?? undefined,
        dueDate: dueDate || undefined,
        watcherIds: watcherIds.length > 0 ? watcherIds : undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Не удалось создать задачу');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <FormField
        label="Заголовок"
        value={title}
        onChangeText={setTitle}
        placeholder="Например, подготовить отчёт"
        autoFocus
        maxLength={200}
      />
      <View style={{ height: 16 }} />
      <FormField
        label="Описание"
        value={description}
        onChangeText={setDescription}
        placeholder="Контекст и ожидаемый результат"
        multiline
        numberOfLines={4}
        style={{ height: 100, paddingTop: 12 }}
        maxLength={4000}
      />
      <View style={{ height: 16 }} />

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Приоритет</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map((p) => {
          const active = p.id === priority;
          return (
            <Pressable
              key={p.id}
              style={[
                styles.priorityChip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setPriority(p.id)}
            >
              <Text
                style={[
                  styles.priorityChipText,
                  { color: active ? theme.colors.onPrimary : theme.colors.textSecondary },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 16 }} />

      <FormField
        label="Срок (ГГГГ-ММ-ДД)"
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="2026-12-31"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <View style={{ height: 16 }} />

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        Исполнитель {loadingMembers ? '· загружаем...' : ''}
      </Text>
      <View style={styles.assigneeList}>
        <Pressable
          style={[
            styles.assigneeChip,
            {
              backgroundColor: assigneeId === null ? theme.colors.primary : theme.colors.surface,
              borderColor: assigneeId === null ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={() => setAssigneeId(null)}
        >
          <Text style={[styles.assigneeChipText, { color: assigneeId === null ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
            Без исполнителя
          </Text>
        </Pressable>
        {members.map((member) => {
          const active = assigneeId === member.userId;
          const name = `${member.firstName} ${member.lastName}`.trim() || member.email;
          return (
            <Pressable
              key={member.userId}
              style={[
                styles.assigneeRow,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setAssigneeId(member.userId)}
            >
              <Avatar name={name} uri={member.avatar} size={26} />
              <Text style={[styles.assigneeName, { color: active ? theme.colors.onPrimary : theme.colors.textPrimary }]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 16 }} />
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        Наблюдатели ({watcherIds.length})
      </Text>
      <View style={styles.assigneeList}>
        {members.map((member) => {
          const active = watcherIds.includes(member.userId);
          const name = `${member.firstName} ${member.lastName}`.trim() || member.email;
          return (
            <Pressable
              key={`watch-${member.userId}`}
              style={[
                styles.assigneeRow,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() =>
                setWatcherIds((prev) =>
                  prev.includes(member.userId)
                    ? prev.filter((id) => id !== member.userId)
                    : [...prev, member.userId],
                )
              }
            >
              <Avatar name={name} uri={member.avatar} size={26} />
              <Text style={[styles.assigneeName, { color: active ? theme.colors.onPrimary : theme.colors.textPrimary }]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      ) : null}

      <View style={{ height: 24 }} />
      <PrimaryButton label="Создать задачу" onPress={handleSubmit} loading={submitting} />
      <View style={{ height: 12 }} />
      <PrimaryButton label="Отмена" variant="ghost" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priorityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  priorityChipText: { fontSize: 13, fontWeight: '600' },
  assigneeList: { gap: 8 },
  assigneeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, alignSelf: 'flex-start' },
  assigneeChipText: { fontSize: 13, fontWeight: '600' },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  assigneeName: { fontSize: 14, fontWeight: '500' },
  error: { marginTop: 12, fontSize: 13, fontWeight: '500' },
});
