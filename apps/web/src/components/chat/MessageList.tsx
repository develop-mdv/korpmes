import { useCallback, useEffect, useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Message } from '@/stores/message.store';

interface MessageListProps {
  messages: Message[];
  hasMore: boolean;
  onLoadMore: () => void;
  currentUserId: string;
  isGroupChat: boolean;
}

export function MessageList({ messages, hasMore, onLoadMore, currentUserId, isGroupChat }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousHeightRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleScroll = () => {
    const element = containerRef.current;
    if (!element) return;

    isNearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 70;

    if (element.scrollTop < 120 && hasMore) {
      previousHeightRef.current = element.scrollHeight;
      onLoadMore();
      requestAnimationFrame(() => {
        if (element) {
          element.scrollTop = element.scrollHeight - previousHeightRef.current;
        }
      });
    }
  };

  return (
    <div ref={containerRef} className="message-list" onScroll={handleScroll}>
      {hasMore && <LoadingSpinner size={24} />}
      {messages.map((message, index) => {
        const showDate = index === 0 || !isSameDay(new Date(messages[index - 1].createdAt), new Date(message.createdAt));

        return (
          <div key={message.id}>
            {showDate && (
              <div className="message-date-separator">
                <span className="message-date-separator__label">
                  {format(new Date(message.createdAt), 'd MMMM, EEEE', { locale: ru })}
                </span>
              </div>
            )}
            <MessageBubble
              message={message}
              isOwn={message.senderId === currentUserId}
              showSender={isGroupChat && message.senderId !== currentUserId}
            />
          </div>
        );
      })}
    </div>
  );
}
