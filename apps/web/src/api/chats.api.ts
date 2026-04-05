import { apiClient } from './client';

export interface Chat {
  id: string;
  name: string;
  type: 'PERSONAL' | 'GROUP' | 'CHANNEL' | 'PROJECT';
  organizationId: string;
  lastMessage?: Record<string, unknown>;
  members: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatData {
  name?: string;
  type: 'PERSONAL' | 'GROUP' | 'CHANNEL' | 'PROJECT';
  organizationId: string;
  memberIds: string[];
}

export function getChats(orgId: string): Promise<Chat[]> {
  return apiClient.get(`/chats`, { params: { orgId } }).then((r) => r.data);
}

export function getChatById(id: string): Promise<Chat> {
  return apiClient.get(`/chats/${id}`).then((r) => r.data);
}

export function createChat(data: CreateChatData): Promise<Chat> {
  return apiClient.post('/chats', data).then((r) => r.data);
}

export function updateChat(id: string, data: Partial<Pick<Chat, 'name'>>): Promise<Chat> {
  return apiClient.patch(`/chats/${id}`, data).then((r) => r.data);
}

export function deleteChat(id: string): Promise<void> {
  return apiClient.delete(`/chats/${id}`).then((r) => r.data);
}

export function addMember(chatId: string, userId: string): Promise<void> {
  return apiClient.post(`/chats/${chatId}/members`, { userId }).then((r) => r.data);
}

export function removeMember(chatId: string, userId: string): Promise<void> {
  return apiClient.delete(`/chats/${chatId}/members/${userId}`).then((r) => r.data);
}

export function getMembers(chatId: string): Promise<Array<Record<string, unknown>>> {
  return apiClient.get(`/chats/${chatId}/members`).then((r) => r.data);
}
