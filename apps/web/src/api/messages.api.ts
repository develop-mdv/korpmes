import { apiClient } from './client';
import type { Message } from '@/stores/message.store';

export interface MessagesResponse {
  messages: Message[];
  cursor?: string;
  hasMore: boolean;
}

export function normalizeMessage(raw: any): Message {
  const sender = raw.sender || {};
  const fileIds = Array.isArray(raw.metadata?.fileIds)
    ? raw.metadata.fileIds.filter(
        (x: unknown): x is string => typeof x === 'string' && x.length > 0,
      )
    : [];
  return {
    id: raw.id,
    seq: typeof raw.seq === 'string' ? Number(raw.seq) : raw.seq || 0,
    chatId: raw.chatId,
    senderId: raw.senderId,
    senderName: raw.senderName || (sender.firstName
      ? `${sender.firstName} ${sender.lastName || ''}`.trim()
      : sender.email || 'Unknown'),
    senderAvatar: raw.senderAvatar || sender.avatarUrl,
    content: raw.content || '',
    type: (raw.type || 'text').toLowerCase() as Message['type'],
    replyToId: raw.parentMessageId || raw.replyToId,
    reactions: raw.reactions || [],
    isPinned: raw.isPinned || false,
    isEdited: raw.isEdited || !!raw.editedAt,
    threadCount: raw.threadCount || raw.replyCount || 0,
    attachments: fileIds,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt || raw.createdAt,
  };
}

export function getMessages(chatId: string, cursor?: string, limit = 50): Promise<MessagesResponse> {
  return apiClient
    .get(`/chats/${chatId}/messages`, { params: { cursor, limit } })
    .then((r) => {
      const data = r.data;
      return {
        messages: (data.messages || []).map(normalizeMessage),
        cursor: data.nextCursor || data.cursor,
        hasMore: data.hasMore ?? false,
      };
    });
}

export function editMessage(id: string, content: string): Promise<Message> {
  return apiClient.patch(`/messages/${id}`, { content }).then((r) => normalizeMessage(r.data));
}

export function deleteMessage(id: string): Promise<void> {
  return apiClient.delete(`/messages/${id}`).then((r) => r.data);
}

export function addReaction(messageId: string, emoji: string): Promise<void> {
  return apiClient.post(`/messages/${messageId}/reactions`, { emoji }).then((r) => r.data);
}

export function removeReaction(messageId: string, emoji: string): Promise<void> {
  return apiClient.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`).then((r) => r.data);
}

export function getThread(messageId: string, cursor?: string, limit = 50): Promise<MessagesResponse> {
  return apiClient
    .get(`/messages/${messageId}/thread`, { params: { cursor, limit } })
    .then((r) => {
      const data = r.data;
      return {
        messages: (data.messages || []).map(normalizeMessage),
        cursor: data.nextCursor || data.cursor,
        hasMore: data.hasMore ?? false,
      };
    });
}

export function getPinnedMessages(chatId: string): Promise<Message[]> {
  return apiClient.get(`/chats/${chatId}/messages/pinned`).then((r) => (r.data || []).map(normalizeMessage));
}
