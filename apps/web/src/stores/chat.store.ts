import { create } from 'zustand';

export interface ChatMemberInfo {
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  role: string;
}

export interface Chat {
  id: string;
  name: string | null;
  type: 'PERSONAL' | 'GROUP' | 'CHANNEL' | 'PROJECT';
  organizationId: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  members: ChatMemberInfo[];
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  unreadCounts: Record<string, number>;

  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, data: Partial<Chat>) => void;
  removeChat: (id: string) => void;
  setActiveChatId: (id: string | null) => void;
  incrementUnread: (chatId: string) => void;
  resetUnread: (chatId: string) => void;
  updateLastMessage: (chatId: string, message: Chat['lastMessage']) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  chats: [],
  activeChatId: null,
  unreadCounts: {},

  setChats: (chats) => set({ chats }),

  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),

  updateChat: (id, data) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  removeChat: (id) =>
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== id),
      activeChatId: state.activeChatId === id ? null : state.activeChatId,
    })),

  setActiveChatId: (id) => set({ activeChatId: id }),

  incrementUnread: (chatId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1,
      },
    })),

  resetUnread: (chatId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: 0 },
    })),

  updateLastMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() } : c,
      ),
    })),
}));
