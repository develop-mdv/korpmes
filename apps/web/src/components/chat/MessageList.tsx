import { CSSProperties, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { format, isSameDay } from 'date-fns';
import type { Message } from '@/stores/message.store';

interface MessageListProps {
  messages: Message[];
  hasMore: boolean;
  onLoadMore: () => void;
  currentUserId: string;
  isGroupChat: boolean;
}

const containerStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const dateSepStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 0',
};

const dateLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  backgroundColor: 'var(--color-bg-tertiary)',
  padding: '4px 12px',
  borderRadius: 'var(--radius-full)',
};

export function MessageList({ messages, hasMore, onLoadMore, currentUserId, isGroupChat }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef(0);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;

    if (el.scrollTop < 100 && hasMore) {
      prevHeightRef.current = el.scrollHeight;
      onLoadMore();
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - prevHeightRef.current;
        }
      });
    }
  };

  const renderDateSeparator = (dateStr: string) => (
    <div style={dateSepStyle}>
      <span style={dateLabelStyle}>{dateStr}</span>
    </div>
  );

  return (
    <div ref={containerRef} style={containerStyle} onScroll={handleScroll}>
      {hasMore && <LoadingSpinner size={24} />}
      {messages.map((msg, i) => {
        const showDate =
          i === 0 ||
          !isSameDay(new Date(messages[i - 1].createdAt), new Date(msg.createdAt));

        return (
          <div key={msg.id}>
            {showDate && renderDateSeparator(format(new Date(msg.createdAt), 'EEEE, MMMM d, yyyy'))}
            <MessageBubble
              message={msg}
              isOwn={msg.senderId === currentUserId}
              showSender={isGroupChat && msg.senderId !== currentUserId}
            />
          </div>
        );
      })}
    </div>
  );
}
