import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';

const linking = {
  prefixes: ['corpmessenger://', 'https://corpmessenger.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
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
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking as any}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
