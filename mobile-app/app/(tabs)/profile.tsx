import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Text as RNText,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/store/auth.store';
import { useWalletStore } from '../../src/store/wallet.store';
import { useNotificationsStore } from '../../src/store/notifications.store';
import { theme } from '../../src/theme';
import { PButton } from '../../src/components/ui/PButton';
import { PCard } from '../../src/components/ui/PCard';
import { PBadge } from '../../src/components/ui/PBadge';

const PIN_KEY = 'picpec_pin';

export default function ProfileScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { user, logout } = useAuthStore();
  const { balance, fetchBalance } = useWalletStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAllAsRead,
  } = useNotificationsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    fetchBalance();
    fetchUnreadCount();
    fetchNotifications();
  }, [isHydrated, accessToken, fetchBalance, fetchUnreadCount, fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      SecureStore.getItemAsync(PIN_KEY).then((stored) => {
        setHasPin(!!stored);
      });
    }, []),
  );

  const refreshPinStatus = () => {
    SecureStore.getItemAsync(PIN_KEY).then((stored) => {
      setHasPin(!!stored);
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchBalance(),
      fetchUnreadCount(),
      fetchNotifications(),
    ]);
    refreshPinStatus();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const fullName =
    (user as { fullName?: string; fullname?: string })?.fullName ??
    (user as { fullname?: string })?.fullname ??
    'Utilisateur';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getAvatarColor = () => {
    const id = (user as { id?: string })?.id ?? '0';
    const hue = (id.charCodeAt(0) * 47) % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  const getNotifIcon = (type: string) => {
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
  };

  const stats = {
    posts: 0,
    tontines: 0,
    purchases: 0,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <RNText style={styles.headerTitle}>Mon Profil</RNText>
          <Pressable
            onPress={() => {}}
            hitSlop={12}
            style={styles.settingsBtn}
          >
            <RNText style={styles.settingsIcon}>⚙️</RNText>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
            <RNText style={styles.avatarText}>{initials}</RNText>
          </View>
          <RNText style={styles.name}>{fullName}</RNText>
          <RNText style={styles.email}>{user?.email}</RNText>
          {user?.phone && (
            <RNText style={styles.phone}>{user.phone}</RNText>
          )}
          <View style={styles.roleBadge}>
            <PBadge
              label={(user as { role?: string })?.role ?? 'USER'}
              variant="primary"
            />
          </View>
          <PCard padding="md" shadow="sm" style={styles.balanceCard}>
            <RNText style={styles.balanceLabel}>Solde wallet</RNText>
            <RNText style={styles.balanceValue}>
              {balance.toLocaleString()} XOF
            </RNText>
          </PCard>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <RNText style={styles.statValue}>{stats.posts}</RNText>
            <RNText style={styles.statLabel}>Posts</RNText>
          </View>
          <View style={styles.stat}>
            <RNText style={styles.statValue}>{stats.tontines}</RNText>
            <RNText style={styles.statLabel}>Tontines</RNText>
          </View>
          <View style={styles.stat}>
            <RNText style={styles.statValue}>{stats.purchases}</RNText>
            <RNText style={styles.statLabel}>Achats</RNText>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <RNText style={styles.sectionTitle}>Notifications</RNText>
            {unreadCount > 0 && (
              <Pressable onPress={markAllAsRead}>
                <RNText style={styles.link}>Tout marquer lu</RNText>
              </Pressable>
            )}
          </View>
          {notifications.slice(0, 5).map((n) => (
            <View
              key={n.id}
              style={[
                styles.notifRow,
                !n.isRead && styles.notifUnread,
              ]}
            >
              <RNText style={styles.notifIcon}>{getNotifIcon(n.type)}</RNText>
              <View style={styles.notifBody}>
                <RNText
                  style={[styles.notifTitle, !n.isRead && styles.notifTitleBold]}
                  numberOfLines={2}
                >
                  {n.title}
                </RNText>
                <RNText style={styles.notifDate} numberOfLines={1}>
                  {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                </RNText>
              </View>
            </View>
          ))}
          {notifications.length === 0 && (
            <RNText style={styles.empty}>Aucune notification</RNText>
          )}
          <Pressable onPress={() => router.push('/notifications')}>
            <RNText style={styles.link}>Voir tout</RNText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <RNText style={styles.sectionTitle}>Paramètres / Sécurité</RNText>
          <PCard padding="md" shadow="sm" style={styles.settingsCard}>
            <Pressable
              style={styles.actionRow}
              onPress={() =>
                router.push(
                  hasPin === true
                    ? '/wallet/setup-pin?mode=change'
                    : '/wallet/setup-pin?mode=setup',
                )
              }
            >
              <RNText style={styles.actionIcon}>🔐</RNText>
              <View style={styles.actionLabelWrap}>
                <RNText style={styles.pinActionLabel}>
                  {hasPin === true ? 'Code PIN wallet' : 'Définir un code PIN'}
                </RNText>
                <PBadge
                  label={hasPin === true ? 'Actif' : 'Non configuré'}
                  variant={hasPin === true ? 'success' : 'danger'}
                />
              </View>
              <RNText style={styles.actionArrow}>→</RNText>
            </Pressable>
          </PCard>
        </View>

        <View style={styles.section}>
          <RNText style={styles.sectionTitle}>Actions</RNText>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push('/profile/edit')}
          >
            <RNText style={styles.actionIcon}>📝</RNText>
            <RNText style={styles.actionLabel}>Modifier mon profil</RNText>
            <RNText style={styles.actionArrow}>→</RNText>
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push('/reset-password')}
          >
            <RNText style={styles.actionIcon}>🔒</RNText>
            <RNText style={styles.actionLabel}>Changer mot de passe</RNText>
            <RNText style={styles.actionArrow}>→</RNText>
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push('/products/my-purchases')}
          >
            <RNText style={styles.actionIcon}>🛒</RNText>
            <RNText style={styles.actionLabel}>Mes achats</RNText>
            <RNText style={styles.actionArrow}>→</RNText>
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push('/referrals')}
          >
            <RNText style={styles.actionIcon}>🎁</RNText>
            <RNText style={styles.actionLabel}>Parrainage</RNText>
            <RNText style={styles.actionArrow}>→</RNText>
          </Pressable>
          <Pressable style={styles.actionRow}>
            <RNText style={styles.actionIcon}>ℹ️</RNText>
            <RNText style={styles.actionLabel}>À propos</RNText>
            <RNText style={styles.actionArrow}>→</RNText>
          </Pressable>
        </View>

        {__DEV__ && (
          <PButton
            label="🧪 Panel de test"
            onPress={() => router.push('/dev/test-panel')}
            variant="ghost"
            size="sm"
            fullWidth
            style={styles.testPanelBtn}
          />
        )}
        <PButton
          label="Déconnexion"
          variant="danger"
          fullWidth
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.black,
  },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 24 },
  hero: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.white,
  },
  name: {
    fontSize: theme.typography.size.xl,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: 4,
  },
  email: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginBottom: 2,
  },
  phone: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginBottom: theme.spacing.sm,
  },
  roleBadge: { marginBottom: theme.spacing.lg },
  balanceCard: {
    width: '100%',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontSize: theme.typography.size.xl,
    fontWeight: '700',
    color: theme.colors.black,
  },
  statLabel: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.gray500,
    marginTop: 4,
  },
  section: { marginBottom: theme.spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
  },
  link: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  notifIcon: { fontSize: 24, marginRight: theme.spacing.md },
  notifBody: { flex: 1 },
  notifTitle: {
    fontSize: theme.typography.size.base,
    color: theme.colors.gray700,
  },
  notifTitleBold: { fontWeight: '600', color: theme.colors.black },
  notifDate: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.gray500,
    marginTop: 4,
  },
  empty: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIcon: { fontSize: 22, marginRight: theme.spacing.md },
  actionLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinActionLabel: {
    fontSize: theme.typography.size.md,
    color: theme.colors.black,
  },
  actionLabel: {
    flex: 1,
    fontSize: theme.typography.size.md,
    color: theme.colors.black,
  },
  settingsCard: { marginBottom: theme.spacing.sm },
  actionArrow: {
    fontSize: 18,
    color: theme.colors.gray500,
  },
  testPanelBtn: { marginTop: theme.spacing.md },
  logoutBtn: { marginTop: theme.spacing.lg },
});
