import { ReactNode } from 'react';
import { Avatar } from '@/components/common/Avatar';
import * as callsApi from '@/api/calls.api';
import { useAuthStore } from '@/stores/auth.store';
import { useCallStore } from '@/stores/call.store';
import { useChatStore } from '@/stores/chat.store';
import { useUIStore } from '@/stores/ui.store';
import { getChatDisplayName } from '@/utils/chat';

interface ChatHeaderProps {
  chatId: string;
}

function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));
  const activeCall = useCallStore((state) => state.activeCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const openRightPanel = useUIStore((state) => state.openRightPanel);
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);
  const rightPanelOpen = useUIStore((state) => state.rightPanelOpen);
  const userId = useAuthStore((state) => state.user?.id);

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
        participants: call.participants.map((participant) => participant.userId),
        status: 'ringing',
        startedAt: call.startedAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  };

  const displayName = getChatDisplayName(chat, userId);
  const subtitle = chat.type === 'PERSONAL' ? 'Личный диалог' : `${chat.members?.length || 0} участников в комнате`;

  return (
    <div className="chat-stage__header">
      <div className="chat-stage__header-copy">
        <Avatar name={displayName} size="md" />
        <div>
          <div className="chat-stage__copy-title">{displayName}</div>
          <div className="chat-stage__copy-subtitle">{subtitle}</div>
        </div>
      </div>

      <div className="chat-stage__actions">
        <button className="icon-button" title="Аудиозвонок" onClick={() => handleCall('audio')}>
          <HeaderIcon>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </HeaderIcon>
        </button>
        <button className="icon-button" title="Видеозвонок" onClick={() => handleCall('video')}>
          <HeaderIcon>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </HeaderIcon>
        </button>
        <button
          className="icon-button"
          title="Детали диалога"
          onClick={() => (rightPanelOpen ? closeRightPanel() : openRightPanel('info'))}
        >
          <HeaderIcon>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </HeaderIcon>
        </button>
      </div>
    </div>
  );
}
