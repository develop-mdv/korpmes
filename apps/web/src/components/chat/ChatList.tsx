import { useState } from 'react';
import clsx from 'clsx';
import { ChatListItem } from './ChatListItem';
import type { Chat } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { getChatDisplayName } from '@/utils/chat';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  unreadCounts: Record<string, number>;
}

const tabs = ['Все', 'Личные', 'Группы', 'Каналы'] as const;
type TabType = (typeof tabs)[number];

const tabMap: Record<TabType, Chat['type'] | null> = {
  Все: null,
  Личные: 'PERSONAL',
  Группы: 'GROUP',
  Каналы: 'CHANNEL',
};

export function ChatList({ chats, activeChatId, onSelectChat, unreadCounts }: ChatListProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('Все');
  const currentUserId = useAuthStore((state) => state.user?.id);

  const filteredChats = chats.filter((chat) => {
    const matchesQuery = getChatDisplayName(chat, currentUserId).toLowerCase().includes(query.toLowerCase());
    const type = tabMap[activeTab];
    return matchesQuery && (!type || chat.type === type);
  });

  return (
    <>
      <div className="chat-rail__search">
        <input
          className="lux-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по чатам..."
        />
      </div>

      <div className="chat-rail__tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={clsx('lux-chip', activeTab === tab && 'is-active')}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="chat-rail__list stagger-in">
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            unreadCount={unreadCounts[chat.id] || 0}
            onClick={() => onSelectChat(chat.id)}
          />
        ))}
        {filteredChats.length === 0 && (
          <div className="lux-panel" style={{ padding: 18 }}>
            <div className="list-card__title">Ничего не найдено</div>
            <div className="list-card__subtitle" style={{ marginTop: 6 }}>
              Уточните запрос или создайте новый чат.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
