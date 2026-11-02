import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { useCallStore } from '../stores/call.store';
import { useInviteStore } from '../stores/invite.store';
import { useSocket } from '../hooks/useSocket';
import { useOrganizationBootstrap } from '../hooks/useOrganizationBootstrap';
import { useOrganizationStore } from '../stores/organization.store';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { ActiveCallScreen } from '../screens/calls/ActiveCallScreen';
import { InviteScreen } from '../screens/invite/InviteScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => !!state.token);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="App" component={AppTabsWithCallGuard} />
          <Stack.Screen
            name="ActiveCall"
            component={ActiveCallScreen}
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Invite"
            component={InviteScreen}
            options={{ presentation: 'modal' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

/**
 * Wraps AppTabs and auto-navigates to ActiveCall screen when a call appears.
 * Using a wrapper component gives us access to the navigation instance after
 * the Stack is already rendered.
 */
function AppTabsWithCallGuard({ navigation }: { navigation: any }) {
  useSocket(); // Connect socket when authenticated
  useOrganizationBootstrap();
  const activeCall = useCallStore((state) => state.activeCall);
  const userId = useAuthStore((state) => state.user?.id);
  const initializedUserId = useOrganizationStore((state) => state.initializedUserId);
  const pendingChatId = useOrganizationStore((state) => state.pendingChatId);
  const setPendingChatId = useOrganizationStore((state) => state.setPendingChatId);
  useEffect(() => {
    if (!pendingChatId) return;
    navigation.navigate('App', { screen: 'ChatsTab', params: { screen: 'ChatView', params: { chatId: pendingChatId } } });
    setPendingChatId(null);
  }, [navigation, pendingChatId, setPendingChatId]);
  const pendingInviteToken = useInviteStore((state) => state.pendingToken);
  const setPendingToken = useInviteStore((state) => state.setPendingToken);

  useEffect(() => {
    if (activeCall) {
      navigation.navigate('ActiveCall');
    }
  }, [activeCall, navigation]);

  useEffect(() => {
    if (pendingInviteToken && initializedUserId === userId) {
      const token = pendingInviteToken;
      setPendingToken(null);
      navigation.navigate('Invite', { token });
    }
  }, [pendingInviteToken, navigation, setPendingToken, initializedUserId, userId]);

  if (initializedUserId !== userId) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  return <AppTabs />;
}
