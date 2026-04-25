import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  soundEnabled: boolean;
  desktopNotifsEnabled: boolean;
  titleFlashEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  setDesktopNotifsEnabled: (v: boolean) => void;
  setTitleFlashEnabled: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      desktopNotifsEnabled: true,
      titleFlashEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setDesktopNotifsEnabled: (desktopNotifsEnabled) => set({ desktopNotifsEnabled }),
      setTitleFlashEnabled: (titleFlashEnabled) => set({ titleFlashEnabled }),
    }),
    { name: 'staffhub-settings' },
  ),
);
