import { create } from 'zustand';
import type { Chat } from '../api/chats.api';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  isLoading: boolean;
  totalUnread: number;
  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  setLoading: (loading: boolean) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  addChat: (chat: Chat) => void;
  removeChat: (chatId: string) => void;
  computeTotalUnread: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  chats: [],
  activeChat: null,
  isLoading: false,
  totalUnread: 0,
  setChats: (chats) => {
    const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);
    set({ chats, totalUnread });
  },
  setActiveChat: (activeChat) => set({ activeChat }),
  setLoading: (isLoading) => set({ isLoading }),
  updateChat: (chatId, updates) => {
    const chats = get().chats.map((c) =>
      c.id === chatId ? { ...c, ...updates } : c,
    );
    const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);
    set({ chats, totalUnread });
  },
  addChat: (chat) => {
    const chats = [chat, ...get().chats];
    const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);
    set({ chats, totalUnread });
  },
  removeChat: (chatId) => {
    const chats = get().chats.filter((c) => c.id !== chatId);
    const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);
    set({ chats, totalUnread });
  },
  computeTotalUnread: () => {
    const totalUnread = get().chats.reduce((sum, c) => sum + c.unreadCount, 0);
    set({ totalUnread });
  },
}));
