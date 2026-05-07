import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { TwoFactorSetupScreen } from '../screens/settings/TwoFactorSetupScreen';
import { TwoFactorDisableScreen } from '../screens/settings/TwoFactorDisableScreen';
import { useTheme } from '../theme';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="SettingsRoot" component={SettingsScreen} options={{ title: 'Настройки' }} />
      <Stack.Screen
        name="TwoFactorSetup"
        component={TwoFactorSetupScreen}
        options={{ title: 'Включить 2FA' }}
      />
      <Stack.Screen
        name="TwoFactorDisable"
        component={TwoFactorDisableScreen}
        options={{ title: 'Отключить 2FA' }}
      />
    </Stack.Navigator>
  );
}
