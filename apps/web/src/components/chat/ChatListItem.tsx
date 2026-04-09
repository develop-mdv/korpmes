import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import type { Chat } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { getChatDisplayName } from '@/utils/chat';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}

function getTypeLabel(type: Chat['type']) {
  return type === 'PERSONAL' ? 'личный' : type === 'GROUP' ? 'группа' : type === 'CHANNEL' ? 'канал' : 'проект';
}

export function ChatListItem({ chat, isActive, unreadCount, onClick }: ChatListItemProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const displayName = getChatDisplayName(chat, currentUserId);
  const timeLabel = chat.lastMessage?.createdAt
    ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true, locale: ru })
    : '';

  return (
    <button className={clsx('chat-list-card', isActive && 'chat-list-card--active')} onClick={onClick}>
      <Avatar name={displayName} size="md" />
      <div className="chat-list-card__body">
        <div className="chat-list-card__top">
          <div className="chat-list-card__name">{displayName}</div>
          {timeLabel && <div className="chat-list-card__time">{timeLabel}</div>}
        </div>
        <div className="chat-list-card__preview">
          {chat.lastMessage ? `${chat.lastMessage.senderName}: ${chat.lastMessage.content}` : 'Пока без сообщений. Откройте диалог и задайте тон.'}
        </div>
      </div>
      <div className="chat-list-card__meta">
        <span className="lux-pill">{getTypeLabel(chat.type)}</span>
        <Badge count={unreadCount} />
      </div>
    </button>
  );
}
