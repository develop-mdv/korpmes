import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import * as authApi from '../../api/auth.api';
import type { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'TwoFactorDisable'>;

export function TwoFactorDisableScreen({ navigation }: Props) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (code.trim().length !== 6) {
      setError('Введите 6-значный код');
      return;
    }
    setLoading(true);
    try {
      await authApi.disable2FA(code.trim());
      if (user) {
        setUser({ ...user, twoFactorEnabled: false });
      }
      Alert.alert('Готово', '2FA отключена.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Неверный код, попробуйте ещё раз');
    } finally {
      setLoading(false);
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
        <Text style={[styles.kicker, { color: theme.colors.textTertiary }]}>Отключить 2FA</Text>
        <Text
          style={[
            styles.title,
            { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily },
          ]}
        >
          Подтвердите отключение
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Введите код из приложения-аутентификатора, чтобы отключить двухфакторную защиту.
          После отключения вход будет защищён только паролем.
        </Text>

        <FormField
          label="Код из приложения"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          error={error}
          editable={!loading}
        />
        <PrimaryButton
          label={loading ? 'Отключаем…' : 'Отключить 2FA'}
          onPress={handleSubmit}
          loading={loading}
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
  description: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
});
