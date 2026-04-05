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
import * as messagesApi from '../../api/messages.api';
import type { ChatStackParamList } from '../../navigation/types';
import type { Message } from '../../api/messages.api';

type Props = NativeStackScreenProps<ChatStackParamList, 'Thread'>;

export function ThreadScreen({ route, navigation }: Props) {
  const { chatId, parentMessageId, parentContent } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Thread' });
  }, [navigation]);

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messagesApi.getThreadMessages(chatId, parentMessageId);
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

  const handleSend = useCallback(
    async (text: string) => {
      try {
        const msg = await messagesApi.sendThreadReply(chatId, parentMessageId, text);
        setReplies((prev) => [msg, ...prev]);
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Parent message */}
      <View style={styles.parent}>
        <Text style={styles.parentLabel}>Original message</Text>
        <Text style={styles.parentContent} numberOfLines={3}>{parentContent}</Text>
      </View>

      <View style={styles.divider}>
        <Text style={styles.dividerText}>
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4F46E5" />
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

      <MessageInput onSend={handleSend} onAttach={() => {}} placeholder="Reply in thread…" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  parent: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  parentLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 },
  parentContent: { fontSize: 14, color: '#374151', lineHeight: 20 },
  divider: { padding: '8px 16px' as any, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 8 },
});
