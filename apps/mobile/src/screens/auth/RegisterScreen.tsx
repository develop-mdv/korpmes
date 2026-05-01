import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { useTheme } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const e164PhonePattern = /^\+[1-9]\d{1,14}$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/;

export function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading } = useAuth();

  const handleRegister = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Заполните форму', 'Заполните все обязательные поля');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Пароль', 'Пароль должен быть не короче 8 символов');
      return;
    }

    if (!strongPasswordPattern.test(password)) {
      Alert.alert(
        'Пароль',
        'Пароль должен содержать заглавную букву, строчную букву, цифру и спецсимвол: !@#$%^&*',
      );
      return;
    }

    if (phone.trim() && !e164PhonePattern.test(phone.trim())) {
      Alert.alert(
        'Телефон',
        'Номер должен быть в международном формате, например +79991234567',
      );
      return;
    }

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
    } catch (err: any) {
      Alert.alert('Не удалось создать аккаунт', err.message);
    }
  }, [firstName, lastName, email, phone, password, register]);

  return (
    <AuthLayout
      kicker="Премиум-контур"
      title="Создать аккаунт"
      description="Присоединитесь к команде в StaffHub за пару минут."
      footer={
        <Pressable onPress={() => navigation.goBack()} style={styles.linkRow}>
          <Text style={[styles.linkText, { color: theme.colors.textSecondary }]}>
            Уже есть аккаунт?{' '}
            <Text style={[styles.link, { color: theme.colors.primary }]}>Войти</Text>
          </Text>
        </Pressable>
      }
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <FormField
            label="Имя"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Иван"
            autoCapitalize="words"
            editable={!isLoading}
          />
        </View>
        <View style={styles.flex}>
          <FormField
            label="Фамилия"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Петров"
            autoCapitalize="words"
            editable={!isLoading}
          />
        </View>
      </View>
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
        label="Телефон (необязательно)"
        value={phone}
        onChangeText={setPhone}
        placeholder="+79991234567"
        keyboardType="phone-pad"
        editable={!isLoading}
      />
      <FormField
        label="Пароль"
        value={password}
        onChangeText={setPassword}
        placeholder="Минимум 8 символов"
        secureTextEntry
        editable={!isLoading}
      />
      <PrimaryButton label="Создать аккаунт" onPress={handleRegister} loading={isLoading} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  linkRow: { alignItems: 'center' },
  linkText: { fontSize: 14 },
  link: { fontWeight: '700' },
});
