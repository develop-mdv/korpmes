import { create } from 'zustand';
import type { Organization } from '../api/organizations.api';

interface OrganizationState {
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  setOrganizations: (organizations: Organization[]) => void;
  setCurrentOrg: (organization: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()((set) => ({
  organizations: [],
  currentOrg: null,
  isLoading: false,
  setOrganizations: (organizations) => set({ organizations }),
  setCurrentOrg: (currentOrg) => set({ currentOrg }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ organizations: [], currentOrg: null, isLoading: false }),
}));
