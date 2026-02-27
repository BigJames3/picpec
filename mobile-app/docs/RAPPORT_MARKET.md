# RAPPORT D'ANALYSE — MARKET (PLACE DE MARCHÉ / E-COMMERCE) PICPEC

> Analyse complète des fonctionnalités liées au market du projet PICPEC.

---

## 1. STRUCTURE DES FICHIERS MARKET

### Mobile (Expo/React Native)

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Liste produits | `mobile-app/app/(tabs)/marketplace.tsx` | Écran principal : grille 2 colonnes, recherche, filtres, catégories, pagination infinie |
| Détail produit | `mobile-app/app/products/[id].tsx` | Détail d'un produit, quantité, achat, modal confirmation |
| Mes achats/ventes | `mobile-app/app/products/my-purchases.tsx` | Onglets Achats / Ventes, liste des commandes |
| API produits | `mobile-app/src/api/products.api.ts` | getAll, getById, create, purchase, getMyPurchases |
| Types | `mobile-app/src/types/index.ts` | Interface `Product` |

### Backend (NestJS)

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Controller | `backend/src/products/products.controller.ts` | Routes CRUD + purchase + approve/reject |
| Service | `backend/src/products/products.service.ts` | Logique métier : création, liste, achat (wallet), stock |
| DTO Create | `backend/src/products/dto/create-product.dto.ts` | name, description, price, stock, imageUrl |
| DTO Update | `backend/src/products/dto/update-product.dto.ts` | PartialType + status |
| DTO Purchase | `backend/src/products/dto/purchase-product.dto.ts` | quantity |
| DTO GetProducts | `backend/src/products/dto/get-products.dto.ts` | search, categoryId, priceMin, priceMax, status |

### Web Admin

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Page marketplace | `web-admin/src/pages/MarketplacePage.tsx` | Liste produits admin, approbation, suppression |
| API produits | `web-admin/src/api/products.api.ts` | getAll, getAllAdmin, updateStatus, approve, reject, delete |
| API marketplace | `web-admin/src/api/marketplace.api.ts` | getProducts, approve, reject, suspend (routes `/marketplace` — **non alignées avec le backend**) |

### Prisma

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Schema | `backend/prisma/schema.prisma` | Modèles Product, ProductPurchase |

---

## 2. ÉCRANS EXISTANTS

### 2.1 Liste produits `marketplace.tsx`

**Contenu complet :**

