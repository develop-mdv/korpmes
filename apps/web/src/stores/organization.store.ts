import { create } from 'zustand';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  department?: string;
  joinedAt: string;
}

interface OrganizationState {
  organizations: Organization[];
  currentOrg: Organization | null;
  members: OrganizationMember[];

  setOrganizations: (orgs: Organization[]) => void;
  setCurrentOrg: (org: Organization | null) => void;
  setMembers: (members: OrganizationMember[]) => void;
  addMember: (member: OrganizationMember) => void;
  removeMember: (userId: string) => void;
  updateMemberRole: (userId: string, role: OrganizationMember['role']) => void;
}

export const useOrganizationStore = create<OrganizationState>()((set) => ({
  organizations: [],
  currentOrg: null,
  members: [],

  setOrganizations: (organizations) => set({ organizations }),

  setCurrentOrg: (currentOrg) => set({ currentOrg }),

  setMembers: (members) => set({ members }),

  addMember: (member) =>
    set((state) => ({ members: [...state.members, member] })),

  removeMember: (userId) =>
    set((state) => ({
      members: state.members.filter((m) => m.userId !== userId),
    })),

  updateMemberRole: (userId, role) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.userId === userId ? { ...m, role } : m,
      ),
    })),
}));
