import { CSSProperties } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { formatDistanceToNow } from 'date-fns';
import type { Chat } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { getChatDisplayName, isSelfChat } from '@/utils/chat';

function SelfChatAvatar({ size = 40 }: { size?: number }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
  return (
    <div style={style} aria-label="Saved Messages">
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  );
}

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
  const isSelf = isSelfChat(chat, currentUserId);

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
      {isSelf ? (
        <SelfChatAvatar size={40} />
      ) : (
        <Avatar name={getChatDisplayName(chat, currentUserId)} size="md" />
      )}
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
