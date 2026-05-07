import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../../components/Avatar';
import { useAuthStore } from '../../stores/auth.store';
import { useSettingsStore, type ThemePreference } from '../../stores/settings.store';
import { useTheme } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/types';

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { id: 'auto', label: 'Авто', icon: 'phone-portrait-outline' },
  { id: 'light', label: 'Светлая', icon: 'sunny-outline' },
  { id: 'dark', label: 'Тёмная', icon: 'moon-outline' },
];

export function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { user, logout } = useAuthStore();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const twoFactorEnabled = !!user?.twoFactorEnabled;

  const handleLogout = () => {
    Alert.alert('Выйти', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.sm }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Профиль</Text>
        <View style={styles.profileCard}>
          <Avatar name={user ? `${user.firstName} ${user.lastName}` : 'U'} size={64} online />
          <View style={styles.profileInfo}>
            <Text
              style={[styles.profileName, { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily }]}
            >
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
            {(user as any)?.position && (
              <Text style={[styles.profilePosition, { color: theme.colors.textTertiary }]}>{(user as any).position}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={[styles.editButton, { borderColor: theme.colors.borderStrong }]}>
          <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>Редактировать профиль</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.sm }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Тема</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((option) => {
            const active = themePreference === option.id;
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setThemePreference(option.id)}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: active ? theme.colors.onPrimary : theme.colors.textSecondary },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.sm }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Уведомления</Text>
        <SettingRow
          theme={theme}
          label="Звук и вибрация"
          value={soundEnabled}
          onValueChange={setSoundEnabled}
        />
        <SettingRow theme={theme} label="Push-уведомления" value={pushEnabled} onValueChange={setPushEnabled} />
        <SettingRow theme={theme} label="Email-уведомления" value={emailEnabled} onValueChange={setEmailEnabled} last />
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.sm }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>Безопасность</Text>
        <Pressable
          onPress={() =>
            navigation.navigate(twoFactorEnabled ? 'TwoFactorDisable' : 'TwoFactorSetup')
          }
          style={styles.twoFactorRow}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
              Двухфакторная защита
            </Text>
            <Text style={[styles.twoFactorHint, { color: theme.colors.textTertiary }]}>
              {twoFactorEnabled
                ? 'Включена. Нажмите, чтобы отключить.'
                : 'Выключена. Нажмите, чтобы включить.'}
            </Text>
          </View>
          <Text
            style={[
              styles.twoFactorStatus,
              { color: twoFactorEnabled ? theme.colors.primary : theme.colors.textTertiary },
            ]}
          >
            {twoFactorEnabled ? 'Вкл' : 'Выкл'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        </Pressable>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: 'rgba(212,98,98,0.14)', borderColor: theme.colors.error }]}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
        <Text style={[styles.logoutText, { color: theme.colors.error }]}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingRow({
  theme,
  label,
  value,
  onValueChange,
  last,
}: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        thumbColor={value ? theme.colors.onPrimary : theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 16, paddingTop: 16 },
  section: { borderRadius: 22, padding: 18, borderWidth: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700' },
  profileEmail: { fontSize: 14, marginTop: 2 },
  profilePosition: { fontSize: 13, marginTop: 2 },
  editButton: { marginTop: 14, paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  editButtonText: { fontSize: 13, fontWeight: '700' },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  themeOptionText: { fontSize: 12, fontWeight: '600' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingLabel: { fontSize: 15 },
  twoFactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  twoFactorHint: { fontSize: 13, marginTop: 2 },
  twoFactorStatus: { fontSize: 13, fontWeight: '700' },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
