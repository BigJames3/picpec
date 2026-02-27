import { create } from 'zustand';
import { Notification } from '../types';
import { notificationsApi } from '../api/notifications.api';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  fetchUnreadCount: async () => {
    try {
      const { data } = await notificationsApi.getUnreadCount();
      set({ unreadCount: data.count });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const code = (err as { code?: string })?.code;
      if (status === 401 || code === 'ERR_CANCELED') return; // Token pas encore disponible ou requête annulée
      console.error('[Notifications] Erreur fetchUnreadCount:', err);
    }
  },
  fetchNotifications: async () => {
    try {
      const { data } = await notificationsApi.getAll({ limit: 20 });
      set({ notifications: data.data });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const code = (err as { code?: string })?.code;
      if (status === 401 || code === 'ERR_CANCELED') return; // Token pas encore disponible ou requête annulée
      console.error('[Notifications] Erreur fetchNotifications:', err);
    }
  },
  markAsRead: async (id) => {
    await notificationsApi.markAsRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  markAllAsRead: async () => {
    await notificationsApi.markAllAsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));
