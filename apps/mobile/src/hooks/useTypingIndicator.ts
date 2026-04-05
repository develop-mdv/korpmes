import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_EVENTS } from '@corp/shared-constants';
import { getExistingSocket } from '../socket/socket';

export function useTypingIndicator(chatId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const socket = getExistingSocket();
    if (!socket) return;

    const handleTypingStart = (data: { chatId: string; userName: string }) => {
      if (data.chatId !== chatId) return;
      setTypingUsers((prev) =>
        prev.includes(data.userName) ? prev : [...prev, data.userName],
      );
    };

    const handleTypingStop = (data: { chatId: string; userName: string }) => {
      if (data.chatId !== chatId) return;
      setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
    };

    socket.on(WS_EVENTS.TYPING_START, handleTypingStart);
    socket.on(WS_EVENTS.TYPING_STOP, handleTypingStop);

    return () => {
      socket.off(WS_EVENTS.TYPING_START, handleTypingStart);
      socket.off(WS_EVENTS.TYPING_STOP, handleTypingStop);
    };
  }, [chatId]);

  const startTyping = useCallback(() => {
    const socket = getExistingSocket();
    if (!socket || isTypingRef.current) return;

    isTypingRef.current = true;
    socket.emit(WS_EVENTS.TYPING_START, { chatId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(WS_EVENTS.TYPING_STOP, { chatId });
    }, 2000);
  }, [chatId]);

  const stopTyping = useCallback(() => {
    const socket = getExistingSocket();
    if (!socket || !isTypingRef.current) return;

    isTypingRef.current = false;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit(WS_EVENTS.TYPING_STOP, { chatId });
  }, [chatId]);

  return { typingUsers, startTyping, stopTyping };
}
