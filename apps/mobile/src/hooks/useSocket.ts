import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';
import { useChatStore } from '../stores/chat.store';
import { useMessageStore } from '../stores/message.store';

const SOCKET_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000';

export function useSocket(): { emit: (event: string, data?: unknown) => void; socket: any } {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);
  const updateChat = useChatStore((state) => state.updateChat);
  const addMessage = useMessageStore((state) => state.addMessage);

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('new_message', (message) => {
      addMessage(message.chatId, message);
      updateChat(message.chatId, {
        lastMessage: {
          content: message.content,
          senderName: message.senderName,
          createdAt: message.createdAt,
        },
      });
    });

    socket.on('chat_updated', (chat) => {
      updateChat(chat.id, chat);
    });

    socketRef.current = socket;
  }, [token, addMessage, updateChat]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (!socketRef.current?.connected) {
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
    socketRef.current?.emit(event, data);
  }, []);

  return { emit, socket: socketRef.current };
}
