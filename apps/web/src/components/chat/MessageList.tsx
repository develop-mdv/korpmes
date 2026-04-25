import { CSSProperties, useRef, useEffect, useCallback, useState } from 'react';
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

const wrapperStyle: CSSProperties = {
  position: 'relative',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
};

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

const jumpBtnStyle: CSSProperties = {
  position: 'absolute',
  right: 20,
  bottom: 16,
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
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

    // Always jump down for the user's own messages, even if scrolled up.
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

  const renderDateSeparator = (dateStr: string) => (
    <div style={dateSepStyle}>
      <span style={dateLabelStyle}>{dateStr}</span>
    </div>
  );

  const handleJumpClick = () => {
    scrollToBottom();
    setShowJumpBtn(false);
    isAtBottomRef.current = true;
  };

  return (
    <div style={wrapperStyle}>
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
      {showJumpBtn && (
        <button style={jumpBtnStyle} onClick={handleJumpClick} title="Scroll to latest">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}
