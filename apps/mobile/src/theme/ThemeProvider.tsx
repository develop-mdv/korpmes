import { createContext, ReactNode, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settings.store';
import { buildTheme, Theme, ThemeMode } from './tokens';

export const ThemeContext = createContext<Theme>(buildTheme('light'));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((state) => state.themePreference);

  const mode: ThemeMode = preference === 'auto'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : preference;

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
