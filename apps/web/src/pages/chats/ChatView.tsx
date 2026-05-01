import { useEffect } from 'react';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInsightsPanel } from '@/components/chat/ChatInsightsPanel';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList } from '@/components/chat/MessageList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAttachmentStaging } from '@/hooks/useAttachmentStaging';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { useUIStore } from '@/stores/ui.store';
import { stopTitleFlash } from '@/services/title-flash.service';

interface ChatViewProps {
  chatId: string;
}

export function ChatView({ chatId }: ChatViewProps) {
  const { messages, hasMore, sendMessage, loadMore } = useMessages(chatId);
  const { typingUsers, startTyping } = useTypingIndicator(chatId);
  const user = useAuthStore((state) => state.user);
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const staging = useAttachmentStaging(currentOrg?.id);
  const rightPanelOpen = useUIStore((state) => state.rightPanelOpen);

  useEffect(() => {
    stopTitleFlash();
  }, [chatId]);

  if (!chat) return null;

  const handleSend = (content: string) => {
    const fileIds = staging.getReadyFileIds();
    sendMessage(content, fileIds.length > 0 ? fileIds : undefined);
    staging.reset();
  };

  const typingNames = typingUsers.map((entry) => entry.userName);

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
      </section>

      {rightPanelOpen && <ChatInsightsPanel chat={chat} messageCount={messages.length} />}
    </>
  );
}
