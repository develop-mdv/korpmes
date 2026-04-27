import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { useChatStore } from '@/stores/chat.store';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import * as callsApi from '@/api/calls.api';
import { getChatDisplayName } from '@/utils/chat';

interface ChatHeaderProps {
  chatId: string;
}

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const navigate = useNavigate();
  const chat = useChatStore((s) => s.chats.find((c) => c.id === chatId));
  const activeCall = useCallStore((s) => s.activeCall);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const userId = useAuthStore((s) => s.user?.id);
  const { isMobile } = useBreakpoint();

  if (!chat) return null;

  const handleCall = async (type: 'audio' | 'video') => {
    if (activeCall) return;
    try {
      const call = await callsApi.initiateCall(chatId, type.toUpperCase() as 'AUDIO' | 'VIDEO');
      setActiveCall({
        id: call.id,
        type,
        chatId,
        initiatorId: userId || '',
        participants: call.participants.map((p) => p.userId),
        status: 'ringing',
        startedAt: call.startedAt || new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
    }
  };

  const containerStyle: React.CSSProperties = isMobile
    ? { ...styles.container, padding: '10px 12px' }
    : styles.container;

  return (
    <div style={containerStyle}>
      <div style={styles.info}>
        {isMobile && (
          <button
            type="button"
            style={styles.backBtn}
            onClick={() => navigate('/chats')}
            aria-label="Back to chats"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <Avatar name={getChatDisplayName(chat, userId)} size="sm" />
        <div>
          <div style={styles.name}>{getChatDisplayName(chat, userId)}</div>
          <div style={styles.subtitle}>
            {chat.type === 'PERSONAL' ? 'Online' : `${chat.members?.length || 0} members`}
          </div>
        </div>
      </div>
      <div style={styles.actions}>
        <button style={styles.actionBtn} title="Audio call" onClick={() => handleCall('audio')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        </button>
        <button style={styles.actionBtn} title="Video call" onClick={() => handleCall('video')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>
        <button style={styles.actionBtn} title="Chat info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' },
  info: { display: 'flex', alignItems: 'center', gap: 12 },
  name: { fontWeight: 600, fontSize: 15, color: 'var(--color-text)' },
  subtitle: { fontSize: 12, color: 'var(--color-text-secondary)' },
  actions: { display: 'flex', gap: 4 },
  actionBtn: { width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 4, padding: 0, flexShrink: 0 },
};
