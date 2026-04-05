import { CSSProperties, useState } from 'react';
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

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: 'var(--color-bg-secondary)',
  borderRight: '1px solid var(--color-border)',
};

const searchContainerStyle: CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border)',
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-full)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-tertiary)',
  color: 'var(--color-text)',
  fontSize: 13,
  outline: 'none',
};

const tabsStyle: CSSProperties = {
  display: 'flex',
  padding: '0 16px',
  gap: 4,
  borderBottom: '1px solid var(--color-border)',
};

const listStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
};

const tabs = ['All', 'Personal', 'Groups', 'Channels'] as const;
type TabType = typeof tabs[number];
const tabTypeMap: Record<TabType, string | null> = {
  All: null,
  Personal: 'PERSONAL',
  Groups: 'GROUP',
  Channels: 'CHANNEL',
};

export function ChatList({ chats, activeChatId, onSelectChat, unreadCounts }: ChatListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const currentUserId = useAuthStore((s) => s.user?.id);

  const filtered = chats.filter((chat) => {
    const displayName = getChatDisplayName(chat, currentUserId);
    const matchesSearch = displayName.toLowerCase().includes(search.toLowerCase());
    const typeFilter = tabTypeMap[activeTab];
    const matchesType = !typeFilter || chat.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const tabBtnStyle = (isActive: boolean): CSSProperties => ({
    padding: '8px 12px',
    border: 'none',
    background: 'none',
    fontSize: 12,
    fontWeight: 600,
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
  });

  return (
    <div style={containerStyle}>
      <div style={searchContainerStyle}>
        <input
          style={searchInputStyle}
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div style={tabsStyle}>
        {tabs.map((tab) => (
          <button
            key={tab}
            style={tabBtnStyle(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={listStyle}>
        {filtered.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            unreadCount={unreadCounts[chat.id] || 0}
            onClick={() => onSelectChat(chat.id)}
          />
        ))}
      </div>
    </div>
  );
}
