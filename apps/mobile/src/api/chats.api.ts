import { apiClient } from './client';
import { useAuthStore } from '../stores/auth.store';

export interface Chat {
  id: string;
  name: string;
  type: 'PERSONAL' | 'GROUP' | 'CHANNEL' | 'PROJECT';
  organizationId: string;
  avatarUrl?: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  memberCount: number;
  members: ChatMemberInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatPayload {
  name?: string;
  type: 'PERSONAL' | 'GROUP';
  memberIds: string[];
  organizationId: string;
}

export interface ChatMemberInfo {
  userId: string;
  role: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

interface ChatApiResponse {
  id: string;
  name: string | null;
  type: Chat['type'];
  organizationId: string;
  avatarUrl?: string | null;
  lastMessage?: Chat['lastMessage'];
  members?: ChatMemberInfo[];
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

function getChatDisplayName(chat: ChatApiResponse, currentUserId?: string): string {
  if (chat.name?.trim()) {
    return chat.name.trim();
  }

  if (chat.type === 'PERSONAL' && chat.members?.length) {
    const otherMember = chat.members.find(
      (member) => member.user && member.userId !== currentUserId,
    );
    if (otherMember?.user) {
      return `${otherMember.user.firstName} ${otherMember.user.lastName}`.trim();
    }
  }

  if (chat.members?.length) {
    const memberNames = chat.members
      .filter((member) => member.user && member.userId !== currentUserId)
      .slice(0, 3)
      .map((member) => member.user!.firstName)
      .filter(Boolean);

    if (memberNames.length > 0) {
      return memberNames.join(', ');
    }
  }

  return 'Chat';
}

function getChatAvatarUrl(chat: ChatApiResponse, currentUserId?: string): string | undefined {
  if (chat.avatarUrl) {
    return chat.avatarUrl;
  }

  if (chat.type === 'PERSONAL' && chat.members?.length) {
    const otherMember = chat.members.find(
      (member) => member.user && member.userId !== currentUserId,
    );
    return otherMember?.user?.avatarUrl;
  }

  return undefined;
}

function normalizeChat(chat: ChatApiResponse): Chat {
  const currentUserId = useAuthStore.getState().user?.id;

  return {
    id: chat.id,
    name: getChatDisplayName(chat, currentUserId),
    type: chat.type,
    organizationId: chat.organizationId,
    avatarUrl: getChatAvatarUrl(chat, currentUserId),
    lastMessage: chat.lastMessage,
    unreadCount: chat.unreadCount ?? 0,
    memberCount: chat.members?.length ?? 0,
    members: chat.members ?? [],
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

export function normalizeChatFromSocket(chat: ChatApiResponse): Chat {
  return normalizeChat(chat);
}

export async function getChats(orgId: string): Promise<Chat[]> {
  const { data } = await apiClient.get<ChatApiResponse[]>('/chats', {
    params: { orgId },
  });
  return data.map(normalizeChat);
}

export async function getChatById(chatId: string): Promise<Chat> {
  const { data } = await apiClient.get<ChatApiResponse>(`/chats/${chatId}`);
  return normalizeChat(data);
}

export async function createChat(payload: CreateChatPayload): Promise<Chat> {
  const { data } = await apiClient.post<ChatApiResponse>('/chats', payload);
  return normalizeChat(data);
}

export async function markChatAsRead(chatId: string, messageId?: string): Promise<void> {
  await apiClient.post(`/chats/${chatId}/read`, messageId ? { messageId } : {});
}
