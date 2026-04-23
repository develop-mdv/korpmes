import { useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import {
  getSocket,
  disconnectSocket,
  getExistingSocket,
} from '../socket/socket';
import { setupSocketListeners, removeSocketListeners } from '../socket/events';

/**
 * Single socket hook — delegates to the shared singleton in socket.ts
 * so that call signaling and chat events share the same connection.
 */
export function useSocket(): { emit: (event: string, data?: unknown) => void } {
  const token = useAuthStore((state) => state.token);

  const connect = useCallback(() => {
    if (!token) return;
    const socket = getSocket(token);
    setupSocketListeners(socket);
  }, [token]);

  const disconnect = useCallback(() => {
    const socket = getExistingSocket();
    if (socket) {
      removeSocketListeners(socket);
    }
    disconnectSocket();
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (!getExistingSocket()?.connected) {
          connect();
        }
      } else if (nextState === 'background') {
        disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [connect, disconnect]);

  const emit = useCallback((event: string, data?: unknown) => {
    getExistingSocket()?.emit(event, data);
  }, []);

  return { emit };
}
