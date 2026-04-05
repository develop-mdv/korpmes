import { create } from 'zustand';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'file' | 'system';
  replyToId?: string;
  reactions: Array<{ emoji: string; userId: string }>;
  isPinned: boolean;
  isEdited: boolean;
  threadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MessageState {
  messagesByChatId: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  cursors: Record<string, string | undefined>;

  setMessages: (chatId: string, messages: Message[], cursor: string | undefined, hasMore: boolean) => void;
  addMessage: (chatId: string, message: Message) => void;
  editMessage: (chatId: string, messageId: string, content: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  prependMessages: (chatId: string, messages: Message[], cursor: string | undefined, hasMore: boolean) => void;
}

export const useMessageStore = create<MessageState>()((set) => ({
  messagesByChatId: {},
  hasMore: {},
  cursors: {},

  setMessages: (chatId, messages, cursor, hasMore) =>
    set((state) => ({
      messagesByChatId: { ...state.messagesByChatId, [chatId]: messages },
      hasMore: { ...state.hasMore, [chatId]: hasMore },
      cursors: { ...state.cursors, [chatId]: cursor },
    })),

  addMessage: (chatId, message) =>
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: [...(state.messagesByChatId[chatId] || []), message],
      },
    })),

  editMessage: (chatId, messageId, content) =>
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: (state.messagesByChatId[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, content, isEdited: true, updatedAt: new Date().toISOString() } : m,
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
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: [...messages, ...(state.messagesByChatId[chatId] || [])],
      },
      hasMore: { ...state.hasMore, [chatId]: hasMore },
      cursors: { ...state.cursors, [chatId]: cursor },
    })),
}));
