export enum ChatType {
  PERSONAL = 'PERSONAL',
  GROUP = 'GROUP',
  CHANNEL = 'CHANNEL',
  PROJECT = 'PROJECT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum ChatMemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface ChatSettings {
  allowThreads: boolean;
  allowReactions: boolean;
  allowFileUpload: boolean;
  readOnly: boolean;
}

export interface Chat {
  id: string;
  organizationId: string;
  type: ChatType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  isPrivate: boolean;
  createdBy: string;
  settings: ChatSettings;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: ChatMemberRole;
  mutedUntil?: string;
  lastReadMessageId?: string;
  joinedAt: string;
  leftAt?: string;
}
