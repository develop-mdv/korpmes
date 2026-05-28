import { create } from 'zustand';
import type { Organization, OrganizationMember } from '../api/organizations.api';

interface OrganizationState {
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
}

export const useOrganizationStore = create<OrganizationState>()((set) => ({
  organizations: [],
  currentOrg: null,
  members: [],
  isLoading: false,
  setOrganizations: (organizations) => set({ organizations }),
  setCurrentOrg: (currentOrg) => set({ currentOrg }),
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
  reset: () => set({ organizations: [], currentOrg: null, members: [], isLoading: false }),
}));
