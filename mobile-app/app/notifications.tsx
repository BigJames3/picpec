import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useNotificationsStore } from '../src/store/notifications.store';
import { theme } from '../src/theme';
import { EmptyState } from '../src/components/ui/EmptyState';

function getNotifIcon(type: string) {
  const map: Record<string, string> = {
    TONTINE: '🤝',
    WALLET: '💰',
    PRODUCT: '🛒',
    PAYMENT: '💸',
    REMINDER: '⏰',
    SUCCESS: '🎉',
    INFO: 'ℹ️',
  };
  return map[type] ?? '📌';
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString('fr-FR');
}

function groupByDate(
  notifications: Array<{
    id: string;
    title: string;
    body?: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>
) {
  const today: typeof notifications = [];
  const week: typeof notifications = [];
  const older: typeof notifications = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d >= todayStart) today.push(n);
    else if (d >= new Date(todayStart.getTime() - 7 * 86400000)) week.push(n);
    else older.push(n);
  });

  return [
    { title: "Aujourd'hui", data: today },
    { title: 'Cette semaine', data: week },
    { title: 'Plus ancien', data: older },
  ].filter((g) => g.data.length > 0);
}

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
    markAsRead,
  } = useNotificationsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const groups = groupByDate(notifications);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={markAllAsRead} style={styles.readAllBtn}>
          <Text style={styles.readAllText}>Tout lire</Text>
        </Pressable>
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title="Aucune notification"
            subtitle="Vous serez notifié des activités importantes"
            icon="🔔"
          />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.title}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.data.map((n) => (
                <Pressable
                  key={n.id}
                  style={[styles.notifRow, !n.isRead && styles.notifUnread]}
                  onPress={() => markAsRead(n.id)}
                >
                  <Text style={styles.notifIcon}>{getNotifIcon(n.type)}</Text>
                  <View style={styles.notifContent}>
                    <Text
                      style={[
                        styles.notifTitle,
                        !n.isRead && styles.notifTitleBold,
                      ]}
                      numberOfLines={2}
                    >
                      {n.title}
                    </Text>
                    {!!n.body && (
                      <Text style={styles.notifDesc} numberOfLines={2}>
                        {n.body}
                      </Text>
                    )}
                    <Text style={styles.notifDate}>
                      {formatRelative(n.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  backBtn: { fontSize: 24, color: theme.colors.primary, marginRight: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.size.lg,
    fontWeight: '600',
    color: theme.colors.black,
  },
  readAllBtn: { padding: 4 },
  readAllText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  unreadBanner: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  unreadText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  listContent: { padding: theme.spacing.lg, paddingBottom: 48 },
  group: { marginBottom: theme.spacing.xl },
  groupTitle: {
    fontSize: theme.typography.size.sm,
    fontWeight: '600',
    color: theme.colors.gray500,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notifUnread: {
    backgroundColor: theme.colors.primaryLight,
  },
  notifIcon: { fontSize: 28, marginRight: theme.spacing.md },
  notifContent: { flex: 1 },
  notifTitle: {
    fontSize: theme.typography.size.md,
    color: theme.colors.gray700,
  },
  notifTitleBold: { fontWeight: '700', color: theme.colors.black },
  notifDesc: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginTop: 4,
  },
  notifDate: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.gray500,
    marginTop: 4,
  },
});
