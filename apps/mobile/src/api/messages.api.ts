import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import { API_BASE_URL, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from './client';
import { useAuthStore } from '../stores/auth.store';

export interface Message {
  id: string;
  seq: number;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  fileUrl?: string;
  attachments?: string[];
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

interface RawMessage {
  id: string;
  seq?: number | string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  sender?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  };
  content: string | null;
  type?: string;
  metadata?: {
    fileUrl?: string;
    fileIds?: string[];
  };
  fileUrl?: string;
  parentMessageId?: string | null;
  replyCount?: number;
  threadCount?: number;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string | null;
  isEdited?: boolean;
}

interface RawMessagesPayload {
  messages?: RawMessage[];
  hasMore?: boolean;
  nextCursor?: string | null;
  cursor?: string | null;
}

let refreshPromise: Promise<string> | null = null;

export function normalizeMessage(raw: RawMessage): Message {
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
    senderName:
      raw.senderName ||
      (sender.firstName
        ? `${sender.firstName} ${sender.lastName || ''}`.trim()
        : sender.email || 'Unknown'),
    senderAvatarUrl: raw.senderAvatarUrl || sender.avatarUrl,
    content: raw.content || '',
    type: ((raw.type || 'TEXT').toLowerCase() as Message['type']),
    fileUrl: raw.fileUrl || raw.metadata?.fileUrl,
    attachments: fileIds,
    parentMessageId: raw.parentMessageId || undefined,
    replyCount: raw.replyCount || raw.threadCount || 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt || raw.createdAt,
    isEdited: raw.isEdited || !!raw.editedAt,
  };
}

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');

  return `${API_BASE_URL}${path}${query ? `?${query}` : ''}`;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const payload = await parseJsonSafely(response);
    const data = payload?.data ?? payload;

    if (!response.ok || !data?.accessToken) {
      throw new Error(
        data?.message ||
          payload?.error?.message ||
          `Token refresh failed with status ${response.status}`,
      );
    }

    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, data.accessToken],
      [REFRESH_TOKEN_KEY, data.refreshToken ?? refreshToken],
    ]);
    useAuthStore
      .getState()
      .setTokens(data.accessToken, data.refreshToken ?? refreshToken);

    return data.accessToken as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function fetchMessagesPayload(
  path: string,
  params: Record<string, string | number | undefined>,
  allowRetry = true,
): Promise<RawMessagesPayload> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(buildUrl(path, params), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });

    const payload = await parseJsonSafely(response);
    const data = payload?.data ?? payload;

    if (response.status === 401 && allowRetry) {
      await refreshAccessToken();
      return fetchMessagesPayload(path, params, false);
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          payload?.error?.message ||
          `Messages request failed with status ${response.status}`,
      );
    }

    return (data ?? {}) as RawMessagesPayload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Loading messages timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getMessages(
  chatId: string,
  cursor?: string,
  limit = 50,
): Promise<MessagesResponse> {
  const data = await fetchMessagesPayload(`/chats/${chatId}/messages`, {
    limit,
    cursor,
  });
  return {
    messages: (data.messages || []).map(normalizeMessage),
    hasMore: data.hasMore ?? false,
    nextCursor: data.nextCursor || data.cursor || undefined,
  };
}

export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  const { data } = await apiClient.post<RawMessage>(
    `/chats/${payload.chatId}/messages`,
    payload,
  );
  return normalizeMessage(data);
}

export async function editMessage(
  messageId: string,
  content: string,
): Promise<Message> {
  const { data } = await apiClient.patch<RawMessage>(`/messages/${messageId}`, {
    content,
  });
  return normalizeMessage(data);
}

export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`);
}

export async function getThreadMessages(
  parentMessageId: string,
  cursor?: string,
  limit = 50,
): Promise<MessagesResponse> {
  const data = await fetchMessagesPayload(`/messages/${parentMessageId}/thread`, {
    cursor,
    limit,
  });
  return {
    messages: (data.messages || []).map(normalizeMessage),
    hasMore: data.hasMore ?? false,
    nextCursor: data.nextCursor || data.cursor || undefined,
  };
}

export async function sendThreadReply(
  chatId: string,
  parentMessageId: string,
  content: string,
): Promise<Message> {
  const { data } = await apiClient.post<RawMessage>(
    `/chats/${chatId}/messages`,
    { content, parentMessageId },
  );
  return normalizeMessage(data);
}
