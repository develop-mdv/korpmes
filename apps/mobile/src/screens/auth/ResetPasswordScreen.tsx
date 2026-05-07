import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { useTheme } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';
import * as authApi from '../../api/auth.api';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,128}$/;

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const token = route.params?.token ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!token) {
      setError('Ссылка для восстановления повреждена.');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      setError(
        'Пароль должен содержать 8+ символов: строчную и заглавную буквы, цифру и спецсимвол (!@#$%^&*).',
      );
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      Alert.alert('Готово', 'Пароль обновлён, войдите заново.', [
        { text: 'Войти', onPress: () => navigation.replace('Login') },
      ]);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Не удалось обновить пароль. Запросите новую ссылку.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      kicker="Новый пароль"
      title="Сменить пароль"
      description="Введите новый пароль — все активные сессии будут завершены."
      footer={
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Вернуться ко входу</Text>
        </Pressable>
      }
    >
      <FormField
        label="Новый пароль"
        value={password}
        onChangeText={setPassword}
        placeholder="Минимум 8 символов"
        secureTextEntry
        editable={!loading}
      />
      <FormField
        label="Повторите пароль"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Тот же пароль"
        secureTextEntry
        editable={!loading}
        error={error}
      />
      <PrimaryButton
        label={loading ? 'Сохраняем…' : 'Сохранить пароль'}
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
