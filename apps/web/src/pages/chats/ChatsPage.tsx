import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChatList } from '@/components/chat/ChatList';
import { ChatView } from './ChatView';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { EmptyState } from '@/components/common/EmptyState';
import { useChatStore } from '@/stores/chat.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import * as chatsApi from '@/api/chats.api';

function NoOrgBanner() {
  return (
    <div style={noOrgStyles.container}>
      <div style={noOrgStyles.card}>
        <div style={noOrgStyles.icon}>🏢</div>
        <h2 style={noOrgStyles.title}>No organization yet</h2>
        <p style={noOrgStyles.text}>
          Create your own workspace or ask a colleague to invite you to theirs.
        </p>
        <div style={noOrgStyles.actions}>
          <Link to="/create-organization" style={noOrgStyles.primaryBtn}>
            Create Organization
          </Link>
          <Link to="/join-organization" style={noOrgStyles.secondaryBtn}>
            Join Existing
          </Link>
        </div>
      </div>
    </div>
  );
}

const noOrgStyles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 },
  card: { textAlign: 'center', maxWidth: 400 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 },
  text: { fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.6 },
  actions: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: { padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' },
  secondaryBtn: { padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--color-primary)', fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--color-primary)' },
};

export function ChatsPage() {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { chats, setChats, setActiveChatId, unreadCounts } = useChatStore();
  const { currentOrg } = useOrganizationStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (currentOrg) {
      chatsApi.getChats(currentOrg.id).then((res) => setChats(res as any));
    }
  }, [currentOrg, setChats]);

  useEffect(() => {
    setActiveChatId(chatId || null);
  }, [chatId, setActiveChatId]);

  const handleSelectChat = (id: string) => {
    navigate(`/chats/${id}`);
  };

  if (!currentOrg) {
    return <NoOrgBanner />;
  }

  const showList = !isMobile || !chatId;
  const showMain = !isMobile || !!chatId;

  const sidebarStyle: React.CSSProperties = isMobile
    ? { ...styles.sidebar, width: '100%', borderRight: 'none' }
    : styles.sidebar;

  return (
    <div style={styles.container}>
      {showList && (
        <div style={sidebarStyle}>
          <div style={styles.sidebarHeader}>
            <h2 style={styles.sidebarTitle}>Chats</h2>
            <button style={styles.newChatBtn} onClick={() => setShowCreateModal(true)}>+</button>
          </div>
          <ChatList chats={chats} activeChatId={chatId || null} onSelectChat={handleSelectChat} unreadCounts={unreadCounts} />
        </div>
      )}

      {showMain && (
        <div style={styles.main}>
          {chatId ? (
            <ChatView chatId={chatId} />
          ) : (
            <EmptyState title="Select a chat" description="Choose a conversation from the sidebar or start a new one" />
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateChatModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100%', overflow: 'hidden' },
  sidebar: { width: 320, borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' },
  sidebarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px', borderBottom: '1px solid var(--color-border)' },
  sidebarTitle: { fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text)' },
  newChatBtn: { width: 32, height: 32, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
};
