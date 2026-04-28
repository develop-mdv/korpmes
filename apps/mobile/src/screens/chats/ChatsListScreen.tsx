import React, { useEffect, useState, useCallback } from 'react';
import { View, TextInput, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatListItem } from '../../components/ChatListItem';
import { EmptyState } from '../../components/EmptyState';
import { useChatStore } from '../../stores/chat.store';
import { useOrganizationStore } from '../../stores/organization.store';
import * as chatsApi from '../../api/chats.api';
import { useTheme } from '../../theme';
import type { ChatStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatsList'>;

export function ChatsListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { chats, setChats, setLoading, isLoading } = useChatStore();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizations = useOrganizationStore((state) => state.organizations);
  const isOrganizationLoading = useOrganizationStore((state) => state.isLoading);

  const fetchChats = useCallback(async () => {
    if (!currentOrg?.id) {
      setChats([]);
      return;
    }

    try {
      setLoading(true);
      const data = await chatsApi.getChats(currentOrg.id);
      setChats(data);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id, setChats, setLoading]);

  useEffect(() => {
    if (currentOrg?.id) {
      void fetchChats();
      return;
    }
    if (!isOrganizationLoading) {
      setChats([]);
      setLoading(false);
    }
  }, [currentOrg?.id, fetchChats, isOrganizationLoading, setChats, setLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  }, [fetchChats]);

  const filteredChats = searchQuery.trim()
    ? chats.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  const handleChatPress = useCallback(
    (chatId: string) => {
      navigation.navigate('ChatView', { chatId });
    },
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.searchContainer, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Поиск чатов…"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatListItem
            id={item.id}
            name={item.name}
            avatarUrl={item.avatarUrl}
            lastMessage={item.lastMessage?.content}
            lastMessageTime={item.lastMessage?.createdAt}
            unreadCount={item.unreadCount}
            isSelf={item.isSelf}
            onPress={handleChatPress}
          />
        )}
        ListEmptyComponent={
          !isLoading && !isOrganizationLoading ? (
            <EmptyState
              title={organizations.length > 0 ? 'Пока нет чатов' : 'Нет рабочего пространства'}
              description={
                organizations.length > 0
                  ? 'Начните новый диалог, нажав кнопку ниже.'
                  : 'Ваш аккаунт пока не привязан к рабочему пространству.'
              }
              icon={<Ionicons name="chatbubble-ellipses-outline" size={56} color={theme.colors.primary} />}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            transform: [{ translateY: pressed ? 1 : 0 }],
            ...theme.shadows.lg,
          },
        ]}
        onPress={() => navigation.navigate('NewChat')}
      >
        <Ionicons name="add" size={26} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchWrap: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
