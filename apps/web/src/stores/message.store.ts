import { create } from 'zustand';
import { mergeMessages, lastSeq } from './message.utils';

export interface Message {
  id: string;
  seq: number;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'system';
  replyToId?: string;
  reactions: Array<{ emoji: string; userId: string }>;
  isPinned: boolean;
  isEdited: boolean;
  threadCount: number;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

interface MessageState {
  messagesByChatId: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  cursors: Record<string, string | undefined>;
  lastSeqByChatId: Record<string, number>;

  setMessages: (
    chatId: string,
    messages: Message[],
    cursor: string | undefined,
    hasMore: boolean,
  ) => void;
  addMessage: (chatId: string, message: Message) => void;
  editMessage: (chatId: string, messageId: string, content: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  prependMessages: (
    chatId: string,
    messages: Message[],
    cursor: string | undefined,
    hasMore: boolean,
  ) => void;
}

export const useMessageStore = create<MessageState>()((set) => ({
  messagesByChatId: {},
  hasMore: {},
  cursors: {},
  lastSeqByChatId: {},

  setMessages: (chatId, messages, cursor, hasMore) =>
    set((state) => {
      const merged = mergeMessages(state.messagesByChatId[chatId] || [], messages);
      return {
        messagesByChatId: { ...state.messagesByChatId, [chatId]: merged },
        hasMore: { ...state.hasMore, [chatId]: hasMore },
        cursors: { ...state.cursors, [chatId]: cursor },
        lastSeqByChatId: {
          ...state.lastSeqByChatId,
          [chatId]: lastSeq(merged),
        },
      };
    }),

  addMessage: (chatId, message) =>
    set((state) => {
      const merged = mergeMessages(state.messagesByChatId[chatId] || [], [message]);
      return {
        messagesByChatId: { ...state.messagesByChatId, [chatId]: merged },
        lastSeqByChatId: {
          ...state.lastSeqByChatId,
          [chatId]: Math.max(state.lastSeqByChatId[chatId] || 0, message.seq),
        },
      };
    }),

  editMessage: (chatId, messageId, content) =>
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: (state.messagesByChatId[chatId] || []).map((m) =>
          m.id === messageId
            ? { ...m, content, isEdited: true, updatedAt: new Date().toISOString() }
            : m,
        ),
      },
    })),

  deleteMessage: (chatId, messageId) =>
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: (state.messagesByChatId[chatId] || []).filter((m) => m.id !== messageId),
      },
    })),

  prependMessages: (chatId, messages, cursor, hasMore) =>
    set((state) => {
      const merged = mergeMessages(state.messagesByChatId[chatId] || [], messages);
      return {
        messagesByChatId: { ...state.messagesByChatId, [chatId]: merged },
        hasMore: { ...state.hasMore, [chatId]: hasMore },
        cursors: { ...state.cursors, [chatId]: cursor },
        lastSeqByChatId: {
          ...state.lastSeqByChatId,
          [chatId]: lastSeq(merged),
        },
      };
    }),
}));
