import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../../src/theme';
import { productsApi } from '../../src/api/products.api';
import { PCard } from '../../src/components/ui/PCard';
import { PBadge } from '../../src/components/ui/PBadge';
import { PButton } from '../../src/components/ui/PButton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';

export interface PurchaseItem {
  id: string;
  productId?: string;
  product?: {
    id?: string;
    name?: string;
    imageUrl?: string;
    price?: number;
    seller?: { fullname?: string; whatsapp?: string; phone?: string };
  };
  buyer?: { fullname?: string; phone?: string };
  productName?: string;
  productImage?: string;
  totalAmount?: number;
  amount?: number;
  quantity: number;
  status: string;
  deliveryStatus?: string;
  commission?: number;
  createdAt: string;
  type: 'purchase' | 'sale';
}

const DELIVERY_LABELS: Record<string, { label: string; variant: string }> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  CONFIRMED: { label: 'Confirmé', variant: 'info' },
  SHIPPED: { label: 'Expédié', variant: 'info' },
  DELIVERED: { label: 'Livré', variant: 'success' },
  CANCELLED: { label: 'Annulé', variant: 'danger' },
  REFUNDED: { label: 'Remboursé', variant: 'danger' },
};

export default function MyPurchasesScreen() {
  const [tab, setTab] = useState<'purchases' | 'sales'>('purchases');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchItems = async (reset = false) => {
    const p = reset ? 1 : page;
    setLoading(true);
    try {
      const { data } = await productsApi.getMyPurchases({ page: p, limit: 10 });
      const source = tab === 'purchases' ? data.purchases : data.sales;
      const newItems = (source?.data ?? []) as PurchaseItem[];
      const meta = source?.meta;
      const hasMoreVal = meta?.hasMore ?? newItems.length >= 10;
      setItems(reset || p === 1 ? newItems : (prev) => [...prev, ...newItems]);
      setHasMore(hasMoreVal);
      setPage(p);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchItems(true);
  }, [tab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems(true);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  const getStatusVariant = (s: string) => {
    if (s === 'COMPLETED' || s === 'DELIVERED') return 'success';
    if (s === 'PENDING' || s === 'PROCESSING') return 'warning';
    if (s === 'FAILED' || s === 'CANCELLED') return 'danger';
    return 'default';
  };

  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      COMPLETED: 'Terminé',
      PENDING: 'En attente',
      PROCESSING: 'En cours',
      DELIVERED: 'Livré',
      FAILED: 'Échoué',
      CANCELLED: 'Annulé',
    };
    return labels[s] ?? s;
  };

  const contactVendeur = (item: PurchaseItem) => {
    const whatsapp = item.product?.seller?.whatsapp;
    if (!whatsapp) {
      Alert.alert('Contact', "Le vendeur n'a pas renseigné de numéro WhatsApp");
      return;
    }
    const productName = item.product?.name ?? 'Produit';
    const message = encodeURIComponent(
      `Bonjour, j'ai commandé "${productName}" sur PICPEC.`
    );
    Linking.openURL(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${message}`);
  };

  if (loading && items.length === 0) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Mes achats & ventes</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'purchases' && styles.tabActive]}
          onPress={() => setTab('purchases')}
        >
          <Text style={[styles.tabText, tab === 'purchases' && styles.tabTextActive]}>
            Achats
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'sales' && styles.tabActive]}
          onPress={() => setTab('sales')}
        >
          <Text style={[styles.tabText, tab === 'sales' && styles.tabTextActive]}>
            Ventes
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title={tab === 'purchases' ? 'Aucun achat' : 'Aucune vente'}
            subtitle={tab === 'purchases' ? 'Vos achats apparaîtront ici' : 'Vos ventes apparaîtront ici'}
            icon="🛒"
          />
        }
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.listEmpty]}
        renderItem={({ item }) => {
          const productName = item.product?.name ?? item.productName ?? 'Produit';
          const productImage =
            item.product?.imageUrl ?? item.productImage ?? null;
          const amount = item.totalAmount ?? item.amount ?? 0;
          const delivery =
            DELIVERY_LABELS[item.deliveryStatus ?? ''] ?? {
              label: item.deliveryStatus ?? getStatusLabel(item.status),
              variant: 'info',
            };
          return (
            <PCard padding="md" style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemImage}>
                  {productImage ? (
                    <Image source={{ uri: productImage }} style={styles.img} />
                  ) : (
                    <Text style={styles.imgPlaceholder}>📦</Text>
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {productName}
                  </Text>
                  <Text style={styles.itemAmount}>
                    {typeof amount === 'number'
                      ? amount.toLocaleString()
                      : String(amount)}{' '}
                    XOF
                    {item.type === 'sale' && item.commission != null && (
                      <Text style={styles.commission}>
                        {' '}(-{item.commission.toLocaleString()} commission 3%)
                      </Text>
                    )}
                  </Text>
                  <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
                  <View style={styles.badge}>
                    <PBadge
                      label={delivery.label}
                      variant={delivery.variant as 'success' | 'warning' | 'danger' | 'info' | 'default'}
                    />
                  </View>
                  {tab === 'purchases' && item.product?.seller?.whatsapp && (
                    <PButton
                      label="💬 Contacter"
                      onPress={() => contactVendeur(item)}
                      variant="outline"
                      size="sm"
                    />
                  )}
                </View>
              </View>
            </PCard>
          );
        }}
      />
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
  tabs: {
    flexDirection: 'row',
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  tabActive: { backgroundColor: theme.colors.white, ...theme.shadow.sm },
  tabText: { fontSize: 14, color: theme.colors.gray500 },
  tabTextActive: { color: theme.colors.primary, fontWeight: '600' },
  listContent: { padding: theme.spacing.lg, paddingBottom: 48 },
  listEmpty: { flexGrow: 1 },
  itemCard: { marginBottom: theme.spacing.md },
  itemRow: { flexDirection: 'row' },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gray100,
    overflow: 'hidden',
    marginRight: theme.spacing.md,
  },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { fontSize: 28, textAlign: 'center', lineHeight: 64 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: theme.typography.size.base, fontWeight: '600', color: theme.colors.black },
  itemAmount: { fontSize: theme.typography.size.md, color: theme.colors.primary, marginTop: 4 },
  commission: { fontSize: theme.typography.size.sm, color: theme.colors.gray500 },
  itemDate: { fontSize: theme.typography.size.sm, color: theme.colors.gray500, marginTop: 2 },
  badge: { marginTop: 6 },
});
