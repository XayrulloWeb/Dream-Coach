import { api } from './api';

export type NotificationRecord = {
  id: string;
  ownerId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export async function fetchNotifications(limit = 50): Promise<{ items: NotificationRecord[]; unreadCount: number }> {
  const response = await api.get<{ items: NotificationRecord[]; unreadCount: number }>('/api/notifications', {
    params: { limit },
  });

  return {
    items: response.data.items ?? [],
    unreadCount: response.data.unreadCount ?? 0,
  };
}

export async function markNotificationRead(id: string): Promise<NotificationRecord> {
  const response = await api.post<NotificationRecord>(`/api/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.post<{ updated: number }>('/api/notifications/read-all');
  return response.data.updated ?? 0;
}
