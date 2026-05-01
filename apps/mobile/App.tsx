import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSettingsStore } from './src/stores/settings.store';
import { ThemeProvider } from './src/theme';

const linking = {
  prefixes: ['corpmessenger://', 'https://korpmes.ru', 'https://corpmessenger.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          Invite: 'invite/:token',
        },
      },
      App: {
        screens: {
          ChatsTab: {
            screens: {
              ChatsList: 'chats',
              ChatView: 'chats/:chatId',
              NewChat: 'chats/new',
              ChatSettings: 'chats/:chatId/settings',
            },
          },
          TasksTab: {
            screens: {
              TasksList: 'tasks',
              TaskDetail: 'tasks/:taskId',
              CreateTask: 'tasks/new',
            },
          },
          CallsTab: 'calls',
          SettingsTab: 'settings',
        },
      },
      Invite: 'invite/:token',
    },
  },
};

export default function App() {
  useEffect(() => {
    void useSettingsStore.getState().load();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer linking={linking as any}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
