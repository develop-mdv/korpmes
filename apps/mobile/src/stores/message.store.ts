import { create } from 'zustand';
import type { Message } from '../api/messages.api';
import { mergeMessages, lastSeq } from './message.utils';

interface MessageState {
  messages: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  cursors: Record<string, string | undefined>;
  lastSeqByChatId: Record<string, number>;
  isLoading: boolean;
  setMessages: (chatId: string, messages: Message[], hasMore: boolean, cursor?: string) => void;
  appendMessages: (chatId: string, messages: Message[], hasMore: boolean, cursor?: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  setLoading: (loading: boolean) => void;
  clearChat: (chatId: string) => void;
}

export const useMessageStore = create<MessageState>()((set) => ({
  messages: {},
  hasMore: {},
  cursors: {},
  lastSeqByChatId: {},
  isLoading: false,
  setMessages: (chatId, messages, hasMore, cursor) => {
    set((state) => {
      const merged = mergeMessages(state.messages[chatId] || [], messages);
      return {
        messages: { ...state.messages, [chatId]: merged },
        hasMore: { ...state.hasMore, [chatId]: hasMore },
        cursors: { ...state.cursors, [chatId]: cursor },
        lastSeqByChatId: {
          ...state.lastSeqByChatId,
          [chatId]: lastSeq(merged),
        },
      };
    });
  },
  appendMessages: (chatId, newMessages, hasMore, cursor) => {
    set((state) => {
      const merged = mergeMessages(state.messages[chatId] || [], newMessages);
      return {
        messages: { ...state.messages, [chatId]: merged },
        hasMore: { ...state.hasMore, [chatId]: hasMore },
        cursors: { ...state.cursors, [chatId]: cursor },
        lastSeqByChatId: {
          ...state.lastSeqByChatId,
          [chatId]: lastSeq(merged),
        },
      };
    });
  },
  addMessage: (chatId, message) => {
    set((state) => {
      const merged = mergeMessages(state.messages[chatId] || [], [message]);
      return {
        messages: { ...state.messages, [chatId]: merged },
        lastSeqByChatId: {
          ...state.lastSeqByChatId,
          [chatId]: Math.max(state.lastSeqByChatId[chatId] || 0, message.seq || 0),
        },
      };
    });
  },
  updateMessage: (chatId, messageId, updates) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m,
        ),
      },
    }));
  },
  removeMessage: (chatId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter((m) => m.id !== messageId),
      },
    }));
  },
  setLoading: (isLoading) => set({ isLoading }),
  clearChat: (chatId) => {
    set((state) => {
      const { [chatId]: _, ...rest } = state.messages;
      return { messages: rest };
    });
  },
}));
