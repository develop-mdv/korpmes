import { create } from 'zustand';
import type { Message } from '../api/messages.api';

interface MessageState {
  messages: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  cursors: Record<string, string | undefined>;
  isLoading: boolean;
  setMessages: (chatId: string, messages: Message[], hasMore: boolean, cursor?: string) => void;
  appendMessages: (chatId: string, messages: Message[], hasMore: boolean, cursor?: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  setLoading: (loading: boolean) => void;
  clearChat: (chatId: string) => void;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  messages: {},
  hasMore: {},
  cursors: {},
  isLoading: false,
  setMessages: (chatId, messages, hasMore, cursor) => {
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
      hasMore: { ...state.hasMore, [chatId]: hasMore },
      cursors: { ...state.cursors, [chatId]: cursor },
    }));
  },
  appendMessages: (chatId, newMessages, hasMore, cursor) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), ...newMessages],
      },
      hasMore: { ...state.hasMore, [chatId]: hasMore },
      cursors: { ...state.cursors, [chatId]: cursor },
    }));
  },
  addMessage: (chatId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [message, ...(state.messages[chatId] || [])],
      },
    }));
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