```tsx
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
} from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { productsApi } from '../../src/api/products.api';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Product } from '../../src/types';

export default function MarketplaceScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = async (reset = false, pageNum?: number, categoryFilter?: string) => {
    const p = pageNum ?? (reset ? 1 : page);
    const cat = categoryFilter ?? category;
    try {
      const params: Record<string, unknown> = { page: p, limit: 10 };
      if (search) params.search = search;
      if (cat) params.category = cat;  // ⚠️ Envoie "category" mais backend attend "categoryId" (UUID)
      if (priceMin) params.priceMin = parseInt(priceMin, 10);
      if (priceMax) params.priceMax = parseInt(priceMax, 10);
      const { data } = await productsApi.getAll(params);
      const list = data.data ?? [];
      const total = data.meta?.total ?? 0;
      const limit = data.meta?.limit ?? 10;
      setProducts((prev) => (reset || p === 1 ? list : [...prev, ...list]));
      setHasMore(total > p * limit);
      setPage(p);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    fetchProducts(true);
  }, [isHydrated, accessToken]);

  const onRefresh = () => { setRefreshing(true); fetchProducts(true); };
  const onEndReached = () => {
    if (!loading && hasMore) {
      setLoading(true);
      setPage((p) => {
        fetchProducts(false, p + 1).finally(() => setLoading(false));
        return p + 1;
      });
    }
  };

  const CATEGORIES = [
    { id: '', name: 'Tout' },
    { id: 'alimentaire', name: 'Alimentaire' },
    { id: 'mode', name: 'Mode' },
    { id: 'electronique', name: 'Électronique' },
    { id: 'artisanat', name: 'Artisanat' },
  ];

  const applyFilters = () => { setShowFilters(false); fetchProducts(true); };
  const img = (p: Product) => p.imageUrl ?? (p.images && p.images[0]) ?? null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchRow}>
        <TextInput placeholder="Rechercher..." value={search} onChangeText={setSearch} style={[styles.inputBase, styles.searchInput]} />
        <Button mode="outlined" onPress={() => setShowFilters(!showFilters)} compact>Filtres</Button>
        <Button mode="contained" compact onPress={() => router.push('/products/my-purchases')} buttonColor="#E85D04">Mes achats</Button>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories} contentContainerStyle={styles.categoriesContent}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.id} style={[styles.categoryChip, category === c.id && styles.categoryChipActive]} onPress={() => { setCategory(c.id); fetchProducts(true, 1, c.id); }}>
            <RNText style={[styles.categoryText, category === c.id && styles.categoryTextActive]}>{c.name}</RNText>
          </Pressable>
        ))}
      </ScrollView>
      {showFilters && (
        <View style={styles.filters}>
          <TextInput placeholder="Prix min (XOF)" value={priceMin} onChangeText={setPriceMin} keyboardType="numeric" style={[styles.inputBase, styles.filterInput]} />
          <TextInput placeholder="Prix max (XOF)" value={priceMax} onChangeText={setPriceMax} keyboardType="numeric" style={[styles.inputBase, styles.filterInput]} />
          <Button mode="contained" onPress={applyFilters} buttonColor="#E85D04">Appliquer</Button>
        </View>
      )}
      <FlatList
        data={products}
        keyExtractor={(p: Product) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={!loading ? <EmptyState title="Aucun produit" subtitle="Aucun résultat pour votre recherche" /> : null}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        renderItem={({ item: p }: { item: Product }) => (
          <Pressable style={styles.cardWrap} onPress={() => router.push(`/products/${p.id}` as never)}>
            <Card style={styles.card}>
              <View style={styles.imgPlaceholder}>
                <Text style={styles.emoji}>{img(p) ? '🖼' : '📦'}</Text>
              </View>
              <Card.Content>
                <RNText style={styles.productName} numberOfLines={2}>{p.name}</RNText>
                <Text variant="bodySmall" style={styles.price}>{p.price.toLocaleString()} XOF</Text>
                <Text variant="bodySmall" style={styles.stock}>Stock: {p.stock}</Text>
                <Button mode="contained" compact disabled={p.status === 'OUT_OF_STOCK' || p.stock <= 0} onPress={() => router.push(`/products/${p.id}` as never)} buttonColor="#E85D04">Acheter</Button>
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
  searchRow: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  categories: { maxHeight: 44, marginBottom: 8 },
  categoriesContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB' },
  categoryChipActive: { backgroundColor: '#E85D04' },
  categoryText: { fontSize: 14, color: '#374151' },
  categoryTextActive: { color: '#fff', fontWeight: '600' },
  inputBase: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  searchInput: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600' },
  filters: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 8, alignItems: 'center' },
  filterInput: { flex: 1, minWidth: 80 },
  row: { paddingHorizontal: 12, gap: 12 },
  cardWrap: { flex: 1, maxWidth: '50%', padding: 6 },
  card: { marginBottom: 8 },
  imgPlaceholder: { height: 100, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 40 },
  price: { color: '#E85D04', fontWeight: '600', marginTop: 4 },
  stock: { color: '#666', marginTop: 2 },
});
```

**État interne :** products, loading, refreshing, search, priceMin, priceMax, showFilters, category, page, hasMore, error

**Librairies :** react-native, react-native-paper, expo-router, zustand

**Mock vs réel :** Tout est réel — appels API vers le backend. Aucune donnée mockée.

---

### 2.2 Détail produit `[id].tsx`

**Contenu :** Fetch produit par ID, affichage image/description, sélecteur quantité, bouton « Acheter maintenant », modal confirmation avec solde, partage.

**État :** product, loading, quantity, confirmModal, error, submitting

**Librairies :** theme, productsApi, PButton, PBadge, ErrorMessage, LoadingScreen

**Mock vs réel :** Réel — API `getById`, `purchase`.

---

### 2.3 Mes achats/ventes `my-purchases.tsx`

**Contenu :** Onglets Achats / Ventes, FlatList avec PCard par item (productName, amount, date, status).

**État :** tab, items, loading, refreshing, page, hasMore

**⚠️ Bug :** L'API `getMyPurchases` retourne `{ purchases: { data, meta }, sales: { data, meta } }`. Le code actuel attend `data.data` ou `data` — il ne sélectionne pas `data.purchases` ou `data.sales` selon l'onglet. Les items ne sont pas correctement mappés (productName, productImage, etc. depuis `product.name`, `product.imageUrl`).

**Mock vs réel :** Réel — API `getMyPurchases`.

---

## 3. BOUTONS ET ACTIONS

