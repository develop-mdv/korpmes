import React from 'react';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';

interface ChatViewProps {
  chatId: string;
}

export function ChatView({ chatId }: ChatViewProps) {
  const { messages, hasMore, sendMessage, loadMore } = useMessages(chatId);
  const { typingUsers, startTyping } = useTypingIndicator(chatId);
  const user = useAuthStore((s) => s.user);
  const chat = useChatStore((s) => s.chats.find((c) => c.id === chatId));

  const handleSend = (content: string) => {
    sendMessage(content);
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
        <MessageInput onSend={handleSend} onTyping={startTyping} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  messages: { flex: 1, overflow: 'hidden' },
  footer: { borderTop: '1px solid var(--color-border)' },
};
