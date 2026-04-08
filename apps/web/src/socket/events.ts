import type { Socket } from 'socket.io-client';
import { useMessageStore } from '@/stores/message.store';
import { useChatStore } from '@/stores/chat.store';
import { useCallStore } from '@/stores/call.store';
import { useNotificationStore } from '@/stores/notification.store';
import type { Message } from '@/stores/message.store';
import type { Notification } from '@/stores/notification.store';
import * as callManager from '@/services/call-manager';

interface TypingEvent {
  chatId: string;
  userId: string;
  userName: string;
}

let typingUsersMap: Record<string, Array<{ userId: string; userName: string }>> = {};
let typingListeners: Array<(chatId: string, users: Array<{ userId: string; userName: string }>) => void> = [];

export function onTypingUpdate(
  listener: (chatId: string, users: Array<{ userId: string; userName: string }>) => void,
) {
  typingListeners.push(listener);
  return () => {
    typingListeners = typingListeners.filter((l) => l !== listener);
  };
}

export function getTypingUsers(chatId: string) {
  return typingUsersMap[chatId] || [];
}

// Normalize a message from the API/WS (which has `sender` as object) to the flat format the store expects
function normalizeMessage(raw: any): Message {
  if (raw.senderName) return raw; // already flat
  const sender = raw.sender || {};
  return {
    id: raw.id,
    chatId: raw.chatId,
    senderId: raw.senderId,
    senderName: sender.firstName
      ? `${sender.firstName} ${sender.lastName || ''}`.trim()
      : sender.email || 'Unknown',
    senderAvatar: sender.avatarUrl,
    content: raw.content,
    type: (raw.type || 'text').toLowerCase(),
    replyToId: raw.parentMessageId || raw.replyToId,
    reactions: raw.reactions || [],
    isPinned: raw.isPinned || false,
    isEdited: raw.isEdited || !!raw.editedAt,
    threadCount: raw.threadCount || raw.replyCount || 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt || raw.createdAt,
  };
}

export function setupSocketListeners(socket: Socket): () => void {
  const handlers = {
    'message:new': (raw: any) => {
      const message = normalizeMessage(raw);
      useMessageStore.getState().addMessage(message.chatId, message);
      useChatStore.getState().updateLastMessage(message.chatId, {
        content: message.content,
        senderName: message.senderName,
        createdAt: message.createdAt,
      });

      const activeChatId = useChatStore.getState().activeChatId;
      if (message.chatId !== activeChatId) {
        useChatStore.getState().incrementUnread(message.chatId);
      }
    },

    'message:edit': (data: { chatId: string; messageId: string; content: string }) => {
      useMessageStore.getState().editMessage(data.chatId, data.messageId, data.content);
    },

    'message:delete': (data: { chatId: string; messageId: string }) => {
      useMessageStore.getState().deleteMessage(data.chatId, data.messageId);
    },

    'typing:start': (data: TypingEvent) => {
      if (!typingUsersMap[data.chatId]) {
        typingUsersMap[data.chatId] = [];
      }
      const existing = typingUsersMap[data.chatId].find((u) => u.userId === data.userId);
      if (!existing) {
        typingUsersMap[data.chatId].push({ userId: data.userId, userName: data.userName || 'Someone' });
        typingListeners.forEach((l) => l(data.chatId, typingUsersMap[data.chatId]));
      }
    },

    'typing:stop': (data: TypingEvent) => {
      if (typingUsersMap[data.chatId]) {
        typingUsersMap[data.chatId] = typingUsersMap[data.chatId].filter(
          (u) => u.userId !== data.userId,
        );
        typingListeners.forEach((l) => l(data.chatId, typingUsersMap[data.chatId]));
      }
    },

    'presence:update': (_data: { userId: string; status: 'online' | 'offline' | 'away' }) => {
      // Presence updates can be handled by a dedicated presence store if needed
    },

    'notification:new': (notification: Notification) => {
      useNotificationStore.getState().addNotification(notification);
    },

    'call:initiate': (data: { callId: string; chatId: string; initiatorId: string; type: 'audio' | 'video'; participants: string[] }) => {
      useCallStore.getState().setActiveCall({
        id: data.callId,
        chatId: data.chatId,
        initiatorId: data.initiatorId,
        type: data.type,
        participants: data.participants,
        status: 'ringing',
        startedAt: new Date().toISOString(),
      });
    },

    'call:accepted': (data: { callId: string; userId: string }) => {
      callManager.onCallAccepted(data).catch(console.error);
    },

    'call:offer': (data: { callId: string; fromUserId: string; sdp: string }) => {
      callManager.onCallOffer(data).catch(console.error);
    },

    'call:answer': (data: { callId: string; fromUserId: string; sdp: string }) => {
      callManager.onCallAnswer(data).catch(console.error);
    },

    'call:ice-candidate': (data: { callId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => {
      callManager.onIceCandidate(data).catch(console.error);
    },

    'call:hangup': (_data: { callId: string }) => {
      callManager.cleanup();
    },

    'call:participant-joined': (data: { callId: string; userId: string }) => {
      callManager.onParticipantJoined(data).catch(console.error);
    },

    'call:screen-share': (data: { callId: string; fromUserId: string }) => {
      // Remote participant started screen sharing — their video track will update via ontrack
      console.log('[Call] Remote screen share started by', data.fromUserId);
    },

    'call:screen-share-stop': (data: { callId: string; fromUserId: string }) => {
      console.log('[Call] Remote screen share stopped by', data.fromUserId);
    },

    'call:video-mode': (data: { callId: string; fromUserId: string; videoEnabled: boolean }) => {
      const { activeCall } = useCallStore.getState();
      if (!activeCall || data.callId !== activeCall.id) return;
      useCallStore.getState().setCallType(data.videoEnabled ? 'video' : 'audio');
    },
  };

  for (const [event, handler] of Object.entries(handlers)) {
    socket.on(event, handler);
  }

  return () => {
    for (const [event, handler] of Object.entries(handlers)) {
      socket.off(event, handler);
    }
    typingUsersMap = {};
  };
}
