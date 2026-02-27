import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
  Text as RNText,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { productsApi, type Category } from '../../src/api/products.api';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Product } from '../../src/types';

const COUNTRY_NAMES: Record<string, string> = {
  CI: "Côte d'Ivoire",
  SN: 'Sénégal',
  CM: 'Cameroun',
  BF: 'Burkina Faso',
  ML: 'Mali',
  GN: 'Guinée',
  TG: 'Togo',
  BJ: 'Bénin',
  NE: 'Niger',
};

const PAYS = [
  { code: 'CI', name: "🇨🇮 Côte d'Ivoire" },
  { code: 'SN', name: '🇸🇳 Sénégal' },
  { code: 'CM', name: '🇨🇲 Cameroun' },
  { code: 'BF', name: '🇧🇫 Burkina Faso' },
  { code: 'ML', name: '🇲🇱 Mali' },
  { code: 'GN', name: '🇬🇳 Guinée' },
  { code: 'TG', name: '🇹🇬 Togo' },
  { code: 'BJ', name: '🇧🇯 Bénin' },
  { code: 'NE', name: '🇳🇪 Niger' },
];

export default function MarketplaceScreen() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState('');
  const [countryFilter, setCountryFilter] = useState<string | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    productsApi.getCategories().then((cats) => {
      setCategories([{ id: '', name: 'Tout', emoji: '🏪', slug: 'all' }, ...cats.filter((c) => c.slug !== 'all')]);
    }).catch(() => {});
  }, []);

  const fetchProducts = async (
    reset = false,
    pageNum?: number,
    categoryFilter?: string
  ) => {
    const p = pageNum ?? (reset ? 1 : page);
    const cat = categoryFilter ?? category;
    try {
      const params: Record<string, unknown> = {
        page: p,
        limit: 10,
      };
      if (search) params.search = search;
      if (cat) params.categoryId = cat;
      if (priceMin) params.priceMin = parseInt(priceMin, 10);
      if (priceMax) params.priceMax = parseInt(priceMax, 10);
      if (countryFilter && countryFilter !== 'all') params.country = countryFilter;
      const { data } = await productsApi.getAll(params);
      const list = data.data ?? [];
      const meta = data.meta;
      const total = meta?.total ?? 0;
      const limit = meta?.limit ?? 10;
      const hasMoreVal = meta?.hasMore ?? meta?.hasNextPage ?? total > p * limit;
      setProducts((prev) => (reset || p === 1 ? list : [...prev, ...list]));
      setHasMore(hasMoreVal);
      setPage(p);
    } catch (e) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Erreur chargement'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    fetchProducts(true);
  }, [isHydrated]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const onEndReached = () => {
    if (!loading && hasMore) {
      setLoading(true);
      setPage((p) => {
        fetchProducts(false, p + 1).finally(() => setLoading(false));
        return p + 1;
      });
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchProducts(true);
  };

  const img = (p: Product) =>
    p.imageUrl ?? (p.images && p.images[0]) ?? null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Rechercher..."
          value={search}
          onChangeText={setSearch}
          style={[styles.inputBase, styles.searchInput]}
        />
        <Button
          mode="outlined"
          onPress={() => setShowFilters(!showFilters)}
          compact
        >
          Filtres
        </Button>
        <Button
          mode="contained"
          compact
          onPress={() => router.push('/products/my-purchases')}
          buttonColor="#E85D04"
        >
          Mes achats
        </Button>
        <Button
          mode="contained"
          compact
          onPress={() => router.push('/products/create')}
          buttonColor="#16A34A"
        >
          + Vendre
        </Button>
      </View>

      {user?.country && (
        <View style={styles.countryBanner}>
          <RNText style={styles.countryText}>
            📍 Produits disponibles en {COUNTRY_NAMES[user.country] ?? user.country}
          </RNText>
          <TouchableOpacity
            onPress={() => {
              setCountryFilter('all');
              fetchProducts(true);
            }}
          >
            <RNText style={styles.countryLink}>Voir tout</RNText>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((c) => (
          <Pressable
            key={c.id || 'all'}
            style={[
              styles.categoryChip,
              category === c.id && styles.categoryChipActive,
            ]}
            onPress={() => {
              setCategory(c.id);
              fetchProducts(true, 1, c.id);
            }}
          >
            <RNText
              style={[
                styles.categoryText,
                category === c.id && styles.categoryTextActive,
              ]}
            >
              {c.emoji ? `${c.emoji} ` : ''}{c.name}
            </RNText>
          </Pressable>
        ))}
      </ScrollView>

      {showFilters && (
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paysScroll}>
            {PAYS.map((p) => (
              <TouchableOpacity
                key={p.code}
                style={[
                  styles.paysChip,
                  countryFilter === p.code && styles.paysChipActive,
                ]}
                onPress={() => setCountryFilter(countryFilter === p.code ? undefined : p.code)}
              >
                <RNText style={styles.paysText}>{p.name}</RNText>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.filtersRow}>
            <TextInput
              placeholder="Prix min (XOF)"
              value={priceMin}
              onChangeText={setPriceMin}
              keyboardType="numeric"
              style={[styles.inputBase, styles.filterInput]}
            />
            <TextInput
              placeholder="Prix max (XOF)"
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="numeric"
              style={[styles.inputBase, styles.filterInput]}
            />
            <Button mode="contained" onPress={applyFilters} buttonColor="#E85D04">
              Appliquer
            </Button>
          </View>
        </View>
      )}

      <FlatList
        data={products}
        keyExtractor={(p: Product) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Aucun produit"
              subtitle="Aucun résultat pour votre recherche"
            />
          ) : null
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        renderItem={({ item: p }: { item: Product }) => (
          <Pressable
            style={styles.cardWrap}
            onPress={() => router.push(`/products/${p.id}` as never)}
          >
            <Card style={styles.card}>
              <View style={styles.imgPlaceholder}>
                <Text style={styles.emoji}>
                  {img(p) ? '🖼' : '📦'}
                </Text>
              </View>
              <Card.Content>
                <RNText style={styles.productName} numberOfLines={2}>
                  {p.name}
                </RNText>
                <Text variant="bodySmall" style={styles.price}>
                  {p.price.toLocaleString()} XOF
                </Text>
                <Text variant="bodySmall" style={styles.stock}>
                  Stock: {p.stock}
                </Text>
                <Button
                  mode="contained"
                  compact
                  disabled={p.status === 'OUT_OF_STOCK' || p.stock <= 0}
                  onPress={() => router.push(`/products/${p.id}` as never)}
                  buttonColor="#E85D04"
                >
                  Acheter
                </Button>
              </Card.Content>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categories: { maxHeight: 44, marginBottom: 8 },
  categoriesContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  categoryChipActive: { backgroundColor: '#E85D04' },
  categoryText: { fontSize: 14, color: '#374151' },
  categoryTextActive: { color: '#fff', fontWeight: '600' },
  inputBase: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchInput: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600' },
  countryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF0E6',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  countryText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  countryLink: { fontSize: 13, color: '#E85D04', fontWeight: '700' },
  filters: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  paysScroll: { marginBottom: 8 },
  paysChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  paysChipActive: { backgroundColor: '#E85D04' },
  paysText: { fontSize: 13 },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterInput: { flex: 1, minWidth: 80 },
  row: { paddingHorizontal: 12, gap: 12 },
  cardWrap: { flex: 1, maxWidth: '50%', padding: 6 },
  card: { marginBottom: 8 },
  imgPlaceholder: {
    height: 100,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 40 },
  price: { color: '#E85D04', fontWeight: '600', marginTop: 4 },
  stock: { color: '#666', marginTop: 2 },
});
