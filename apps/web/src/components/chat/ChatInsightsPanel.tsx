import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@/components/common/Avatar';
import type { Chat } from '@/stores/chat.store';

interface ChatInsightsPanelProps {
  chat: Chat;
  messageCount: number;
}

function formatType(type: Chat['type']) {
  return type === 'PERSONAL'
    ? 'Личный диалог'
    : type === 'GROUP'
      ? 'Групповая комната'
      : type === 'CHANNEL'
        ? 'Канал'
        : 'Проектная линия';
}

export function ChatInsightsPanel({ chat, messageCount }: ChatInsightsPanelProps) {
  return (
    <aside className="lux-panel chat-insights">
      <div className="chat-insights__header">
        <div>
          <div className="chat-insights__title">Обзор диалога</div>
          <div className="chat-insights__subtitle">Контекст, состав и активность текущего разговора</div>
        </div>
      </div>

      <div className="chat-insights__body">
        <div className="lux-panel insight-card">
          <div className="insight-card__title">Формат</div>
          <div className="insight-card__value">{formatType(chat.type)}</div>
          <div className="list-card__meta" style={{ marginTop: 12 }}>
            <span>{chat.members.length} участников</span>
            <span>{messageCount} сообщений на экране</span>
          </div>
        </div>

        <div className="lux-panel insight-card">
          <div className="insight-card__title">Последняя активность</div>
          <div className="insight-card__value">
            {chat.lastMessage?.createdAt
              ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true, locale: ru })
              : 'Диалог только открыт'}
          </div>
          <div className="list-card__meta" style={{ marginTop: 12 }}>
            <span>{chat.lastMessage?.senderName || 'Пока без автора'}</span>
          </div>
        </div>

        <div className="lux-panel insight-card">
          <div className="insight-card__title">Участники</div>
          <div className="member-stack">
            {chat.members.slice(0, 6).map((member) => {
              const fullName = member.user ? `${member.user.firstName} ${member.user.lastName}` : member.userId.slice(0, 8);
              return (
                <div key={member.userId} className="member-stack__item">
                  <Avatar name={fullName} size="sm" />
                  <div>
                    <div className="member-stack__name">{fullName}</div>
                    <div className="member-stack__meta">{member.role.toLowerCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
