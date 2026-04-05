import { CSSProperties } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { formatDistanceToNow } from 'date-fns';
import type { Chat } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { getChatDisplayName } from '@/utils/chat';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function ChatListItem({ chat, isActive, unreadCount, onClick }: ChatListItemProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
    transition: 'background 0.15s',
  };

  const infoStyle: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
  };

  const nameStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: isActive ? '#fff' : 'var(--color-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const previewStyle: CSSProperties = {
    fontSize: 12,
    color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  };

  const metaStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  };

  const timeStyle: CSSProperties = {
    fontSize: 11,
    color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)',
  };

  const lastMsg = chat.lastMessage;
  const timeStr = lastMsg?.createdAt
    ? formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })
    : '';

  return (
    <div
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
      }}
    >
      <Avatar name={getChatDisplayName(chat, currentUserId)} size="md" />
      <div style={infoStyle}>
        <div style={nameStyle}>{getChatDisplayName(chat, currentUserId)}</div>
        {lastMsg && (
          <div style={previewStyle}>
            {lastMsg.senderName}: {lastMsg.content}
          </div>
        )}
      </div>
      <div style={metaStyle}>
        {timeStr && <span style={timeStyle}>{timeStr}</span>}
        <Badge count={unreadCount} />
      </div>
    </div>
  );
}
