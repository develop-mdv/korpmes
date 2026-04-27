import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
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

const jumpBtnStyle: CSSProperties = {
  position: 'absolute',
  right: 20,
  bottom: 16,
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: 'var(--color-surface-strong)',
  color: 'var(--color-text-primary)',
  boxShadow: 'var(--shadow-md)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
};

export function MessageList({ messages, hasMore, onLoadMore, currentUserId, isGroupChat }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const lastOwnIdRef = useRef<string | null>(null);
  const [showJumpBtn, setShowJumpBtn] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];

    if (last.senderId === currentUserId && last.id !== lastOwnIdRef.current) {
      lastOwnIdRef.current = last.id;
      scrollToBottom();
      setShowJumpBtn(false);
      isAtBottomRef.current = true;
      return;
    }

    if (isAtBottomRef.current) {
      scrollToBottom();
    } else {
      setShowJumpBtn(true);
    }
  }, [messages, currentUserId, scrollToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    isAtBottomRef.current = atBottom;
    if (atBottom && showJumpBtn) setShowJumpBtn(false);
    else if (!atBottom && !showJumpBtn) setShowJumpBtn(true);

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

  const handleJumpClick = () => {
    scrollToBottom();
    setShowJumpBtn(false);
    isAtBottomRef.current = true;
  };

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div ref={containerRef} className="message-list" onScroll={handleScroll}>
        {hasMore && <LoadingSpinner size={24} />}
        {messages.map((msg, i) => {
          const showDate =
            i === 0 || !isSameDay(new Date(messages[i - 1].createdAt), new Date(msg.createdAt));

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="message-date-separator">
                  <span className="message-date-separator__label">
                    {format(new Date(msg.createdAt), 'd MMMM, EEEE', { locale: ru })}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isOwn={msg.senderId === currentUserId}
                showSender={isGroupChat && msg.senderId !== currentUserId}
              />
            </div>
          );
        })}
      </div>
      {showJumpBtn && (
        <button style={jumpBtnStyle} onClick={handleJumpClick} title="К новым сообщениям">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}
