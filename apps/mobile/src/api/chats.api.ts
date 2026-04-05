import { apiClient } from './client';

export interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'channel';
  avatarUrl?: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  memberCount: number;
}

export interface CreateChatPayload {
  name?: string;
  type: 'direct' | 'group';
  memberIds: string[];
}

export async function getChats(): Promise<Chat[]> {
  const { data } = await apiClient.get<Chat[]>('/chats');
  return data;
}

export async function getChatById(chatId: string): Promise<Chat> {
  const { data } = await apiClient.get<Chat>(`/chats/${chatId}`);
  return data;
}

export async function createChat(payload: CreateChatPayload): Promise<Chat> {
  const { data } = await apiClient.post<Chat>('/chats', payload);
  return data;
}

export async function markChatAsRead(chatId: string): Promise<void> {
  await apiClient.post(`/chats/${chatId}/read`);
}
