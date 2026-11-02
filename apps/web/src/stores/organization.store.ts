import { create } from 'zustand';
import { useChatStore } from './chat.store';
import { useMessageStore } from './message.store';
import { useFileStore } from './file.store';
import { useAuthStore } from './auth.store';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export type OrgRoleRaw = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'GUEST';

export interface OrganizationMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  roleRaw?: OrgRoleRaw;
  department?: string;
  joinedAt: string;
}

interface OrganizationState {
  initializedUserId: string | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  members: OrganizationMember[];

  setOrganizations: (orgs: Organization[]) => void;
  setCurrentOrg: (org: Organization | null) => void;
  setMembers: (members: OrganizationMember[]) => void;
  addMember: (member: OrganizationMember) => void;
  removeMember: (userId: string) => void;
  updateMemberRole: (userId: string, role: OrganizationMember['role']) => void;
  initialize: (userId: string, orgs: Organization[]) => void;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()((set, get) => ({
  initializedUserId: null,
  organizations: [],
  currentOrg: null,
  members: [],

  setOrganizations: (organizations) => set({ organizations }),

  setCurrentOrg: (currentOrg) => {
    const userId = useAuthStore.getState().user?.id ?? get().initializedUserId;
    if (userId) {
      try { localStorage.setItem(`workspace:${userId}`, currentOrg?.id ?? 'personal'); } catch { /* Storage can be disabled. */ }
    }
    if (get().currentOrg?.id !== currentOrg?.id) {
      useChatStore.setState({ chats: [], activeChatId: null, unreadCounts: {} });
      set({ currentOrg, members: [] });
    } else set({ currentOrg });
  },

  initialize: (userId, organizations) => {
    let selected: string | null = null;
    try { selected = localStorage.getItem(`workspace:${userId}`); } catch { /* Default to personal. */ }
    set({ initializedUserId: userId, organizations, currentOrg: organizations.find((org) => org.id === selected) ?? null, members: [] });
  },
  reset: () => {
    useChatStore.setState({ chats: [], activeChatId: null, unreadCounts: {} });
    useMessageStore.setState({ messagesByChatId: {}, hasMore: {}, cursors: {}, lastSeqByChatId: {} });
    useFileStore.setState({ filesById: {}, inFlight: {} });
    set({ initializedUserId: null, organizations: [], currentOrg: null, members: [] });
  },

  setMembers: (members) => set({ members: Array.isArray(members) ? members : [] }),

  addMember: (member) =>
    set((state) => ({ members: [...(state.members ?? []), member] })),

  removeMember: (userId) =>
    set((state) => ({
      members: (state.members ?? []).filter((m) => m.userId !== userId),
    })),

  updateMemberRole: (userId, role) =>
    set((state) => ({
      members: (state.members ?? []).map((m) =>
        m.userId === userId ? { ...m, role } : m,
      ),
    })),
}));
