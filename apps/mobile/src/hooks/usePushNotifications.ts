import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useNotificationStore } from '../stores/notification.store';
import { apiClient } from '../api/client';
import { playMessage } from '../services/audio.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const { setPushToken, addNotification } = useNotificationStore();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const registerForPushNotifications = useCallback(async () => {
    // `NotificationPermissionsStatus` extends `PermissionResponse` from
    // expo-modules-core, but under pnpm hoisting that transitive type is
    // invisible to tsc in this package, so we narrow the shape locally.
    type PermStatus = { status: string };
    const existing = (await Notifications.getPermissionsAsync()) as PermStatus;
    let finalStatus = existing.status;

    if (finalStatus !== 'granted') {
      const req = (await Notifications.requestPermissionsAsync()) as PermStatus;
      finalStatus = req.status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenData.data;

    setPushToken(token);

    try {
      await apiClient.post('/notifications/push-token', {
        token,
        platform: Platform.OS,
      });
    } catch (err) {
      console.error('Failed to register push token with backend:', err);
    }

    return token;
  }, [setPushToken]);

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;
        addNotification({
          id: notification.request.identifier,
          title: title || '',
          body: body || '',
          data: data as Record<string, unknown>,
          read: false,
          createdAt: new Date().toISOString(),
        });

        // Extra feedback when app is in foreground: short vibration for messages.
        const type = (data as any)?.type;
        if (type === 'NEW_MESSAGE' && AppState.currentState === 'active') {
          playMessage();
        }
      },
    );

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.chatId) {
          // Navigation to chat would be handled by the navigation container
          console.log('Notification tapped, navigate to chat:', data.chatId);
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerForPushNotifications, addNotification]);
}
