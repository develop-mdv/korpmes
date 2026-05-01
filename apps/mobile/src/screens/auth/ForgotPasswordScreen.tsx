import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { useTheme } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Введите email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // TODO: вызвать forgotPassword API
      setSent(true);
    } catch {
      setError('Не удалось отправить ссылку');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        kicker="Письмо отправлено"
        title="Проверьте почту"
        description={`Мы отправили ссылку для сброса пароля на ${email}.`}
      >
        <PrimaryButton label="Вернуться ко входу" onPress={() => navigation.navigate('Login')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      kicker="Восстановление"
      title="Сбросить пароль"
      description="Укажите email, и мы вышлем ссылку для восстановления доступа."
      footer={
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Вернуться ко входу</Text>
        </Pressable>
      }
    >
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={error}
      />
      <PrimaryButton
        label={loading ? 'Отправка…' : 'Отправить ссылку'}
        onPress={handleSubmit}
        loading={loading}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  linkRow: { alignItems: 'center', paddingVertical: 8 },
  link: { fontSize: 14, fontWeight: '600' },
});