| Bouton | Label / Icône | onPress | Comportement actuel |
|--------|---------------|---------|---------------------|
| Filtres | Filtres | `setShowFilters(!showFilters)` | Affiche/masque les champs prix min/max |
| Mes achats | Mes achats | `router.push('/products/my-purchases')` | Navigue vers écran achats/ventes |
| Catégorie | Tout / Alimentaire / Mode / etc. | `setCategory(c.id); fetchProducts(true, 1, c.id)` | Filtre par catégorie (⚠️ param `category` vs `categoryId` backend) |
| Appliquer | Appliquer | `applyFilters()` → `fetchProducts(true)` | Applique les filtres prix |
| Carte produit | — | `router.push('/products/${p.id}')` | Ouvre le détail |
| Acheter (carte) | Acheter | `router.push('/products/${p.id}')` | Ouvre le détail (même action) |
| ← Retour | ← | `router.back()` | Retour |
| 🔗 Partager | 🔗 | `Share.share(...)` | Partage nom + prix |
| − | − | `setQuantity((q) => Math.max(1, q - 1))` | Décrémente quantité |
| + | + | `setQuantity((q) => Math.min(stock, q + 1))` | Incrémente quantité |
| Acheter maintenant | Acheter maintenant | `handleBuy()` → `setConfirmModal(true)` | Ouvre modal confirmation |
| Confirmer l'achat | Confirmer l'achat | `handleConfirmPurchase()` → `productsApi.purchase` | **Fonctionnel** — débite wallet, crédite vendeur |
| Annuler | Annuler | `setConfirmModal(false)` | Ferme modal |
| Onglet Achats | Achats | `setTab('purchases')` | Affiche achats |
| Onglet Ventes | Ventes | `setTab('sales')` | Affiche ventes |

**Manquant :** Créer une annonce, Contacter le vendeur, Filtrer par catégorie (backend), Upload image produit.

---

## 4. MODÈLE DE DONNÉES

### 4.1 Product

```prisma
model Product {
  id         String   @id @default(uuid())
  sellerId   String   @map("seller_id")
  categoryId String?  @map("category_id")
  name       String
  description String?
  price     Decimal  @db.Decimal(15, 2)
  stock     Int      @default(0)
  status    ProductStatus @default(ACTIVE)
  imageUrl  String?  @map("image_url")
  isApproved  Boolean   @default(false)
  approvedAt  DateTime?
  approvedBy  String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  seller   User @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  purchases ProductPurchase[]

  @@index([status])
  @@index([sellerId])
  @@index([createdAt])
  @@map("products")
}
```

**Champs manquants :**
- Pas de modèle `Category` — `categoryId` est une String mais sans relation
- Pas de `images` (array) — seule `imageUrl` (single)
- Pas de `slug`, `sku`, `weight`, `deliveryInfo`

### 4.2 ProductPurchase

```prisma
model ProductPurchase {
  id        String   @id @default(uuid())
  productId String   @map("product_id")
  buyerId   String   @map("buyer_id")
  quantity  Int
  totalAmount Decimal @map("total_amount") @db.Decimal(15, 2)
  status    TransactionStatus @default(PENDING)
  createdAt DateTime @default(now()) @map("created_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  buyer   User     @relation(fields: [buyerId], references: [id], onDelete: Cascade)

  @@index([buyerId])
  @@index([productId])
  @@index([createdAt])
  @@map("product_purchases")
}
```

**Champs manquants :**
- Pas de `shippingAddress`, `deliveryStatus`, `trackingNumber`
- Pas de `commission` (stockée dans Transaction)

### 4.3 Pas de modèle Order

Les achats sont enregistrés par `ProductPurchase` + `Transaction`. Pas de notion de panier (Order) ni de commande groupée.

---

## 5. API ET BACKEND MARKET

### 5.1 Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/products` | Liste paginée (public, approuvés uniquement) |
| GET | `/products/admin` | Liste tous (admin) |
| GET | `/products/:id` | Détail produit |
| GET | `/products/purchases/my` | Mes achats et ventes |
| POST | `/products` | Créer un produit (auth) |
| PATCH | `/products/:id` | Modifier (owner) |
| PATCH | `/products/:id/approve` | Approuver (admin) |
| PATCH | `/products/:id/reject` | Rejeter (admin) |
| DELETE | `/products/:id` | Supprimer (owner ou admin) |
| POST | `/products/:id/purchase` | Acheter (auth) |

### 5.2 Logique d'achat

