import { apiClient } from './client';

export interface NotificationItem {
  id: string;
  type: 'message' | 'mention' | 'task' | 'call' | 'system';
  title: string;
  body: string | null;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  total: number;
}

export async function listNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
  const { data } = await apiClient.get<NotificationsResponse>('/notifications', {
    params: { page, limit },
  });
  return data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data;
}

export async function markAsRead(id: string): Promise<NotificationItem> {
  const { data } = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`);
  return data;
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch<{ success: boolean }>('/notifications/read-all');
  return data;
}
