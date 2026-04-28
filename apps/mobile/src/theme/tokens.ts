import { Platform, ViewStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export interface Palette {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  surface: string;
  surfaceStrong: string;
  surfaceSoft: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  onPrimary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;
  overlay: string;
}

export const palette: Record<ThemeMode, Palette> = {
  light: {
    bg: '#f4efe5',
    bgSecondary: '#fbf7ef',
    bgTertiary: '#efe7d8',
    surface: '#ffffff',
    surfaceStrong: '#ffffff',
    surfaceSoft: 'rgba(25,20,10,0.035)',
    primary: '#9f7a3d',
    primaryLight: '#cfaf74',
    primaryDark: '#5d431d',
    onPrimary: '#ffffff',
    secondary: '#168c7c',
    success: '#1e9d68',
    warning: '#d58b22',
    error: '#d46262',
    info: '#3a6dc2',
    textPrimary: '#241b11',
    textSecondary: '#645846',
    textTertiary: '#9b8f7c',
    border: 'rgba(58,39,11,0.12)',
    borderStrong: 'rgba(159,122,61,0.32)',
    overlay: 'rgba(2,4,8,0.58)',
  },
  dark: {
    bg: '#06080d',
    bgSecondary: '#0b1018',
    bgTertiary: '#111826',
    surface: '#0f1521',
    surfaceStrong: '#141c2b',
    surfaceSoft: 'rgba(255,255,255,0.04)',
    primary: '#d4b16a',
    primaryLight: '#f4dda5',
    primaryDark: '#8f6c31',
    onPrimary: '#06080d',
    secondary: '#67c4b0',
    success: '#79d2a4',
    warning: '#f2bc68',
    error: '#f08f8f',
    info: '#86aeea',
    textPrimary: '#f5efe2',
    textSecondary: '#c2bbad',
    textTertiary: '#827d73',
    border: 'rgba(245,239,226,0.12)',
    borderStrong: 'rgba(212,177,106,0.32)',
    overlay: 'rgba(2,4,8,0.74)',
  },
};

export const radius = {
  xs: 8,
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const typography = {
  sansFamily: undefined as string | undefined, // System default
  displayFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  sizes: {
    caption: 11,
    small: 12,
    body: 14,
    bodyLg: 15,
    title: 17,
    titleLg: 20,
    heading: 24,
    display: 28,
    displayLg: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
} as const;

type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const shadows: Record<ThemeMode, { sm: ShadowStyle; md: ShadowStyle; lg: ShadowStyle }> = {
  light: {
    sm: { shadowColor: '#3a270b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
    md: { shadowColor: '#3a270b', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 6 },
    lg: { shadowColor: '#3a270b', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.18, shadowRadius: 44, elevation: 12 },
  },
  dark: {
    sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 2 },
    md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.42, shadowRadius: 28, elevation: 6 },
    lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.5, shadowRadius: 44, elevation: 12 },
  },
};

export const breakpoints = {
  phoneSm: 360,
  phone: 414,
  tablet: 768,
} as const;

export type Theme = {
  mode: ThemeMode;
  colors: Palette;
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  shadows: typeof shadows.light;
};

export function buildTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: palette[mode],
    radius,
    spacing,
    typography,
    shadows: shadows[mode],
  };
}
