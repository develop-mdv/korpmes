import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatList } from '@/components/chat/ChatList';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { EmptyState } from '@/components/common/EmptyState';
import { ChatView } from './ChatView';
import * as chatsApi from '@/api/chats.api';
import * as orgsApi from '@/api/organizations.api';
import { useChatStore } from '@/stores/chat.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { useUIStore } from '@/stores/ui.store';

export function ChatsPage() {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { chats, setChats, setActiveChatId, unreadCounts } = useChatStore();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const rightPanelOpen = useUIStore((state) => state.rightPanelOpen);
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    chatsApi.getChats(currentOrg?.id).then(async (response) => {
      if (!active) return;
      setChats(response as any);
      if (chatId && !response.some((chat) => chat.id === chatId)) {
        const chat = await chatsApi.getChatById(chatId);
        if (!active) return;
        if (chat.organizationId !== (currentOrg?.id ?? null)) {
          const orgs = await orgsApi.getOrganizations();
          if (!active) return;
          const org = orgs.find((item) => item.id === chat.organizationId) ?? null;
          if (chat.organizationId && !org) throw new Error('Чат недоступен');
          useOrganizationStore.getState().setOrganizations(orgs);
          useOrganizationStore.getState().setCurrentOrg(org);
        } else setError('Чат недоступен');
      }
    }).catch(() => { if (active) setError('Не удалось загрузить чаты. Проверьте подключение и доступ к пространству.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentOrg?.id, setChats, chatId, attempt]);

  useEffect(() => { setActiveChatId(chatId || null); return () => setActiveChatId(null); }, [chatId, setActiveChatId]);
  useEffect(() => { if (!chatId) closeRightPanel(); }, [chatId, closeRightPanel]);

  return (
    <div className={clsx('messenger-shell', chatId && 'messenger-shell--active', rightPanelOpen && 'messenger-shell--with-panel')}>
      <aside className="lux-panel chat-column">
        <div className="chat-rail__header">
          <div>
            <div className="chat-rail__copy-title">{currentOrg ? 'Рабочие чаты' : 'Личные чаты'}</div>
            <div className="chat-rail__copy-subtitle">{currentOrg?.name ?? 'Личное пространство'} · {chats.length} диалогов</div>
          </div>
          <button className="lux-button" onClick={() => setShowCreateModal(true)}>Новый чат</button>
        </div>
        {error && <div className="lux-alert" role="alert">{error} <button onClick={() => setAttempt((value) => value + 1)}>Повторить</button></div>}
        {loading && <p style={{ padding: 16 }}>Загрузка чатов...</p>}
        <ChatList chats={chats} activeChatId={chatId || null} onSelectChat={(id) => navigate(`/chats/${id}`)} unreadCounts={unreadCounts} organization={!!currentOrg} />
      </aside>
      {chatId ? <ChatView key={chatId} chatId={chatId} /> : (
        <section className="lux-panel chat-stage">
          <EmptyState icon={<span style={{ fontSize: 34 }}>✦</span>} title={currentOrg ? 'Выберите рабочий чат' : 'Общайтесь в личном пространстве'}
            description={currentOrg ? 'Диалоги этого пространства связаны с организацией.' : 'Найдите собеседника по никнейму или email. Приглашение от организации не требуется.'}
            action={<button className="lux-button" onClick={() => setShowCreateModal(true)}>Создать чат</button>} />
        </section>
      )}
      {showCreateModal && <CreateChatModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
