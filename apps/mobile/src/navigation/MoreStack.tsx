import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreScreen } from '../screens/more/MoreScreen';
import { NotificationsScreen } from '../screens/more/NotificationsScreen';
import { SearchScreen } from '../screens/more/SearchScreen';
import { OrganizationScreen } from '../screens/more/OrganizationScreen';
import { MembersScreen } from '../screens/more/MembersScreen';
import { DepartmentsScreen } from '../screens/more/DepartmentsScreen';
import { RequestsScreen } from '../screens/more/RequestsScreen';
import { AuditScreen } from '../screens/more/AuditScreen';
import { SettingsStack } from './SettingsStack';
import { useTheme } from '../theme';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
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
      <Stack.Screen name="MoreHome" component={MoreScreen} options={{ title: 'Еще' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Уведомления' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Поиск' }} />
      <Stack.Screen name="OrganizationHome" component={OrganizationScreen} options={{ title: 'Организация' }} />
      <Stack.Screen name="Members" component={MembersScreen} options={{ title: 'Участники' }} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} options={{ title: 'Отделы' }} />
      <Stack.Screen name="Requests" component={RequestsScreen} options={{ title: 'Заявки' }} />
      <Stack.Screen name="Audit" component={AuditScreen} options={{ title: 'Аудит' }} />
      <Stack.Screen name="SettingsFlow" component={SettingsStack} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