- **Paiement :** Wallet uniquement. Pas de Mobile Money direct.
- Flux : débit `walletBalance` acheteur, crédit vendeur (moins commission 3%), création `ProductPurchase`, création `Transaction` (PRODUCT_PURCHASE), mise à jour stock.

### 5.3 Gestion du stock

- Décrément à l'achat
- Passage en `OUT_OF_STOCK` si stock atteint 0

### 5.4 Upload images

- **CreateProductDto** : `imageUrl` (string, URL) — pas de multipart upload
- **Mobile API** : `create(data: FormData)` avec `Content-Type: multipart/form-data` — **incompatible** avec le DTO backend qui attend JSON avec `imageUrl`
- **Pas d'endpoint d'upload** dédié — l'image doit être une URL externe ou un service d'upload non implémenté

---

## 6. FONCTIONNALITÉS MANQUANTES OU INCOMPLÈTES

### 6.1 Prévu mais non implémenté

- **Création d'annonce** : Pas d'écran mobile pour créer un produit
- **Upload images** : Pas de service d'upload (S3, Cloudinary, etc.)
- **Catégories** : Pas de modèle Category, pas de seed. Le filtre `category` mobile envoie des strings (alimentaire, mode, etc.) alors que le backend attend `categoryId` (UUID)
- **Contacter le vendeur** : Pas de messagerie ou lien
- **Panier** : Pas de panier multi-produits
- **Livraison** : Pas de suivi, adresse, statut livraison

### 6.2 Mocké / incohérent

- **Catégories** : Liste hardcodée côté mobile, non alignée avec le schéma
- **My-purchases** : Structure de réponse API mal parsée — `data.purchases` / `data.sales` non utilisés
- **Web-admin marketplace** : API pointe vers `/marketplace` qui n'existe pas dans le backend (backend utilise `/products`)

### 6.3 Bugs identifiés

1. **My-purchases** : `fetchItems` ne distingue pas `purchases` et `sales`. L'API retourne `{ purchases, sales }` mais le code attend `data.data` ou `data`.
2. **Catégories** : Mobile envoie `category=alimentaire`, backend attend `categoryId` (UUID). Soit validation échoue, soit le filtre est ignoré.
3. **Create product** : Mobile envoie FormData, backend attend JSON avec `imageUrl`. Incompatibilité.
4. **Solde wallet** : Le détail produit lit `user?.walletBalance` depuis le store auth — peut être obsolète si pas de refresh après achat wallet.

---

## 7. LIEN AVEC LE WALLET

| Aspect | Implémentation |
|--------|----------------|
| Débit acheteur | ✅ `walletBalance` décrémenté |
| Crédit vendeur | ✅ `walletBalance` incrémenté (montant - commission) |
| Commission plateforme | ✅ 3% (`PLATFORM_COMMISSION_RATE = 0.03`) |
| Transaction | ✅ Enregistrée avec type `PRODUCT_PURCHASE`, commission stockée |
| Mobile Money | ❌ Non utilisé pour les achats market |
| Notification | ✅ `notifyMarketplacePurchase` (acheteur + vendeur) |

---

## 8. DESIGN SYSTEM MARKET

### 8.1 Couleurs

| Usage | Couleur | Code |
|-------|---------|------|
| Prix | Orange | `#E85D04` |
| Catégorie active | Orange | `#E85D04` |
| Bouton | Orange | `#E85D04` |
| Fond | Gris clair | `#F9FAFB` |
| Carte placeholder | Gris | `#E5E7EB` |

### 8.2 Composants réutilisables

- `PCard`, `PButton`, `PBadge` (détail, my-purchases)
- `EmptyState`, `ErrorMessage`, `LoadingScreen`
- `Card` (react-native-paper) pour les cartes produit

### 8.3 Style des cartes produit

- Grille 2 colonnes, `maxWidth: '50%'`
- Image placeholder 100px hauteur, emoji ou image
- Nom, prix (orange), stock, bouton Acheter

---

## RÉSUMÉ

| Fonctionnalité | État |
|----------------|------|
| Liste produits | ✅ Fonctionnel |
| Détail produit | ✅ Fonctionnel |
| Achat (wallet) | ✅ Fonctionnel |
| Mes achats/ventes | ⚠️ Bug parsing API |
| Filtres | ⚠️ Catégorie incohérente |
| Création produit | ❌ Pas d'écran mobile |
| Upload image | ❌ Incompatible |
| Panier | ❌ Non implémenté |
| Livraison | ❌ Non implémenté |

---

*Rapport généré le 20 février 2026 — Projet PICPEC*
