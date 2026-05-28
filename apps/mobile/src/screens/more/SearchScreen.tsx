import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { ActionRow, AlertMessage, HeroBlock, LoadingBlock, Panel, Pill } from '../../components/ScreenPrimitives';
import { useOrganizationStore } from '../../stores/organization.store';
import { useTheme } from '../../theme';
import * as searchApi from '../../api/search.api';
import type { MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MoreStackParamList, 'Search'>;
type Scope = searchApi.SearchParams['scope'];

const SCOPES: Array<{ id: Scope; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'members', label: 'Люди' },
  { id: 'messages', label: 'Сообщения' },
  { id: 'tasks', label: 'Задачи' },
  { id: 'files', label: 'Файлы' },
];

const TYPE_META: Record<searchApi.SearchResult['type'], { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  member: { label: 'Люди', icon: 'person-outline' },
  message: { label: 'Сообщения', icon: 'chatbubble-outline' },
  task: { label: 'Задачи', icon: 'checkbox-outline' },
  file: { label: 'Файлы', icon: 'document-outline' },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export function SearchScreen({ navigation }: Props) {
  const theme = useTheme();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [results, setResults] = useState<searchApi.SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const grouped = useMemo(() => {
    if (!results) return [];
    const buckets = results.results.reduce<Record<string, searchApi.SearchResult[]>>((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});
    return (['member', 'message', 'task', 'file'] as searchApi.SearchResult['type'][]).flatMap((type) =>
      (buckets[type] ?? []).map((item, index) => ({ ...item, groupTitle: index === 0 ? TYPE_META[type].label : '' })),
    );
  }, [results]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !currentOrg) return;
    setLoading(true);
    setError('');
    try {
      const res = await searchApi.search({ q: query.trim(), scope, orgId: currentOrg.id, limit: 40 });
      setResults(res);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось выполнить поиск');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, query, scope]);

  const handleOpen = useCallback(
    (result: searchApi.SearchResult) => {
      const parent = navigation.getParent() as any;
      if (result.type === 'message' && typeof result.metadata.chatId === 'string') {
        parent?.navigate('ChatsTab', { screen: 'ChatView', params: { chatId: result.metadata.chatId } });
      } else if (result.type === 'task') {
        parent?.navigate('TasksTab', { screen: 'TaskDetail', params: { taskId: result.id } });
      } else if (result.type === 'file') {
        parent?.navigate('FilesTab');
      } else if (result.type === 'member') {
        navigation.navigate('Members');
      }
    },
    [navigation],
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={grouped}
      keyExtractor={(item) => `${item.type}:${item.id}`}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <HeroBlock
            kicker="Навигация"
            title="Поиск, который не заставляет искать."
            description="Повторяет веб-поиск по людям, сообщениям, задачам и файлам внутри текущей организации."
          >
            {currentOrg ? <Pill label={currentOrg.name} tone="primary" /> : <Pill label="Нет организации" tone="warning" />}
            {results ? <Pill label={`Найдено: ${results.total}`} /> : null}
          </HeroBlock>

          <Panel style={styles.searchPanel}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
              <Ionicons name="search-outline" size={19} color={theme.colors.textTertiary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                placeholder="Поиск..."
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.input, { color: theme.colors.textPrimary }]}
                returnKeyType="search"
              />
              <Pressable
                onPress={handleSearch}
                disabled={!query.trim() || !currentOrg || loading}
                style={({ pressed }) => [
                  styles.searchButton,
                  { backgroundColor: theme.colors.primary, opacity: pressed || loading ? 0.75 : 1 },
                ]}
              >
                <Ionicons name="arrow-forward" size={18} color={theme.colors.onPrimary} />
              </Pressable>
            </View>

            <View style={styles.scopeRow}>
              {SCOPES.map((item) => {
                const active = scope === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setScope(item.id)}
                    style={[
                      styles.scopeChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.scopeText, { color: active ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Panel>
          {error ? <AlertMessage>{error}</AlertMessage> : null}
          {loading ? <LoadingBlock label="Ищем..." /> : null}
        </View>
      }
      renderItem={({ item }) => {
        const meta = TYPE_META[item.type];
        return (
          <View style={styles.resultWrap}>
            {item.groupTitle ? <Text style={[styles.groupTitle, { color: theme.colors.textTertiary }]}>{item.groupTitle}</Text> : null}
            <ActionRow
              icon={meta.icon}
              title={item.title}
              subtitle={item.snippet}
              meta={formatDate(item.createdAt)}
              onPress={() => handleOpen(item)}
              right={item.type === 'member' ? <Avatar name={item.title} size={34} /> : undefined}
            />
          </View>
        );
      }}
      ListEmptyComponent={
        !loading && results ? (
          <EmptyState
            title="Ничего не найдено"
            description="Попробуйте другое слово, фамилию или более широкий фильтр."
            icon={<Ionicons name="search-outline" size={54} color={theme.colors.primary} />}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36 },
  header: { gap: 12, marginBottom: 12 },
  searchPanel: { gap: 12 },
  searchBox: { minHeight: 50, borderRadius: 18, borderWidth: 1, paddingLeft: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minHeight: 50, fontSize: 15 },
  searchButton: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scopeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  scopeText: { fontSize: 12, fontWeight: '800' },
  resultWrap: { gap: 8, marginBottom: 10 },
  groupTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase', marginLeft: 4 },
});
