import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/EmptyState';
import { AlertMessage, HeroBlock, LoadingBlock, Panel, Pill, SectionTitle } from '../../components/ScreenPrimitives';
import { useOrganizationStore } from '../../stores/organization.store';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../theme';
import * as auditApi from '../../api/audit.api';

const LIMIT = 50;

function memberNameById(members: ReturnType<typeof useOrganizationStore.getState>['members'], userId: string): string {
  const member = members.find((item) => item.userId === userId);
  return member ? `${member.firstName} ${member.lastName}`.trim() || member.email : userId;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let i = 0;

  for (; i + 2 < bytes.length; i += 3) {
    output += chars[bytes[i] >> 2];
    output += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    output += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    output += chars[bytes[i + 2] & 63];
  }

  if (i < bytes.length) {
    output += chars[bytes[i] >> 2];
    if (i === bytes.length - 1) {
      output += chars[(bytes[i] & 3) << 4];
      output += '==';
    } else {
      output += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      output += chars[(bytes[i + 1] & 15) << 2];
      output += '=';
    }
  }

  return output;
}

export function AuditScreen() {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const members = useOrganizationStore((state) => state.members);
  const { has } = usePermissions();
  const [logs, setLogs] = useState<auditApi.AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const canViewAudit = has('ORG_VIEW_AUDIT');

  const load = useCallback(async () => {
    if (!currentOrg || !canViewAudit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await auditApi.getAuditLogs({
        orgId: currentOrg.id,
        page,
        limit: LIMIT,
        action: action.trim() || undefined,
        q: query.trim() || undefined,
      });
      setLogs(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить журнал аудита.');
      setLogs([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [action, canViewAudit, currentOrg, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApply = () => {
    setPage(1);
    void load();
  };

  const handleExport = async () => {
    if (!currentOrg) return;
    setExporting(true);
    setError('');
    try {
      const buffer = await auditApi.exportAuditLogs({
        orgId: currentOrg.id,
        action: action.trim() || undefined,
        q: query.trim() || undefined,
      });
      const fileUri = `${FileSystem.documentDirectory}audit-${currentOrg.id}-${new Date().toISOString().slice(0, 10)}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, arrayBufferToBase64(buffer), {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Экспорт аудита' });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось экспортировать журнал.');
    } finally {
      setExporting(false);
    }
  };

  if (!currentOrg) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <EmptyState title="Нет активной организации" description="Выберите пространство, чтобы открыть аудит." />
      </View>
    );
  }

  if (!canViewAudit) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <EmptyState
          title="Аудит недоступен"
          description="Для просмотра журнала нужна роль с правом ORG_VIEW_AUDIT."
          icon={<Ionicons name="shield-outline" size={54} color={theme.colors.primary} />}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={logs}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <HeroBlock
            kicker="Безопасность"
            title="Журнал аудита."
            description="Прозрачная история действий в организации: входы, сообщения, файлы, задачи и изменения доступа."
          >
            <Pill label={`Событий: ${total}`} tone="primary" />
            <Pill label={`Страница: ${page}/${pages}`} />
          </HeroBlock>

          <Panel style={styles.filters}>
            <SectionTitle>Фильтры</SectionTitle>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Поиск по email, entity id или действию"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.input, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
            <TextInput
              value={action}
              onChangeText={setAction}
              placeholder="Действие, например MESSAGE"
              autoCapitalize="characters"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.input, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
            <View style={styles.filterActions}>
              <Pressable onPress={handleApply} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.primaryText, { color: theme.colors.onPrimary }]}>Применить</Text>
              </Pressable>
              <Pressable
                onPress={handleExport}
                disabled={exporting}
                style={[styles.secondaryButton, { borderColor: theme.colors.borderStrong, opacity: exporting ? 0.55 : 1 }]}
              >
                <Text style={[styles.secondaryText, { color: theme.colors.primary }]}>
                  {exporting ? 'Экспорт...' : 'CSV'}
                </Text>
              </Pressable>
            </View>
          </Panel>
          {error ? <AlertMessage>{error}</AlertMessage> : null}
          {loading ? <LoadingBlock label="Загружаем аудит..." /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Panel style={styles.logCard}>
          <View style={styles.logTop}>
            <View style={[styles.logIcon, { backgroundColor: theme.colors.surfaceSoft }]}>
              <Ionicons name="document-text-outline" size={19} color={theme.colors.primary} />
            </View>
            <View style={styles.logBody}>
              <Text style={[styles.logAction, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {item.action}
              </Text>
              <Text style={[styles.logUser, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {memberNameById(members, item.userId)} · {item.userEmail}
              </Text>
              <Text style={[styles.logMeta, { color: theme.colors.textTertiary }]}>
                {new Date(item.createdAt).toLocaleString('ru-RU')}
                {item.entityType ? ` · ${item.entityType}` : ''}
                {item.entityId ? ` · ${item.entityId}` : ''}
              </Text>
            </View>
          </View>
          {item.metadata ? (
            <Text style={[styles.metadata, { color: theme.colors.textSecondary }]} numberOfLines={4}>
              {JSON.stringify(item.metadata)}
            </Text>
          ) : null}
        </Panel>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListFooterComponent={
        pages > 1 ? (
          <View style={styles.pagination}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((value) => Math.max(1, value - 1))}
              style={[styles.pageButton, { borderColor: theme.colors.borderStrong, opacity: page <= 1 ? 0.45 : 1 }]}
            >
              <Text style={[styles.pageText, { color: theme.colors.primary }]}>Назад</Text>
            </Pressable>
            <Pill label={`${page}/${pages}`} />
            <Pressable
              disabled={page >= pages}
              onPress={() => setPage((value) => Math.min(pages, value + 1))}
              style={[styles.pageButton, { borderColor: theme.colors.borderStrong, opacity: page >= pages ? 0.45 : 1 }]}
            >
              <Text style={[styles.pageText, { color: theme.colors.primary }]}>Вперед</Text>
            </Pressable>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            title="Событий пока нет"
            description="Активность организации появится здесь после первых действий команды."
            icon={<Ionicons name="shield-checkmark-outline" size={54} color={theme.colors.primary} />}
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
  filters: { gap: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, fontSize: 14 },
  filterActions: { flexDirection: 'row', gap: 8 },
  primaryButton: { flex: 1, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '800' },
  secondaryButton: { width: 86, height: 48, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '800' },
  logCard: { gap: 12 },
  logTop: { flexDirection: 'row', gap: 12 },
  logIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logBody: { flex: 1, minWidth: 0 },
  logAction: { fontSize: 14, fontWeight: '800' },
  logUser: { fontSize: 13, marginTop: 3 },
  logMeta: { fontSize: 12, marginTop: 5 },
  metadata: { fontSize: 12, lineHeight: 17 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 },
  pageButton: { minWidth: 86, height: 42, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageText: { fontSize: 13, fontWeight: '800' },
});
