import { useEffect, useState } from 'react';
import { notificationsApi } from '../api/notifications.api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { normalizePaginationResponse } from '../utils/pagination';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  TONTINE_PAYMENT_DUE: '⏰',
  TONTINE_TURN_WON: '🎉',
  WALLET_CREDIT: '💰',
  WALLET_DEBIT: '💸',
  MARKETPLACE_PURCHASE: '🛒',
  MARKETPLACE_SALE: '🏷️',
  SYSTEM: 'ℹ️',
};

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR');
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadNotifications = (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    notificationsApi
      .getAll({ page, limit: 20 })
      .then((res) => {
        const norm = normalizePaginationResponse(res.data);
        setNotifications(append ? (prev) => [...prev, ...(norm.data as Notification[])] : (norm.data as Notification[]));
      })
      .catch(() => setNotifications([]))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  const loadUnread = () => {
    notificationsApi
      .getUnreadCount()
      .then((res) => setUnreadCount(res.data?.count ?? 0))
      .catch(() => setUnreadCount(0));
  };

  useEffect(() => {
    loadNotifications();
    loadUnread();
  }, [page]);

  const handleMarkAllRead = () => {
    notificationsApi
      .markAllAsRead()
      .then(() => {
        loadUnread();
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
      })
      .catch(() => {});
  };

  if (loading && notifications.length === 0) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <button
          onClick={handleMarkAllRead}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
        >
          Tout marquer comme lu
        </button>
      </div>

      <p className="text-sm text-gray-500">
        {unreadCount} notification{unreadCount !== 1 ? 's' : ''} non lue
        {unreadCount !== 1 ? 's' : ''}
      </p>

      {notifications.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          subtitle="Vous serez notifié des événements importants"
          icon="🔔"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition-colors ${
                n.isRead
                  ? 'bg-white border-gray-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {typeIcons[n.type] ?? 'ℹ️'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-medium ${
                        n.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'
                      }`}
                    >
                      {n.title}
                    </h3>
                    {!n.isRead && (
                      <Badge variant="primary">Nouveau</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loadingMore}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore ? 'Chargement...' : 'Charger plus'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
