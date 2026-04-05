import { Message } from './message';
import { UserStatus } from './user';
import { CallType } from './call';

export const WS_EVENTS = {
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_UPDATE: 'presence:update',
  CALL_INITIATE: 'call:initiate',
  CALL_OFFER: 'call:offer',
  CALL_ANSWER: 'call:answer',
  CALL_ICE_CANDIDATE: 'call:ice-candidate',
  CALL_HANGUP: 'call:hangup',
  CALL_REJECT: 'call:reject',
  CHAT_CREATED: 'chat:created',
  CHAT_UPDATED: 'chat:updated',
  MEMBER_ADDED: 'member:added',
  MEMBER_REMOVED: 'member:removed',
  NOTIFICATION_NEW: 'notification:new',
  TASK_UPDATED: 'task:updated',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

export interface MessageSendPayload {
  chatId: string;
  content?: string;
  type: Message['type'];
  parentMessageId?: string;
  attachments?: string[];
}

export interface MessageNewPayload {
  message: Message;
}

export interface MessageEditPayload {
  messageId: string;
  chatId: string;
  content: string;
}

export interface MessageDeletePayload {
  messageId: string;
  chatId: string;
}

export interface MessageReadPayload {
  chatId: string;
  messageId: string;
  userId: string;
}

export interface TypingStartPayload {
  chatId: string;
  userId: string;
}

export interface TypingStopPayload {
  chatId: string;
  userId: string;
}

export interface PresenceUpdatePayload {
  userId: string;
  status: UserStatus;
  lastSeenAt?: string;
}

export interface CallInitiatePayload {
  chatId: string;
  type: CallType;
}

export interface CallOfferPayload {
  callId: string;
  userId: string;
  sdp: string;
}

export interface CallAnswerPayload {
  callId: string;
  userId: string;
  sdp: string;
}

export interface CallIceCandidatePayload {
  callId: string;
  userId: string;
  candidate: string;
}

export interface CallHangupPayload {
  callId: string;
  userId: string;
}

export interface CallRejectPayload {
  callId: string;
  userId: string;
}

export interface ChatCreatedPayload {
  chatId: string;
  memberIds: string[];
}

export interface ChatUpdatedPayload {
  chatId: string;
  changes: Record<string, any>;
}

export interface MemberAddedPayload {
  chatId: string;
  userId: string;
  addedBy: string;
}

export interface MemberRemovedPayload {
  chatId: string;
  userId: string;
  removedBy: string;
}

export interface NotificationNewPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface TaskUpdatedPayload {
  taskId: string;
  changes: Record<string, any>;
  updatedBy: string;
}
