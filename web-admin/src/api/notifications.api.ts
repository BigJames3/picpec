import api from './client';

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread'),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};
