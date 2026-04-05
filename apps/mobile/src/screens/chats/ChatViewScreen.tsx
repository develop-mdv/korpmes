import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageBubble } from '../../components/MessageBubble';
import { MessageInput } from '../../components/MessageInput';
import { EmptyState } from '../../components/EmptyState';
import { useMessageStore } from '../../stores/message.store';
import { useAuthStore } from '../../stores/auth.store';
import * as messagesApi from '../../api/messages.api';
import * as chatsApi from '../../api/chats.api';
import type { ChatStackParamList } from '../../navigation/types';
import type { Message } from '../../api/messages.api';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatView'>;

export function ChatViewScreen({ route, navigation }: Props) {
  const { chatId } = route.params;
  const flatListRef = useRef<FlatList<Message>>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const messages = useMessageStore((state) => state.messages[chatId] || []);
  const hasMore = useMessageStore((state) => state.hasMore[chatId] ?? true);
  const cursor = useMessageStore((state) => state.cursors[chatId]);
  const isLoading = useMessageStore((state) => state.isLoading);
  const { setMessages, appendMessages, addMessage, setLoading } = useMessageStore();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await messagesApi.getMessages(chatId);
      setMessages(chatId, data.messages, data.hasMore, data.nextCursor);
      await chatsApi.markChatAsRead(chatId);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [chatId, setMessages, setLoading]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      setLoading(true);
      const data = await messagesApi.getMessages(chatId, cursor);
      appendMessages(chatId, data.messages, data.hasMore, data.nextCursor);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoading(false);
    }
  }, [chatId, cursor, hasMore, isLoading, appendMessages, setLoading]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      try {
        const message = await messagesApi.sendMessage({ chatId, content: text });
        addMessage(chatId, message);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [chatId, addMessage],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isOwn = item.senderId === userId;
      const prevMessage = messages[index + 1];
      const showSender = !isOwn && prevMessage?.senderId !== item.senderId;

      return (
        <MessageBubble
          content={item.content}
          senderName={item.senderName}
          createdAt={item.createdAt}
          isOwn={isOwn}
          isEdited={item.isEdited}
          showSender={showSender}
          replyCount={item.replyCount}
          onOpenThread={() =>
            navigation.navigate('Thread', {
              chatId,
              parentMessageId: item.id,
              parentContent: item.content,
            })
          }
        />
      );
    },
    [userId, messages, navigation, chatId],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No messages yet"
              description="Send a message to start the conversation"
            />
          ) : null
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} color="#4F46E5" />
          ) : null
        }
      />
      <MessageInput onSend={handleSend} onAttach={() => {}} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
  },
  loader: {
    paddingVertical: 16,
  },
});
