import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useMessageStore } from '@/stores/message.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = useAuthStore.getState().accessToken;

  socket = io('/', {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    // Catch up missed messages for every chat we have history for
    const lastSeqs = useMessageStore.getState().lastSeqByChatId;
    for (const [chatId, afterSeq] of Object.entries(lastSeqs)) {
      if (afterSeq && afterSeq > 0) {
        socket?.emit('chat:catchup', { chatId, afterSeq });
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
