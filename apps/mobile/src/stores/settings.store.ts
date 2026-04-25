import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'staffhub-settings';

interface SettingsState {
  soundEnabled: boolean;
  loaded: boolean;
  setSoundEnabled: (v: boolean) => void;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  soundEnabled: true,
  loaded: false,

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    AsyncStorage.setItem(KEY, JSON.stringify({ soundEnabled })).catch(() => undefined);
  },

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.soundEnabled === 'boolean') {
          set({ soundEnabled: parsed.soundEnabled });
        }
      }
    } catch {
      /* ignore */
    }
    set({ loaded: true });
  },
}));
