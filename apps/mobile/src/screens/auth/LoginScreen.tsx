import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { useTheme } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const { login, isLoading } = useAuth();

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Заполните форму', 'Введите email и пароль');
      return;
    }

    if (requiresTwoFactor && twoFactorCode.trim().length !== 6) {
      Alert.alert('Двухфакторная защита', 'Введите 6-значный код из приложения');
      return;
    }

    try {
      const result = await login(
        email.trim(),
        password,
        requiresTwoFactor ? twoFactorCode.trim() : undefined,
      );
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        Alert.alert('Двухфакторная защита', 'Введите 6-значный код из приложения');
      }
    } catch (err: any) {
      Alert.alert('Не удалось войти', err.message);
    }
  }, [email, password, login, requiresTwoFactor, twoFactorCode]);

  return (
    <AuthLayout
      kicker="Безопасный вход"
      title="Войти в StaffHub"
      description="Авторизуйтесь и вернитесь в своё рабочее пространство."
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>Забыли пароль?</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>Создать аккаунт</Text>
          </Pressable>
        </View>
      }
    >
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />
      <FormField
        label="Пароль"
        value={password}
        onChangeText={setPassword}
        placeholder="Введите пароль"
        secureTextEntry
        editable={!isLoading}
      />
      {requiresTwoFactor && (
        <FormField
          label="2FA-код"
          value={twoFactorCode}
          onChangeText={setTwoFactorCode}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          editable={!isLoading}
        />
      )}
      <PrimaryButton
        label={isLoading ? 'Проверяем доступ…' : requiresTwoFactor ? 'Подтвердить' : 'Войти'}
        onPress={handleLogin}
        loading={isLoading}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  link: { fontSize: 14, fontWeight: '600' },
});
