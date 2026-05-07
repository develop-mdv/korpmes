import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCodeRaw from 'react-native-qrcode-svg';

const QRCode = QRCodeRaw as unknown as React.ComponentType<{ value: string; size?: number }>;
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import * as authApi from '../../api/auth.api';
import type { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'TwoFactorSetup'>;

export function TwoFactorSetupScreen({ navigation }: Props) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingSetup(true);
    setSetupError('');
    authApi
      .setup2FA()
      .then((res) => {
        if (cancelled) return;
        setSecret(res.secret);
        setOtpauthUrl(res.otpauthUrl);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setSetupError(err.response?.data?.error?.message || 'Не удалось получить ключ 2FA');
      })
      .finally(() => {
        if (!cancelled) setLoadingSetup(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopySecret = async () => {
    try {
      await Clipboard.setStringAsync(secret);
      Alert.alert('Скопировано', 'Секретный ключ скопирован в буфер обмена.');
    } catch {
      // ignore
    }
  };

  const handleVerify = async () => {
    setError('');
    if (code.trim().length !== 6) {
      setError('Введите 6-значный код');
      return;
    }
    setVerifying(true);
    try {
      await authApi.verify2FA(code.trim());
      if (user) {
        setUser({ ...user, twoFactorEnabled: true });
      }
      Alert.alert('Готово', '2FA включена.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Неверный код, попробуйте ещё раз');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.content}
    >
      <View
        style={[
          styles.section,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.kicker, { color: theme.colors.textTertiary }]}>Включить 2FA</Text>
        <Text
          style={[
            styles.title,
            { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily },
          ]}
        >
          Сканируйте QR-код
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Откройте приложение-аутентификатор (Google Authenticator, 1Password, Authy)
          и отсканируйте QR-код или введите ключ вручную.
        </Text>

        {loadingSetup ? (
          <Text style={[styles.muted, { color: theme.colors.textSecondary }]}>Готовим ключ…</Text>
        ) : setupError ? (
          <Text style={[styles.error, { color: theme.colors.error }]}>{setupError}</Text>
        ) : (
          <>
            {!!otpauthUrl && (
              <View style={styles.qrWrapper}>
                <View style={styles.qrCard}>
                  <QRCode value={otpauthUrl} size={200} />
                </View>
              </View>
            )}
            {!!secret && (
              <View style={styles.secretBox}>
                <Text style={[styles.secretLabel, { color: theme.colors.textTertiary }]}>
                  Секретный ключ
                </Text>
                <Text style={[styles.secretValue, { color: theme.colors.textPrimary }]} selectable>
                  {secret}
                </Text>
                <Pressable
                  onPress={handleCopySecret}
                  style={[styles.copyButton, { borderColor: theme.colors.borderStrong }]}
                >
                  <Text style={[styles.copyText, { color: theme.colors.primary }]}>
                    Скопировать ключ
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.kicker, { color: theme.colors.textTertiary }]}>Подтверждение</Text>
        <FormField
          label="Код из приложения"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          error={error}
          editable={!verifying && !loadingSetup}
        />
        <PrimaryButton
          label={verifying ? 'Проверяем…' : 'Включить 2FA'}
          onPress={handleVerify}
          loading={verifying}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  section: { borderRadius: 22, padding: 18, borderWidth: 1, gap: 10 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
  muted: { fontSize: 14, marginTop: 6 },
  error: { fontSize: 14, marginTop: 6 },
  qrWrapper: { alignItems: 'center', marginTop: 8 },
  qrCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16 },
  secretBox: { gap: 6, marginTop: 6 },
  secretLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  secretValue: { fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  copyButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  copyText: { fontSize: 13, fontWeight: '700' },
});
