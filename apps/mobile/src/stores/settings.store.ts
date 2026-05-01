import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'staffhub-settings';

export type ThemePreference = 'auto' | 'light' | 'dark';

interface SettingsState {
  soundEnabled: boolean;
  themePreference: ThemePreference;
  loaded: boolean;
  setSoundEnabled: (v: boolean) => void;
  setThemePreference: (v: ThemePreference) => void;
  load: () => Promise<void>;
}

function persist(state: { soundEnabled: boolean; themePreference: ThemePreference }) {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  soundEnabled: true,
  themePreference: 'auto',
  loaded: false,

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    persist({ soundEnabled, themePreference: get().themePreference });
  },

  setThemePreference: (themePreference) => {
    set({ themePreference });
    persist({ soundEnabled: get().soundEnabled, themePreference });
  },

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const next: Partial<SettingsState> = {};
        if (typeof parsed.soundEnabled === 'boolean') next.soundEnabled = parsed.soundEnabled;
        if (parsed.themePreference === 'auto' || parsed.themePreference === 'light' || parsed.themePreference === 'dark') {
          next.themePreference = parsed.themePreference;
        }
        if (Object.keys(next).length) set(next);
      }
    } catch {
      /* ignore */
    }
    set({ loaded: true });
  },
}));
