import { apiClient } from './client';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio';
  fileUrl?: string;
  parentMessageId?: string;
  replyCount?: number;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export interface SendMessagePayload {
  chatId: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio';
  fileUrl?: string;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

export async function getMessages(
  chatId: string,
  cursor?: string,
  limit = 50,
): Promise<MessagesResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<MessagesResponse>(
    `/chats/${chatId}/messages`,
    { params },
  );
  return data;
}

export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  const { data } = await apiClient.post<Message>(
    `/chats/${payload.chatId}/messages`,
    payload,
  );
  return data;
}

export async function editMessage(
  messageId: string,
  content: string,
): Promise<Message> {
  const { data } = await apiClient.patch<Message>(`/messages/${messageId}`, {
    content,
  });
  return data;
}

export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`);
}

export async function getThreadMessages(
  chatId: string,
  parentMessageId: string,
): Promise<MessagesResponse> {
  const { data } = await apiClient.get<MessagesResponse>(
    `/chats/${chatId}/messages`,
    { params: { parentMessageId, limit: 50 } },
  );
  return data;
}

export async function sendThreadReply(
  chatId: string,
  parentMessageId: string,
  content: string,
): Promise<Message> {
  const { data } = await apiClient.post<Message>(
    `/chats/${chatId}/messages`,
    { content, parentMessageId },
  );
  return data;
}
