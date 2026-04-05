import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatListItem } from '../../components/ChatListItem';
import { EmptyState } from '../../components/EmptyState';
import { useChatStore } from '../../stores/chat.store';
import * as chatsApi from '../../api/chats.api';
import type { ChatStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatsList'>;

export function ChatsListScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { chats, setChats, setLoading, isLoading } = useChatStore();

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatsApi.getChats();
      setChats(data);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoading(false);
    }
  }, [setChats, setLoading]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  }, [fetchChats]);

  const filteredChats = searchQuery.trim()
    ? chats.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : chats;

  const handleChatPress = useCallback(
    (chatId: string) => {
      navigation.navigate('ChatView', { chatId });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search chats..."
          placeholderTextColor="#9CA3AF"
        />
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
            onPress={handleChatPress}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No chats yet"
              description="Start a new conversation by tapping the button below"
            />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
    lineHeight: 30,
  },
});
