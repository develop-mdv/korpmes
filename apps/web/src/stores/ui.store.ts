import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type RightPanelContent = 'info' | 'members' | 'files' | 'tasks' | null;

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  rightPanelOpen: boolean;
  rightPanelContent: RightPanelContent;

  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  openRightPanel: (content: RightPanelContent) => void;
  closeRightPanel: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      rightPanelOpen: false,
      rightPanelContent: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      openRightPanel: (content) =>
        set({ rightPanelOpen: true, rightPanelContent: content }),

      closeRightPanel: () =>
        set({ rightPanelOpen: false, rightPanelContent: null }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    },
  ),
);
