export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  VOICE = 'VOICE',
  SYSTEM = 'SYSTEM',
  TASK = 'TASK',
  CALL = 'CALL',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content?: string;
  parentMessageId?: string;
  isEdited: boolean;
  editedAt?: string;
  isPinned: boolean;
  attachments: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  deletedAt?: string;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface MessageStatusEntry {
  id: string;
  messageId: string;
  userId: string;
  status: MessageStatus;
  timestamp: string;
}

export interface Thread {
  parentMessage: Message;
  replies: Message[];
  replyCount: number;
  lastReplyAt: string;
}
