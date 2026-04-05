import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatsListScreen } from '../screens/chats/ChatsListScreen';
import { ChatViewScreen } from '../screens/chats/ChatViewScreen';
import { NewChatScreen } from '../screens/chats/NewChatScreen';
import { ThreadScreen } from '../screens/chats/ThreadScreen';
import type { ChatStackParamList } from './types';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatsList"
        component={ChatsListScreen}
        options={{ title: 'Chats' }}
      />
      <Stack.Screen
        name="ChatView"
        component={ChatViewScreen}
        options={({ route }) => ({
          title: 'Chat',
        })}
      />
      <Stack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{ title: 'New Chat' }}
      />
      <Stack.Screen
        name="ChatSettings"
        component={ChatSettingsPlaceholder}
        options={{ title: 'Chat Settings' }}
      />
      <Stack.Screen
        name="Thread"
        component={ThreadScreen}
        options={{ title: 'Thread' }}
      />
    </Stack.Navigator>
  );
}

function ChatSettingsPlaceholder() {
  return null;
}
