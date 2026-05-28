import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/EmptyState';
import { AlertMessage, HeroBlock, LoadingBlock, Panel, Pill, SectionTitle } from '../../components/ScreenPrimitives';
import { useOrganizationStore } from '../../stores/organization.store';
import { useTheme } from '../../theme';
import * as departmentsApi from '../../api/departments.api';

type DepartmentWithDepth = departmentsApi.Department & {
  depth: number;
  parentName?: string;
};

function flattenDepartments(
  departments: departmentsApi.Department[],
  parentName?: string,
  depth = 0,
): DepartmentWithDepth[] {
  return departments.flatMap((department) => [
    { ...department, parentName, depth },
    ...flattenDepartments(department.children ?? [], department.name, depth + 1),
  ]);
}

export function DepartmentsScreen() {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const [departments, setDepartments] = useState<departmentsApi.Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentDepartmentId, setParentDepartmentId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const flatDepartments = useMemo(() => flattenDepartments(departments), [departments]);

  const load = useCallback(async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      const res = await departmentsApi.listDepartments(currentOrg.id);
      setDepartments(res);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить отделы.');
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId('');
    setName('');
    setDescription('');
    setParentDepartmentId('');
  };

  const handleSubmit = async () => {
    if (!currentOrg || !name.trim()) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || undefined,
        parentDepartmentId: parentDepartmentId || undefined,
      };
      if (editingId) {
        await departmentsApi.updateDepartment(currentOrg.id, editingId, input);
        setMessage('Отдел обновлен.');
      } else {
        await departmentsApi.createDepartment(currentOrg.id, input);
        setMessage('Отдел создан.');
      }
      resetForm();
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось сохранить отдел.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (department: DepartmentWithDepth) => {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description ?? '');
    setParentDepartmentId(department.parentDepartmentId ?? '');
  };

  const handleDelete = (departmentId: string) => {
    if (!currentOrg) return;
    Alert.alert('Удалить отдел?', 'Структура будет обновлена сразу после удаления.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setError('');
          try {
            await departmentsApi.deleteDepartment(currentOrg.id, departmentId);
            if (editingId === departmentId) resetForm();
            setMessage('Отдел удален.');
            await load();
          } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Не удалось удалить отдел.');
          }
        },
      },
    ]);
  };

  if (!currentOrg) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <EmptyState title="Нет активной организации" description="Выберите рабочее пространство, чтобы настроить отделы." />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={flatDepartments}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <HeroBlock
            kicker="Отделы"
            title="Структура организации без лишнего шума."
            description="Создавайте направления, команды и вложенные отделы так же, как в веб-разделе."
          >
            <Pill label={`${flatDepartments.length} отделов`} tone="primary" />
            <Pill label={currentOrg.name} />
          </HeroBlock>

          <Panel style={styles.form}>
            <SectionTitle>{editingId ? 'Редактирование' : 'Новый отдел'}</SectionTitle>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Название отдела"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.input, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Описание"
              multiline
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.input,
                styles.textarea,
                { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, color: theme.colors.textPrimary },
              ]}
            />
            <Text style={[styles.subhead, { color: theme.colors.textTertiary }]}>Родительский отдел</Text>
            <View style={styles.parentRow}>
              <Pressable
                onPress={() => setParentDepartmentId('')}
                style={[
                  styles.parentChip,
                  {
                    backgroundColor: !parentDepartmentId ? theme.colors.primary : theme.colors.surfaceSoft,
                    borderColor: !parentDepartmentId ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.parentText, { color: !parentDepartmentId ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
                  Без родителя
                </Text>
              </Pressable>
              {flatDepartments
                .filter((department) => department.id !== editingId)
                .map((department) => {
                  const active = parentDepartmentId === department.id;
                  return (
                    <Pressable
                      key={department.id}
                      onPress={() => setParentDepartmentId(department.id)}
                      style={[
                        styles.parentChip,
                        { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft, borderColor: active ? theme.colors.primary : theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.parentText, { color: active ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
                        {'· '.repeat(Math.min(department.depth, 3))}
                        {department.name}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
            {message ? <AlertMessage tone="success">{message}</AlertMessage> : null}
            {error ? <AlertMessage>{error}</AlertMessage> : null}
            <View style={styles.formActions}>
              {editingId ? (
                <Pressable onPress={resetForm} style={[styles.secondaryButton, { borderColor: theme.colors.borderStrong }]}>
                  <Text style={[styles.secondaryText, { color: theme.colors.primary }]}>Отмена</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleSubmit}
                disabled={saving || !name.trim()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.colors.primary, opacity: saving || !name.trim() ? 0.55 : pressed ? 0.82 : 1 },
                ]}
              >
                <Text style={[styles.primaryText, { color: theme.colors.onPrimary }]}>
                  {saving ? 'Сохраняем...' : editingId ? 'Сохранить отдел' : 'Создать отдел'}
                </Text>
              </Pressable>
            </View>
          </Panel>
          {loading ? <LoadingBlock label="Загружаем структуру..." /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Panel style={[styles.departmentCard, { marginLeft: Math.min(item.depth * 12, 36) }]}>
          <View style={styles.departmentTop}>
            <View style={[styles.departmentIcon, { backgroundColor: theme.colors.surfaceSoft }]}>
              <Ionicons name="git-branch-outline" size={19} color={theme.colors.primary} />
            </View>
            <View style={styles.departmentBody}>
              <Text style={[styles.departmentName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.departmentDescription, { color: theme.colors.textSecondary }]}>
                {item.description || 'Описание еще не добавлено.'}
              </Text>
              <Text style={[styles.departmentMeta, { color: theme.colors.textTertiary }]}>
                {item.parentName ? `Внутри: ${item.parentName}` : 'Корневой отдел'} · {item.children?.length ?? 0} подотделов
              </Text>
            </View>
          </View>
          <View style={styles.departmentActions}>
            <Pressable onPress={() => handleEdit(item)} style={[styles.smallButton, { borderColor: theme.colors.borderStrong }]}>
              <Text style={[styles.smallText, { color: theme.colors.primary }]}>Изменить</Text>
            </Pressable>
            <Pressable onPress={() => handleDelete(item.id)} style={[styles.smallButton, { borderColor: theme.colors.error, backgroundColor: `${theme.colors.error}18` }]}>
              <Text style={[styles.smallText, { color: theme.colors.error }]}>Удалить</Text>
            </Pressable>
          </View>
        </Panel>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            title="Пока нет отделов"
            description="Создайте первый отдел, чтобы собрать структуру организации."
            icon={<Ionicons name="git-network-outline" size={54} color={theme.colors.primary} />}
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
  textarea: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  subhead: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  parentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  parentChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  parentText: { fontSize: 12, fontWeight: '800' },
  formActions: { flexDirection: 'row', gap: 8 },
  primaryButton: { flex: 1, height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '800' },
  secondaryButton: { height: 50, borderRadius: 999, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '800' },
  departmentCard: { gap: 12 },
  departmentTop: { flexDirection: 'row', gap: 12 },
  departmentIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  departmentBody: { flex: 1, minWidth: 0 },
  departmentName: { fontSize: 15, fontWeight: '800' },
  departmentDescription: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  departmentMeta: { fontSize: 12, marginTop: 6 },
  departmentActions: { flexDirection: 'row', gap: 8 },
  smallButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  smallText: { fontSize: 12, fontWeight: '800' },
});
