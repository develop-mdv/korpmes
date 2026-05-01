import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChatList } from '@/components/chat/ChatList';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { EmptyState } from '@/components/common/EmptyState';
import { ChatView } from './ChatView';
import * as chatsApi from '@/api/chats.api';
import { useChatStore } from '@/stores/chat.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { useUIStore } from '@/stores/ui.store';

function NoOrgBanner() {
  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Нужно рабочее пространство</div>
            <h1 className="page-hero__title">Сначала создайте или выберите организацию.</h1>
            <p className="page-hero__description">
              StaffHub строится вокруг закрытых рабочих пространств. Создайте своё или запросите доступ к существующему, чтобы открыть чаты и весь продукт.
            </p>
            <div className="page-hero__actions">
              <Link to="/create-organization" className="lux-button">
                Создать пространство
              </Link>
              <Link to="/join-organization" className="lux-button-secondary">
                Запросить доступ
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ChatsPage() {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { chats, setChats, setActiveChatId, unreadCounts } = useChatStore();
  const { currentOrg } = useOrganizationStore();
  const rightPanelOpen = useUIStore((state) => state.rightPanelOpen);
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    chatsApi.getChats(currentOrg.id).then((response) => setChats(response as any));
  }, [currentOrg, setChats]);

  useEffect(() => {
    setActiveChatId(chatId || null);
  }, [chatId, setActiveChatId]);

  useEffect(() => {
    if (!chatId) closeRightPanel();
  }, [chatId, closeRightPanel]);

  if (!currentOrg) return <NoOrgBanner />;

  return (
    <div className={clsx('messenger-shell', chatId && 'messenger-shell--active', rightPanelOpen && 'messenger-shell--with-panel')}>
      <aside className="lux-panel chat-column">
        <div className="chat-rail__header">
          <div>
            <div className="chat-rail__copy-title">Чаты</div>
            <div className="chat-rail__copy-subtitle">
              {chats.length} активных диалогов в {currentOrg.name}
            </div>
          </div>
          <button className="lux-button" onClick={() => setShowCreateModal(true)}>
            Новый чат
          </button>
        </div>

        <ChatList
          chats={chats}
          activeChatId={chatId || null}
          onSelectChat={(id) => navigate(`/chats/${id}`)}
          unreadCounts={unreadCounts}
        />
      </aside>

      {chatId ? (
        <ChatView chatId={chatId} />
      ) : (
        <section className="lux-panel chat-stage">
          <EmptyState
            icon={<span style={{ fontSize: 34 }}>✦</span>}
            title="Выберите чат"
            description="Откройте существующий диалог или создайте новый, чтобы начать общение."
            action={
              <button className="lux-button" onClick={() => setShowCreateModal(true)}>
                Создать чат
              </button>
            }
          />
        </section>
      )}

      {showCreateModal && <CreateChatModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
