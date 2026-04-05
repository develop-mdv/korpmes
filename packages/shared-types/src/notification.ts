export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  MENTION = 'MENTION',
  REACTION = 'REACTION',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_DUE_SOON = 'TASK_DUE_SOON',
  CALL_INCOMING = 'CALL_INCOMING',
  CALL_MISSED = 'CALL_MISSED',
  MEMBER_JOINED = 'MEMBER_JOINED',
  MEMBER_LEFT = 'MEMBER_LEFT',
  INVITE_RECEIVED = 'INVITE_RECEIVED',
  ORG_UPDATE = 'ORG_UPDATE',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  mentionsOnly: boolean;
  mutedChatIds: string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: string;
}
