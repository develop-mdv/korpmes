import React, { useEffect } from 'react';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAttachmentStaging } from '@/hooks/useAttachmentStaging';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { stopTitleFlash } from '@/services/title-flash.service';

interface ChatViewProps {
  chatId: string;
}

export function ChatView({ chatId }: ChatViewProps) {
  const { messages, hasMore, sendMessage, loadMore } = useMessages(chatId);
  const { typingUsers, startTyping } = useTypingIndicator(chatId);
  const user = useAuthStore((s) => s.user);
  const chat = useChatStore((s) => s.chats.find((c) => c.id === chatId));
  const currentOrg = useOrganizationStore((s) => s.currentOrg);
  const staging = useAttachmentStaging(currentOrg?.id);

  // Stop title flash whenever user opens any chat
  useEffect(() => {
    stopTitleFlash();
  }, [chatId]);

  const handleSend = (content: string) => {
    const fileIds = staging.getReadyFileIds();
    sendMessage(content, fileIds.length > 0 ? fileIds : undefined);
    staging.reset();
  };

  const typingNames = typingUsers.map((t) => t.userName);

  return (
    <div style={styles.container}>
      <ChatHeader chatId={chatId} />
      <div style={styles.messages}>
        <MessageList messages={messages} hasMore={hasMore} onLoadMore={loadMore} currentUserId={user?.id || ''} isGroupChat={chat?.type !== 'PERSONAL'} />
      </div>
      <div style={styles.footer}>
        <TypingIndicator typingUsers={typingNames} />
        <MessageInput
          onSend={handleSend}
          onTyping={startTyping}
          onAttach={staging.add}
          stagedFiles={staging.staged}
          onRemoveStaged={staging.remove}
          disableSend={staging.isUploading}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  messages: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  footer: { borderTop: '1px solid var(--color-border)', flexShrink: 0 },
};
