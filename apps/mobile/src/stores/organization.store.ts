import { create } from 'zustand';
import type { Organization, OrganizationMember } from '../api/organizations.api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './auth.store';
import { useChatStore } from './chat.store';
import { useMessageStore } from './message.store';
import { useFileStore } from './file.store';

interface OrganizationState {
  initializedUserId: string | null;
  pendingChatId: string | null;
  setPendingChatId: (chatId: string | null) => void;
  organizations: Organization[];
  currentOrg: Organization | null;
  members: OrganizationMember[];
  isLoading: boolean;
  setOrganizations: (organizations: Organization[]) => void;
  setCurrentOrg: (organization: Organization | null) => void;
  setMembers: (members: OrganizationMember[]) => void;
  removeMember: (userId: string) => void;
  updateMemberRole: (userId: string, role: OrganizationMember['role']) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  initialize: (userId: string, organizations: Organization[]) => Promise<void>;
}

export const useOrganizationStore = create<OrganizationState>()((set, get) => ({
  initializedUserId: null,
  pendingChatId: null,
  setPendingChatId: (pendingChatId) => set({ pendingChatId }),
  organizations: [],
  currentOrg: null,
  members: [],
  isLoading: false,
  setOrganizations: (organizations) => set({ organizations }),
  setCurrentOrg: (currentOrg) => {
    const userId = useAuthStore.getState().user?.id ?? get().initializedUserId;
    if (userId) void AsyncStorage.setItem(`workspace:${userId}`, currentOrg?.id ?? 'personal').catch(() => undefined);
    if (get().currentOrg?.id !== currentOrg?.id) {
      useChatStore.setState({ chats: [], activeChat: null, totalUnread: 0 });
      set({ currentOrg, members: [] });
    } else set({ currentOrg });
  },
  initialize: async (userId, organizations) => {
    const selected = await AsyncStorage.getItem(`workspace:${userId}`).catch(() => null);
    if (useAuthStore.getState().user?.id !== userId) return;
    set({ initializedUserId: userId, organizations, currentOrg: organizations.find((org) => org.id === selected) ?? null });
  },
  setMembers: (members) => set({ members }),
  removeMember: (userId) =>
    set((state) => ({ members: state.members.filter((member) => member.userId !== userId) })),
  updateMemberRole: (userId, role) =>
    set((state) => ({
      members: state.members.map((member) =>
        member.userId === userId ? { ...member, role } : member,
      ),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => {
    useChatStore.setState({ chats: [], activeChat: null, totalUnread: 0, isLoading: false });
    useMessageStore.setState({ messages: {}, hasMore: {}, cursors: {}, lastSeqByChatId: {} });
    useFileStore.setState({ filesById: {}, inFlight: {} });
    set({ initializedUserId: null, pendingChatId: null, organizations: [], currentOrg: null, members: [], isLoading: false });
  },
}));
