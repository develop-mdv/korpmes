import React, { useEffect, useCallback, useRef, useLayoutEffect, useState, useMemo } from 'react';
import {
  Alert,
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Text,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageBubble } from '../../components/MessageBubble';
import { MessageInput } from '../../components/MessageInput';
import { EmptyState } from '../../components/EmptyState';
import { useMessageStore } from '../../stores/message.store';
import { useAuthStore } from '../../stores/auth.store';
import { useChatStore } from '../../stores/chat.store';
import { useCallStore } from '../../stores/call.store';
import { useOrganizationStore } from '../../stores/organization.store';
import { useAttachmentStaging } from '../../hooks/useAttachmentStaging';
import * as messagesApi from '../../api/messages.api';
import * as callsApi from '../../api/calls.api';
import * as chatsApi from '../../api/chats.api';
import type { ChatStackParamList } from '../../navigation/types';
import type { Message } from '../../api/messages.api';
import { getExistingSocket } from '../../socket/socket';
import { WS_EVENTS } from '../../constants/ws-events';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatView'>;
const PAGE_SIZE = 20;
const REQUEST_TIMEOUT_MS = 15000;
const EMPTY_MESSAGES: Message[] = [];

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function ChatViewScreen({ route, navigation }: Props) {
  const { chatId } = route.params;
  const flatListRef = useRef<FlatList<Message>>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));
  const activeCall = useCallStore((state) => state.activeCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const staging = useAttachmentStaging(currentOrg?.id);
  const messagesAsc = useMessageStore((state) => state.messages[chatId] ?? EMPTY_MESSAGES);
  // Store keeps ASC (oldest → newest); FlatList `inverted` expects newest-first.
  const messages = useMemo(() => [...messagesAsc].reverse(), [messagesAsc]);
  const hasMore = useMessageStore((state) => state.hasMore[chatId] ?? true);
  const cursor = useMessageStore((state) => state.cursors[chatId]);
  const setMessages = useMessageStore((state) => state.setMessages);
  const appendMessages = useMessageStore((state) => state.appendMessages);
  const updateChat = useChatStore((state) => state.updateChat);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canStartDirectCall =
    !!chat &&
    chat.type === 'PERSONAL' &&
    !!chat.members.find((member) => member.userId !== userId);

  const handleInitiateCall = useCallback(
    async (type: 'AUDIO' | 'VIDEO') => {
      if (!chat) {
        return;
      }

      if (activeCall) {
        Alert.alert('Call in progress', 'Finish the current call before starting a new one.');
        return;
      }

      if (chat.type !== 'PERSONAL') {
        Alert.alert(
          'Unsupported chat',
          'Mobile currently supports calls only in direct chats.',
        );
        return;
      }

      const otherMember = chat.members.find((member) => member.userId !== userId);
      if (!otherMember) {
        Alert.alert('Call unavailable', 'Could not determine the other participant.');
        return;
      }

      try {
        const call = await callsApi.initiateCall(chatId, type);
        setActiveCall({
          id: call.id,
          chatId,
          type,
          status: 'RINGING',
          participantName: chat.name,
          participantId: otherMember.userId,
          isIncoming: false,
          initiatorId: userId || '',
        });
      } catch (error) {
        console.error('Failed to initiate call:', error);
        Alert.alert('Call failed', 'Could not start the call. Please try again.');
      }
    },
    [activeCall, chat, chatId, setActiveCall, userId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: chat?.name || 'Chat',
      headerRight: canStartDirectCall
        ? () => (
            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerButton}
                onPress={() => {
                  void handleInitiateCall('AUDIO');
                }}
              >
                <Text style={styles.headerButtonText}>Call</Text>
              </Pressable>
              <Pressable
                style={styles.headerButton}
                onPress={() => {
                  void handleInitiateCall('VIDEO');
                }}
              >
                <Text style={styles.headerButtonText}>Video</Text>
              </Pressable>
            </View>
          )
        : undefined,
    });
  }, [canStartDirectCall, chat?.name, handleInitiateCall, navigation]);

  useEffect(() => {
    const socket = getExistingSocket();
    if (!socket?.connected) {
      return;
    }

    socket.emit('chat:join', { chatId });
  }, [chatId]);

  const fetchMessages = useCallback(async () => {
    const existingMessages = useMessageStore.getState().messages[chatId] || [];
    const showFullScreenLoader = existingMessages.length === 0;

    if (showFullScreenLoader) {
      setInitialLoading(true);
    }
    setLoadError(null);

    try {
      const data = await withTimeout(
        messagesApi.getMessages(chatId, undefined, PAGE_SIZE),
        REQUEST_TIMEOUT_MS,
        'Loading messages timed out',
      );
      setMessages(chatId, data.messages, data.hasMore, data.nextCursor);

      // Backend returns ASC (oldest → newest); take the last item as newest.
      const newest = data.messages[data.messages.length - 1];
      if (newest) {
        updateChat(chatId, { unreadCount: 0 });
        chatsApi.markChatAsRead(chatId, newest.id).catch(() => undefined);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setLoadError('Could not load messages. Please try opening the chat again.');
      if (showFullScreenLoader) {
        setMessages(chatId, [], false, undefined);
      }
    } finally {
      if (showFullScreenLoader) {
        setInitialLoading(false);
      }
    }
  }, [chatId, setMessages]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;

    try {
      setLoadingMore(true);
      const data = await withTimeout(
        messagesApi.getMessages(chatId, cursor, PAGE_SIZE),
        REQUEST_TIMEOUT_MS,
        'Loading older messages timed out',
      );
      appendMessages(chatId, data.messages, data.hasMore, data.nextCursor);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [appendMessages, chatId, cursor, hasMore, loadingMore]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      try {
        const socket = getExistingSocket();
        if (!socket?.connected) {
          throw new Error('Socket is not connected');
        }

        const fileIds = staging.getReadyFileIds();
        socket.emit(WS_EVENTS.MESSAGE_SEND, {
          chatId,
          content: text,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        });
        staging.reset();
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [chatId, staging],
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
          attachments={item.attachments}
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
      {initialLoading && messages.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title={loadError ? 'Could not load messages' : 'No messages yet'}
              description={
                loadError || 'Send a message to start the conversation'
              }
            />
          }
          ListFooterComponent={
            hasMore && cursor ? (
              <View style={styles.paginationContainer}>
                {loadingMore ? (
                  <ActivityIndicator style={styles.loader} color="#4F46E5" />
                ) : (
                  <Pressable
                    style={styles.paginationButton}
                    onPress={() => {
                      void loadMore();
                    }}
                  >
                    <Text style={styles.paginationButtonText}>Load older messages</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
        />
      )}
      <MessageInput
        onSend={handleSend}
        onAttach={staging.add}
        stagedFiles={staging.staged}
        onRemoveStaged={staging.remove}
        disableSend={staging.isUploading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  loader: {
    paddingVertical: 16,
  },
  paginationContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  paginationButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
});
