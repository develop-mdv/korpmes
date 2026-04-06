import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api$/, '') || (__DEV__ ? 'http://10.0.2.2:3000' : 'https://korpmes.ru');

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socket?.connected) return socket;
  if (!token) throw new Error('Socket not connected and no token provided');

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function getExistingSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
