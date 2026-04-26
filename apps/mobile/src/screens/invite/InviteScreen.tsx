import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/auth.store';
import { useInviteStore } from '../../stores/invite.store';
import * as orgsApi from '../../api/organizations.api';

type Props = NativeStackScreenProps<any, 'Invite'>;

export function InviteScreen({ navigation, route }: Props) {
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

  // If user becomes authenticated while on this screen, auto-accept
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
      navigation.reset({
        index: 0,
        routes: [{ name: 'App' as never }],
      });
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !info) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.title}>Приглашение недоступно</Text>
          <Text style={styles.subtitle}>{error || 'Эта ссылка больше не работает.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        {info.organizationLogo ? (
          <Image source={{ uri: info.organizationLogo }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoEmoji}>🏢</Text>
          </View>
        )}
        <Text style={styles.title}>Вступить в «{info.organizationName}»</Text>
        <Text style={styles.subtitle}>
          Вы получили приглашение присоединиться. После вступления у вас появится общий чат компании.
        </Text>

        {isAuthenticated ? (
          <Pressable
            style={[styles.primary, accepting && styles.disabled]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Присоединиться</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => goAuth('Login')}>
              <Text style={styles.primaryText}>Войти</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => goAuth('Register')}>
              <Text style={styles.secondaryText}>Зарегистрироваться</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logo: { width: 80, height: 80, borderRadius: 16, marginBottom: 16 },
  logoPlaceholder: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoEmoji: { fontSize: 40 },
  errorIcon: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  actions: { width: '100%', gap: 12 },
  primary: { height: 48, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, minWidth: 200 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondary: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  secondaryText: { color: '#111827', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
