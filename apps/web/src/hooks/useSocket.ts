import { useEffect, useRef } from 'react';
import { getSocket, disconnectSocket } from '@/socket/socket';
import { setupSocketListeners } from '@/socket/events';
import { useAuthStore } from '@/stores/auth.store';

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket();
    cleanupRef.current = setupSocketListeners(socket);
    socket.connect();

    return () => {
      cleanupRef.current?.();
      disconnectSocket();
    };
  }, [accessToken]);
}
