import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageBubble } from '../../components/MessageBubble';
import { MessageInput } from '../../components/MessageInput';
import { useAuthStore } from '../../stores/auth.store';
import { useTheme } from '../../theme';
import * as messagesApi from '../../api/messages.api';
import type { ChatStackParamList } from '../../navigation/types';
import type { Message } from '../../api/messages.api';
import { getExistingSocket } from '../../socket/socket';
import { WS_EVENTS } from '../../constants/ws-events';

type Props = NativeStackScreenProps<ChatStackParamList, 'Thread'>;
const REQUEST_TIMEOUT_MS = 15000;

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

export function ThreadScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { chatId, parentMessageId, parentContent } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Тред' });
  }, [navigation]);

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await withTimeout(
        messagesApi.getThreadMessages(parentMessageId),
        REQUEST_TIMEOUT_MS,
        'Loading thread timed out',
      );
      setReplies(data.messages);
    } catch (err) {
      console.error('Failed to fetch thread:', err);
    } finally {
      setLoading(false);
    }
  }, [chatId, parentMessageId]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  useEffect(() => {
    const socket = getExistingSocket();
    if (!socket?.connected) {
      return;
    }

    const handleIncomingMessage = (rawMessage: any) => {
      const message = messagesApi.normalizeMessage(rawMessage);
      if (message.chatId !== chatId || message.parentMessageId !== parentMessageId) {
        return;
      }

      setReplies((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [message, ...prev];
      });
    };

    socket.emit('chat:join', { chatId });
    socket.on(WS_EVENTS.MESSAGE_NEW, handleIncomingMessage);

    return () => {
      socket.off(WS_EVENTS.MESSAGE_NEW, handleIncomingMessage);
    };
  }, [chatId, parentMessageId]);

  const handleSend = useCallback(
    async (text: string) => {
      try {
        const socket = getExistingSocket();
        if (!socket?.connected) {
          throw new Error('Socket is not connected');
        }

        socket.emit(WS_EVENTS.MESSAGE_SEND, {
          chatId,
          content: text,
          parentMessageId,
        });
      } catch (err) {
        console.error('Failed to send reply:', err);
      }
    },
    [chatId, parentMessageId],
  );

  const renderReply = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isOwn = item.senderId === userId;
      const prev = replies[index + 1];
      const showSender = !isOwn && prev?.senderId !== item.senderId;
      return (
        <MessageBubble
          content={item.content}
          senderName={item.senderName}
          createdAt={item.createdAt}
          isOwn={isOwn}
          isEdited={item.isEdited}
          showSender={showSender}
        />
      );
    },
    [userId, replies],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.parent, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.parentLabel, { color: theme.colors.primary }]}>Исходное сообщение</Text>
        <Text style={[styles.parentContent, { color: theme.colors.textPrimary }]} numberOfLines={3}>
          {parentContent}
        </Text>
      </View>

      <View style={[styles.divider, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.dividerText, { color: theme.colors.textTertiary }]}>
          {replies.length} {replies.length === 1 ? 'ответ' : replies.length < 5 ? 'ответа' : 'ответов'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={replies}
          keyExtractor={(item) => item.id}
          renderItem={renderReply}
          inverted
          contentContainerStyle={styles.list}
        />
      )}

      <MessageInput onSend={handleSend} placeholder="Ответ в треде…" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  parent: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  parentLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  parentContent: { fontSize: 14, lineHeight: 20 },
  divider: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 8 },
});
