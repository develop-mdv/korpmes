import { create } from 'zustand';

interface InviteState {
  pendingToken: string | null;
  setPendingToken: (token: string | null) => void;
}

export const useInviteStore = create<InviteState>((set) => ({
  pendingToken: null,
  setPendingToken: (pendingToken) => set({ pendingToken }),
}));
