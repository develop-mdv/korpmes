import { Socket } from 'socket.io-client';
import { WS_EVENTS } from '../constants/ws-events';
import { useChatStore } from '../stores/chat.store';
import { useMessageStore } from '../stores/message.store';
import { useNotificationStore } from '../stores/notification.store';
import { useCallStore, type ActiveCall } from '../stores/call.store';

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

  socket.on(WS_EVENTS.MESSAGE_NEW, (data: { chatId: string; message: any }) => {
    useMessageStore.getState().addMessage(data.chatId, data.message);
    useChatStore.getState().updateChat(data.chatId, { lastMessage: data.message });
  });

  socket.on(WS_EVENTS.MESSAGE_EDIT, (data: { chatId: string; messageId: string; content: string }) => {
    useMessageStore.getState().updateMessage(data.chatId, data.messageId, { content: data.content });
  });

  socket.on(WS_EVENTS.MESSAGE_DELETE, (data: { chatId: string; messageId: string }) => {
    useMessageStore.getState().removeMessage(data.chatId, data.messageId);
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
      const incomingCall: ActiveCall = {
        id: data.callId,
        chatId: data.chatId,
        type: data.type.toUpperCase() as 'AUDIO' | 'VIDEO',
        status: 'RINGING',
        participantName: data.callerName ?? 'Unknown',
        participantId: data.initiatorId,
        isIncoming: true,
        initiatorId: data.initiatorId,
      };
      useCallStore.getState().setActiveCall(incomingCall);
    },
  );

  socket.on(WS_EVENTS.CALL_ACCEPTED, (data: { callId: string; userId: string }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
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
    useCallStore.getState().endCall();
  });

  socket.on(WS_EVENTS.CALL_REJECT, (data: { callId: string }) => {
    const { activeCall } = useCallStore.getState();
    if (!activeCall || activeCall.id !== data.callId) return;
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
}

export function removeSocketListeners(socket: Socket) {
  socket.off(WS_EVENTS.MESSAGE_NEW);
  socket.off(WS_EVENTS.MESSAGE_EDIT);
  socket.off(WS_EVENTS.MESSAGE_DELETE);
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
}
