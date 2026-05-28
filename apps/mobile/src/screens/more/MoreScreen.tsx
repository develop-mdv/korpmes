import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../../components/Avatar';
import { ActionRow, HeroBlock, Panel, Pill, ScreenScroll, SectionTitle } from '../../components/ScreenPrimitives';
import { useAuthStore } from '../../stores/auth.store';
import { useOrganizationStore } from '../../stores/organization.store';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../theme';
import * as notificationsApi from '../../api/notifications.api';
import type { MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;

export function MoreScreen({ navigation }: Props) {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const organizations = useOrganizationStore((state) => state.organizations);
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const { has } = usePermissions();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.count);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadUnread();
    });
    void loadUnread();
    return unsubscribe;
  }, [loadUnread, navigation]);

  const menuItems = useMemo(
    () => [
      {
        key: 'notifications',
        title: 'Уведомления',
        subtitle: 'Сообщения, задачи, звонки и системные события',
        icon: 'notifications-outline' as const,
        onPress: () => navigation.navigate('Notifications'),
        badge: unreadCount > 0 ? String(unreadCount) : undefined,
      },
      {
        key: 'search',
        title: 'Поиск',
        subtitle: 'Люди, сообщения, задачи и файлы в одном месте',
        icon: 'search-outline' as const,
        onPress: () => navigation.navigate('Search'),
      },
      {
        key: 'organization',
        title: 'Организация',
        subtitle: currentOrg ? `${currentOrg.memberCount} участников` : 'Рабочее пространство не выбрано',
        icon: 'business-outline' as const,
        onPress: () => navigation.navigate('OrganizationHome'),
      },
      {
        key: 'audit',
        title: 'Аудит',
        subtitle: 'Журнал действий и событий безопасности',
        icon: 'shield-checkmark-outline' as const,
        onPress: () => navigation.navigate('Audit'),
        hidden: !has('ORG_VIEW_AUDIT'),
      },
      {
        key: 'settings',
        title: 'Настройки',
        subtitle: 'Профиль, тема, уведомления и безопасность',
        icon: 'settings-outline' as const,
        onPress: () => navigation.navigate('SettingsFlow'),
      },
    ],
    [currentOrg, has, navigation, unreadCount],
  );

  return (
    <ScreenScroll>
      <HeroBlock
        kicker="Навигация"
        title="Все разделы StaffHub на телефоне."
        description="Здесь собран мобильный аналог веб-сайдбара: уведомления, поиск, организация, аудит и настройки."
      >
        {currentOrg ? <Pill label={currentOrg.name} tone="primary" /> : <Pill label="Нет организации" tone="warning" />}
        {unreadCount > 0 ? <Pill label={`Новых: ${unreadCount}`} tone="error" /> : <Pill label="Уведомления прочитаны" />}
      </HeroBlock>

      <Panel>
        <SectionTitle>Профиль</SectionTitle>
        <View style={styles.profileRow}>
          <Avatar name={user ? `${user.firstName} ${user.lastName}` : 'StaffHub'} uri={user?.avatarUrl} size={54} online />
          <View style={styles.profileBody}>
            <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
              {user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Участник'}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {user?.email ?? 'Аккаунт StaffHub'}
            </Text>
          </View>
        </View>
      </Panel>

      {organizations.length > 1 ? (
        <Panel>
          <SectionTitle>Рабочие пространства</SectionTitle>
          <View style={styles.orgList}>
            {organizations.map((org) => {
              const active = org.id === currentOrg?.id;
              return (
                <Pressable
                  key={org.id}
                  onPress={() => setCurrentOrg(org)}
                  style={({ pressed }) => [
                    styles.orgChip,
                    {
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSoft,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.orgChipText, { color: active ? theme.colors.onPrimary : theme.colors.textPrimary }]}>
                    {org.name}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={15} color={theme.colors.onPrimary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Panel>
      ) : null}

      <View style={styles.list}>
        {menuItems
          .filter((item) => !item.hidden)
          .map((item) => (
            <ActionRow
              key={item.key}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              onPress={item.onPress}
              right={
                item.badge ? (
                  <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>{item.badge}</Text>
                  </View>
                ) : undefined
              }
            />
          ))}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  profileBody: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 17, fontWeight: '800' },
  profileEmail: { fontSize: 13, marginTop: 3 },
  orgList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  orgChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', gap: 6 },
  orgChipText: { fontSize: 13, fontWeight: '700' },
  list: { gap: 10 },
  badge: { minWidth: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  badgeText: { fontSize: 12, fontWeight: '800' },
});
