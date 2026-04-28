import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatsListScreen } from '../screens/chats/ChatsListScreen';
import { ChatViewScreen } from '../screens/chats/ChatViewScreen';
import { NewChatScreen } from '../screens/chats/NewChatScreen';
import { ThreadScreen } from '../screens/chats/ThreadScreen';
import { useTheme } from '../theme';
import type { ChatStackParamList } from './types';

const Stack = createNativeStackNavigator<ChatStackParamList>();

function ChatSettingsPlaceholder() {
  return null;
}

export function ChatStack() {
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
      <Stack.Screen name="ChatsList" component={ChatsListScreen} options={{ title: 'Чаты' }} />
      <Stack.Screen name="ChatView" component={ChatViewScreen} options={{ title: 'Диалог' }} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'Новый чат' }} />
      <Stack.Screen name="ChatSettings" component={ChatSettingsPlaceholder} options={{ title: 'Настройки' }} />
      <Stack.Screen name="Thread" component={ThreadScreen} options={{ title: 'Тред' }} />
    </Stack.Navigator>
  );
}
