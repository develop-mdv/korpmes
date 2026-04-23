import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { useCallStore } from '../stores/call.store';
import { useSocket } from '../hooks/useSocket';
import { useOrganizationBootstrap } from '../hooks/useOrganizationBootstrap';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { ActiveCallScreen } from '../screens/calls/ActiveCallScreen';
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

  useEffect(() => {
    if (activeCall) {
      navigation.navigate('ActiveCall');
    }
  }, [activeCall, navigation]);

  return <AppTabs />;
}
