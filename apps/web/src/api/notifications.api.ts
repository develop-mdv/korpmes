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

export function listNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
  return apiClient.get('/notifications', { params: { page, limit } }).then((r) => r.data);
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiClient.get('/notifications/unread-count').then((r) => r.data);
}

export function markAsRead(id: string): Promise<NotificationItem> {
  return apiClient.patch(`/notifications/${id}/read`).then((r) => r.data);
}

export function markAllAsRead(): Promise<{ success: boolean }> {
  return apiClient.patch('/notifications/read-all').then((r) => r.data);
}
