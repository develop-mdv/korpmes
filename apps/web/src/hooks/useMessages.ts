import { useEffect, useCallback } from 'react';
import { useMessageStore } from '@/stores/message.store';
import * as messagesApi from '@/api/messages.api';
import { getSocket } from '@/socket/socket';

const EMPTY_MESSAGES: never[] = [];

export function useMessages(chatId: string | undefined) {
  const messagesRaw = useMessageStore((s) => (chatId ? s.messagesByChatId[chatId] : undefined));
  const messages = messagesRaw ?? EMPTY_MESSAGES;
  const hasMore = useMessageStore((s) => (chatId ? s.hasMore[chatId] ?? true : false));
  const cursor = useMessageStore((s) => (chatId ? s.cursors[chatId] : undefined));
  const setMessages = useMessageStore((s) => s.setMessages);
  const prependMessages = useMessageStore((s) => s.prependMessages);

  // Join socket room for this chat + load initial messages
  useEffect(() => {
    if (!chatId) return;

    const socket = getSocket();
    socket.emit('chat:join', { chatId });

    const existing = useMessageStore.getState().messagesByChatId[chatId];
    if (existing && existing.length > 0) return;

    messagesApi.getMessages(chatId).then((res) => {
      setMessages(chatId, res.messages, res.cursor, res.hasMore);
    });
  }, [chatId, setMessages]);

  const loadMore = useCallback(async () => {
    if (!chatId || !hasMore) return;

    const res = await messagesApi.getMessages(chatId, cursor);
    prependMessages(chatId, res.messages, res.cursor, res.hasMore);
  }, [chatId, hasMore, cursor, prependMessages]);

  const sendMessage = useCallback(
    (content: string, replyToId?: string) => {
      if (!chatId) return;
      const socket = getSocket();
      socket.emit('message:send', { chatId, content, replyToId });
    },
    [chatId],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      await messagesApi.editMessage(messageId, content);
    },
    [],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await messagesApi.deleteMessage(messageId);
    },
    [],
  );

  return { messages, hasMore, loadMore, sendMessage, editMessage, deleteMessage };
}
