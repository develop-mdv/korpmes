import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInsightsPanel } from '@/components/chat/ChatInsightsPanel';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList } from '@/components/chat/MessageList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useUIStore } from '@/stores/ui.store';

interface ChatViewProps {
  chatId: string;
}

export function ChatView({ chatId }: ChatViewProps) {
  const { messages, hasMore, sendMessage, loadMore } = useMessages(chatId);
  const { typingUsers, startTyping } = useTypingIndicator(chatId);
  const user = useAuthStore((state) => state.user);
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));
  const rightPanelOpen = useUIStore((state) => state.rightPanelOpen);

  if (!chat) return null;

  return (
    <>
      <section className="lux-panel chat-stage">
        <ChatHeader chatId={chatId} />
        <div className="chat-stage__body">
          <MessageList
            messages={messages}
            hasMore={hasMore}
            onLoadMore={loadMore}
            currentUserId={user?.id || ''}
            isGroupChat={chat.type !== 'PERSONAL'}
          />
        </div>
        <div className="chat-stage__composer">
          <TypingIndicator typingUsers={typingUsers.map((userItem) => userItem.userName)} />
          <MessageInput onSend={(content) => sendMessage(content)} onTyping={startTyping} />
        </div>
      </section>

      {rightPanelOpen && <ChatInsightsPanel chat={chat} messageCount={messages.length} />}
    </>
  );
}
