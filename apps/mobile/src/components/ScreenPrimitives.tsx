import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

export function ScreenScroll({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HeroBlock({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Panel style={styles.hero}>
      <Text style={[styles.kicker, { color: theme.colors.textTertiary }]}>{kicker}</Text>
      <Text style={[styles.heroTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      ) : null}
      {children ? <View style={styles.heroMeta}>{children}</View> : null}
    </Panel>
  );
}

export function Pill({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}) {
  const theme = useTheme();
  const color =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'success'
        ? theme.colors.success
        : tone === 'warning'
          ? theme.colors.warning
          : tone === 'error'
            ? theme.colors.error
            : theme.colors.textSecondary;

  return (
    <View style={[styles.pill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function AlertMessage({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'warning';
}) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.colors.success : tone === 'warning' ? theme.colors.warning : theme.colors.error;
  return (
    <View style={[styles.alert, { borderColor: color, backgroundColor: `${color}18` }]}>
      <Text style={[styles.alertText, { color }]}>{children}</Text>
    </View>
  );
}

export function LoadingBlock({ label = 'Загружаем...' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function ActionRow({
  icon,
  title,
  subtitle,
  meta,
  onPress,
  right,
  disabled,
}: {
  icon: IonName;
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  right?: ReactNode;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceStrong,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceSoft }]}>
        <Ionicons name={icon} size={21} color={theme.colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[styles.rowMeta, { color: theme.colors.textTertiary }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} /> : null)}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { padding: 16, gap: 16, paddingBottom: 36 },
  panel: { borderRadius: 22, borderWidth: 1, padding: 18 },
  hero: { gap: 10 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: '800' },
  alert: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  alertText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 34 },
  loadingText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 20, padding: 14 },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSubtitle: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  rowMeta: { fontSize: 12, marginTop: 5 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' },
});
