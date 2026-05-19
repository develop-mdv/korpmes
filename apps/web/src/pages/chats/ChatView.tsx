import { useEffect } from 'react';
import { parseChatCommand } from '@corp/shared-constants';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInsightsPanel } from '@/components/chat/ChatInsightsPanel';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList } from '@/components/chat/MessageList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAttachmentStaging } from '@/hooks/useAttachmentStaging';
import type { VoiceRecording } from '@/hooks/useVoiceRecorder';
import type { VideoNoteRecording } from '@/hooks/useVideoNoteRecorder';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { useUIStore } from '@/stores/ui.store';
import { stopTitleFlash } from '@/services/title-flash.service';
import * as filesApi from '@/api/files.api';
import { createTask, TaskPriority } from '@/api/tasks.api';

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

  const handleSend = async (content: string) => {
    const command = parseChatCommand(content);

    if (command.kind === 'invalid') {
      window.alert('Используйте: /task Название задачи');
      return false;
    }

    if (command.kind === 'task') {
      if (!currentOrg) {
        window.alert('Не выбрана организация');
        return false;
      }

      if (staging.staged.length > 0) {
        window.alert('Команда /task создаёт только текстовую задачу. Отправьте файлы отдельно.');
        return false;
      }

      try {
        await createTask({
          title: command.title,
          organizationId: currentOrg.id,
          chatId,
          priority: TaskPriority.MEDIUM,
        });
        window.alert('Задача создана');
        return true;
      } catch (err) {
        console.warn('Failed to create task from chat command', err);
        window.alert('Не удалось создать задачу из чата');
        return false;
      }
    }

    const fileIds = staging.getReadyFileIds();
    sendMessage(content, fileIds.length > 0 ? fileIds : undefined);
    staging.reset();
    return true;
  };

  const handleSendVoice = async (rec: VoiceRecording) => {
    if (!currentOrg) return;
    try {
      const ext = rec.mimeType.includes('webm')
        ? 'webm'
        : rec.mimeType.includes('ogg')
          ? 'ogg'
          : 'mp4';
      const file = new File([rec.blob], `voice-${Date.now()}.${ext}`, { type: rec.mimeType });
      const info = await filesApi.uploadFile(
        file,
        currentOrg.id,
        undefined,
        undefined,
        undefined,
        rec.durationMs,
      );
      sendMessage('', [info.id], undefined, 'VOICE', {
        duration: rec.durationMs,
        waveform: rec.waveform,
      });
    } catch (err) {
      console.warn('Failed to send voice message', err);
    }
  };

  const handleSendVideoNote = async (rec: VideoNoteRecording) => {
    if (!currentOrg) {
      window.alert('Не выбрана организация');
      return;
    }
    try {
      const ext = rec.mimeType.includes('webm') ? 'webm' : 'mp4';
      const file = new File([rec.blob], `video-note-${Date.now()}.${ext}`, { type: rec.mimeType });
      const info = await filesApi.uploadFile(
        file,
        currentOrg.id,
        undefined,
        undefined,
        undefined,
        rec.durationMs,
      );
      sendMessage('', [info.id], undefined, 'VIDEO_NOTE', {
        duration: rec.durationMs,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Failed to send video note', err);
      window.alert(`Не удалось отправить кружок: ${msg}`);
    }
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
            onSendVoice={handleSendVoice}
            onSendVideoNote={handleSendVideoNote}
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
