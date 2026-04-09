import clsx from 'clsx';
import { Avatar } from '@/components/common/Avatar';

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string;
    senderId: string;
    senderName?: string;
    type: string;
    isEdited: boolean;
    createdAt: string;
    reactions?: { emoji: string; userId: string }[];
  };
  isOwn: boolean;
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={clsx('message-row', isOwn && 'message-row--own')}>
      {!isOwn && showSender && <Avatar name={message.senderName || '?'} size="sm" />}
      <div className={clsx('message-row__bubble', isOwn && 'message-row__bubble--own')}>
        {!isOwn && showSender && <div className="message-row__sender">{message.senderName}</div>}
        <div className="message-row__content">{message.content}</div>
        <div className="message-row__meta">
          {message.isEdited && <span>изменено</span>}
          <span>{time}</span>
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-row__reactions">
            {message.reactions.map((reaction) => (
              <span key={`${reaction.emoji}-${reaction.userId}`} className="message-row__reaction">
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
