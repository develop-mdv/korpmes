import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/auth.store';
import { useInviteStore } from '../../stores/invite.store';
import { useTheme } from '../../theme';
import * as orgsApi from '../../api/organizations.api';

type Props = NativeStackScreenProps<any, 'Invite'>;

export function InviteScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const token = (route.params as any)?.token as string | undefined;
  const isAuthenticated = useAuthStore((s) => !!s.token);
  const setPendingToken = useInviteStore((s) => s.setPendingToken);
  const [info, setInfo] = useState<orgsApi.InvitePublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Неверная ссылка');
      setLoading(false);
      return;
    }
    orgsApi
      .getInviteInfo(token)
      .then((data) => {
        if (!data) setError('Ссылка недействительна или была отозвана');
        else setInfo(data);
      })
      .catch(() => setError('Не удалось загрузить информацию о приглашении'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token || !info || accepting) return;
    handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, info]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await orgsApi.acceptInvite(token);
      setPendingToken(null);
      navigation.reset({ index: 0, routes: [{ name: 'App' as never }] });
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.error?.message || 'Не удалось присоединиться');
    } finally {
      setAccepting(false);
    }
  };

  const goAuth = (screen: 'Login' | 'Register') => {
    if (token) setPendingToken(token);
    navigation.navigate(screen as never);
  };

  const wrapper = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.center}>{children}</View>
    </SafeAreaView>
  );

  if (loading) {
    return wrapper(<ActivityIndicator size="large" color={theme.colors.primary} />);
  }

  if (error || !info) {
    return wrapper(
      <>
        <View style={[styles.errorIcon, { backgroundColor: 'rgba(212,98,98,0.18)' }]}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.colors.error} />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily }]}>
          Приглашение недоступно
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {error || 'Эта ссылка больше не работает.'}
        </Text>
      </>,
    );
  }

  return wrapper(
    <>
      {info.organizationLogo ? (
        <Image source={{ uri: info.organizationLogo }} style={styles.logo} />
      ) : (
        <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.borderStrong }]}>
          <Ionicons name="business-outline" size={36} color={theme.colors.primary} />
        </View>
      )}
      <Text style={[styles.kicker, { color: theme.colors.primary }]}>Приглашение в пространство</Text>
      <Text style={[styles.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily }]}>
        Вступить в «{info.organizationName}»
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Вы получили приглашение присоединиться. После вступления у вас появится общий чат компании.
      </Text>

      {isAuthenticated ? (
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: theme.colors.primary,
              opacity: accepting ? 0.6 : pressed ? 0.85 : 1,
              ...theme.shadows.md,
            },
          ]}
          onPress={handleAccept}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={[styles.primaryText, { color: theme.colors.onPrimary }]}>Присоединиться</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1, ...theme.shadows.md },
            ]}
            onPress={() => goAuth('Login')}
          >
            <Text style={[styles.primaryText, { color: theme.colors.onPrimary }]}>Войти</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondary,
              { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => goAuth('Register')}
          >
            <Text style={[styles.secondaryText, { color: theme.colors.textPrimary }]}>Зарегистрироваться</Text>
          </Pressable>
        </View>
      )}
    </>,
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 4 },
  logo: { width: 88, height: 88, borderRadius: 22, marginBottom: 16 },
  logoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 4 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22, marginBottom: 24 },
  actions: { width: '100%', gap: 12, marginTop: 8 },
  primary: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    minWidth: 220,
  },
  primaryText: { fontSize: 15, fontWeight: '700' },
  secondary: { height: 52, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
});
