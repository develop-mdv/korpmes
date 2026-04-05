import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/socket/socket';
import { onTypingUpdate, getTypingUsers } from '@/socket/events';

export function useTypingIndicator(chatId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!chatId) return;

    setTypingUsers(getTypingUsers(chatId));

    const unsubscribe = onTypingUpdate((updatedChatId, users) => {
      if (updatedChatId === chatId) {
        setTypingUsers([...users]);
      }
    });

    return unsubscribe;
  }, [chatId]);

  const startTyping = useCallback(() => {
    if (!chatId) return;

    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { chatId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { chatId });
    }, 2000);
  }, [chatId]);

  const stopTyping = useCallback(() => {
    if (!chatId) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      const socket = getSocket();
      socket.emit('typing:stop', { chatId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [chatId]);

  return { typingUsers, startTyping, stopTyping };
}
