import api from './client';
import { Notification, PaginatedResult } from '../types';

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResult<Notification>>('/notifications', { params }),
  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread'),
  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};
