import { Socket } from 'socket.io-client';
import { WS_EVENTS } from '../constants/ws-events';
import { useChatStore } from '../stores/chat.store';
import { useMessageStore } from '../stores/message.store';
import { useNotificationStore } from '../stores/notification.store';
import { useCallStore, type ActiveCall } from '../stores/call.store';
import { useAuthStore } from '../stores/auth.store';
import { normalizeMessage } from '../api/messages.api';
import { normalizeChatFromSocket } from '../api/chats.api';
import { playMessage, startRinging, stopRinging, playCallEnded } from '../services/audio.service';

type WebRTCHandlers = {
  handleOffer: (callId: string, fromUserId: string, sdp: string, type: 'AUDIO' | 'VIDEO') => Promise<void>;
  handleAnswer: (sdp: string) => Promise<void>;
  handleIceCandidate: (candidate: Record<string, unknown>) => Promise<void>;
};

let webRTCHandlers: WebRTCHandlers | null = null;

export function setWebRTCHandlers(handlers: WebRTCHandlers) {
  webRTCHandlers = handlers;
}

export function setupSocketListeners(socket: Socket) {
  // ─── Messages ──────────────────────────────────────────────────────────────

  socket.on(WS_EVENTS.MESSAGE_NEW, (rawMessage: any) => {
    const message = normalizeMessage(rawMessage);
    useMessageStore.getState().addMessage(message.chatId, message);
    const attachCount = message.attachments?.length ?? 0;
    const previewContent =
      message.content ||
      (attachCount > 0
        ? `📎 ${attachCount} ${attachCount === 1 ? 'файл' : 'файлов'}`
        : '');
    useChatStore.getState().updateChat(message.chatId, {
      lastMessage: {
        content: previewContent,
        senderName: message.senderName,
        createdAt: message.createdAt,
      },
    });

    const selfId = useAuthStore.getState().user?.id;
    const activeChat = useChatStore.getState().activeChat;
    const isOwn = message.senderId === selfId;
    const chatInactive = activeChat?.id !== message.chatId;
    if (!isOwn && chatInactive) {
      playMessage();
    }
  });

  socket.on(WS_EVENTS.MESSAGE_EDIT, (data: { chatId: string; messageId: string; content: string; editedAt?: string }) => {
    useMessageStore.getState().updateMessage(data.chatId, data.messageId, {
      content: data.content,
      isEdited: true,
      updatedAt: data.editedAt || new Date().toISOString(),
    });
  });

  socket.on(WS_EVENTS.MESSAGE_DELETE, (data: { chatId: string; messageId: string }) => {
    useMessageStore.getState().removeMessage(data.chatId, data.messageId);
  });

  socket.on(
    WS_EVENTS.MESSAGE_READ,
    (data: { chatId: string; userId: string; messageId: string }) => {
      const selfId = useAuthStore.getState().user?.id;
      if (data.userId === selfId) {
        useChatStore.getState().updateChat(data.chatId, { unreadCount: 0 });
      }
    },
  );

  // ─── Chats ─────────────────────────────────────────────────────────────────

  socket.on(WS_EVENTS.CHAT_CREATED, (chat: any) => {
    if (!chat?.id) return;
    const existing = useChatStore.getState().chats.find((c) => c.id === chat.id);
    if (existing) return;
    useChatStore.getState().addChat(normalizeChatFromSocket(chat));
  });

  // ─── Notifications ─────────────────────────────────────────────────────────

  socket.on(WS_EVENTS.NOTIFICATION_NEW, (notification: any) => {
    useNotificationStore.getState().addNotification(notification);
  });

  // ─── Typing ────────────────────────────────────────────────────────────────

  socket.on(WS_EVENTS.TYPING_START, (_data: { chatId: string; userId: string; userName: string }) => {
    // Managed locally in ChatViewScreen
  });

  socket.on(WS_EVENTS.TYPING_STOP, (_data: { chatId: string; userId: string }) => {
    // Managed locally in ChatViewScreen
  });

  // ─── Calls ─────────────────────────────────────────────────────────────────

  socket.on(
    WS_EVENTS.CALL_INITIATE,
    (data: {
      callId: string;
      chatId: string;
      initiatorId: string;
      type: string;
      participants: string[];
      callerName?: string;
    }) => {
      const relatedChat = useChatStore
        .getState()
        .chats.find((chat) => chat.id === data.chatId);

      const incomingCall: ActiveCall = {
        id: data.callId,
        chatId: data.chatId,
        type: data.type.toUpperCase() as 'AUDIO' | 'VIDEO',
        status: 'RINGING',
        participantName: data.callerName ?? relatedChat?.name ?? 'Unknown',
        participantId: data.initiatorId,
        isIncoming: true,
        initiatorId: data.initiatorId,
      };
      useCallStore.getState().setActiveCall(incomingCall);
      const selfId = useAuthStore.getState().user?.id;
      if (data.initiatorId !== selfId) {
        startRinging();
      }
    },
  );

  socket.on(WS_EVENTS.CALL_ACCEPTED, (data: { callId: string; userId: string }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
    stopRinging();
    useCallStore.getState().setActiveCall({ ...activeCall, status: 'ACTIVE' });
    // ActiveCallScreen handles startCall on this same event
  });

  socket.on(
    WS_EVENTS.CALL_OFFER,
    (data: { callId: string; fromUserId: string; sdp: string }) => {
      const { activeCall } = useCallStore.getState();
      if (!activeCall || activeCall.id !== data.callId) return;
      webRTCHandlers?.handleOffer(data.callId, data.fromUserId, data.sdp, activeCall.type);
    },
  );

  socket.on(WS_EVENTS.CALL_ANSWER, (data: { callId: string; sdp: string }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
    webRTCHandlers?.handleAnswer(data.sdp);
  });

  socket.on(
    WS_EVENTS.CALL_ICE_CANDIDATE,
    (data: { callId: string; candidate: Record<string, unknown> }) => {
      const { activeCall } = useCallStore.getState();
      if (!activeCall || activeCall.id !== data.callId) return;
      webRTCHandlers?.handleIceCandidate(data.candidate);
    },
  );

  socket.on(WS_EVENTS.CALL_HANGUP, (data: { callId: string }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
    stopRinging();
    playCallEnded();
    useCallStore.getState().endCall();
  });

  socket.on(WS_EVENTS.CALL_REJECT, (data: { callId: string }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
    stopRinging();
    playCallEnded();
    useCallStore.getState().endCall();
  });

  socket.on(WS_EVENTS.CALL_VIDEO_MODE, (data: { callId: string; fromUserId: string; videoEnabled: boolean }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
    useCallStore.getState().setActiveCall({
      ...activeCall,
      type: data.videoEnabled ? 'VIDEO' : 'AUDIO',
    });
  });

  // Group-call stub: backend emits this when a new participant answers.
  // Mobile currently supports 1:1 only, so we just log and keep the UI stable
  // instead of letting the event fall through as "unhandled" noise.
  socket.on(WS_EVENTS.CALL_PARTICIPANT_JOINED, (data: { callId: string; userId: string }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
    // Full mesh P2P on mobile is not yet implemented (web-only for now).
    // See mvp_remaining #14 — tracked for the next phase.
  });
}

export function removeSocketListeners(socket: Socket) {
  socket.off(WS_EVENTS.MESSAGE_NEW);
  socket.off(WS_EVENTS.MESSAGE_EDIT);
  socket.off(WS_EVENTS.MESSAGE_DELETE);
  socket.off(WS_EVENTS.MESSAGE_READ);
  socket.off(WS_EVENTS.CHAT_CREATED);
  socket.off(WS_EVENTS.NOTIFICATION_NEW);
  socket.off(WS_EVENTS.TYPING_START);
  socket.off(WS_EVENTS.TYPING_STOP);
  socket.off(WS_EVENTS.CALL_INITIATE);
  socket.off(WS_EVENTS.CALL_ACCEPTED);
  socket.off(WS_EVENTS.CALL_OFFER);
  socket.off(WS_EVENTS.CALL_ANSWER);
  socket.off(WS_EVENTS.CALL_ICE_CANDIDATE);
  socket.off(WS_EVENTS.CALL_HANGUP);
  socket.off(WS_EVENTS.CALL_REJECT);
  socket.off(WS_EVENTS.CALL_VIDEO_MODE);
  socket.off(WS_EVENTS.CALL_PARTICIPANT_JOINED);
}
