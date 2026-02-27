import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Share,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../../src/theme';
import { productsApi } from '../../src/api/products.api';
import { useAuthStore } from '../../src/store/auth.store';
import { Product } from '../../src/types';
import { PButton } from '../../src/components/ui/PButton';
import { PInput } from '../../src/components/ui/PInput';
import { PBadge } from '../../src/components/ui/PBadge';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { useWalletStore } from '../../src/store/wallet.store';

function getInitials(user: { fullName?: string; fullname?: string }): string {
  const name = user?.fullName ?? (user as { fullname?: string })?.fullname ?? '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    pinVerified?: string;
    context?: string;
    productId?: string;
    quantity?: string;
    amount?: string;
    shippingAddress?: string;
  }>();
  const { id } = params;
  const user = useAuthStore((s) => s.user);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [confirmModal, setConfirmModal] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const balance = useWalletStore((s) => s.balance);
  const refreshBalance = useWalletStore((s) => s.refreshBalance);

  const fetchProduct = async () => {
    if (!id) return;
    try {
      const { data } = await productsApi.getById(id);
      setProduct(data);
    } catch (e) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Erreur chargement'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    refreshBalance().catch(() => {});
  }, [refreshBalance]);

  useEffect(() => {
    if (
      params.pinVerified === 'true' &&
      params.context === 'purchase' &&
      params.productId &&
      product?.id === params.productId
    ) {
      const qty = parseInt(params.quantity ?? '1', 10);
      const addr = params.shippingAddress ?? '';
      const doPurchase = async () => {
        if (!product) return;
        setSubmitting(true);
        setError('');
        try {
          await productsApi.purchase(product.id, qty, addr || undefined);
          await refreshBalance();
          router.back();
        } catch (e) {
          setError(
            (e as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? 'Erreur achat'
          );
        } finally {
          setSubmitting(false);
        }
      };
      doPurchase();
    }
  }, [params.pinVerified, params.context, params.productId, product?.id]);

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `${product.name} - ${product.price.toLocaleString()} XOF`,
        title: product.name,
      });
    } catch {}
  };

  const contactVendeur = () => {
    const seller = product?.seller as { whatsapp?: string; phone?: string } | undefined;
    const numero = seller?.whatsapp || seller?.phone;
    if (!numero) {
      Alert.alert('Contact', "Le vendeur n'a pas renseigné de numéro WhatsApp");
      return;
    }
    const message = encodeURIComponent(
      `Bonjour, je suis intéressé par votre produit "${product?.name}" sur PICPEC.`
    );
    Linking.openURL(`https://wa.me/${numero.replace(/\D/g, '')}?text=${message}`);
  };

  const handleBuy = async () => {
    if (!product) return;
    const total = product.price * quantity;
    const currentBalance = useWalletStore.getState().balance;

    if (currentBalance < total) {
      Alert.alert(
        '💳 Solde insuffisant',
        `Votre solde : ${currentBalance} XOF\n` +
          `Prix : ${total} XOF\n\n` +
          'Voulez-vous recharger votre wallet ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Recharger',
            onPress: () => router.push('/wallet' as never),
          },
        ],
      );
      return;
    }

    const hasPin = await SecureStore.getItemAsync('picpec_pin');

    if (hasPin) {
      router.push({
        pathname: '/wallet/pin',
        params: {
          context: 'purchase',
          productId: product.id,
          quantity: String(quantity),
          amount: String(total),
          shippingAddress: shippingAddress || '',
          returnTo: `/products/${product.id}`,
        },
      });
      return;
    }

    setConfirmModal(true);
    setError('');
  };

  const handleConfirmPurchase = async () => {
    if (!product) return;
    setSubmitting(true);
    setError('');
    try {
      await productsApi.purchase(product.id, quantity, shippingAddress || undefined);
      await refreshBalance();
      setConfirmModal(false);
      router.back();
    } catch (e) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Erreur achat'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !product) return <LoadingScreen />;
  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backBtn}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Produit</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Produit introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const img = product.imageUrl ?? (product.images && product.images[0]);
  const sellerName =
    (product.seller as { fullName?: string })?.fullName ??
    (product.seller as { fullname?: string })?.fullname ??
    'Vendeur';
  const total = product.price * quantity;
  const canBuy = balance >= total && product.stock >= quantity && product.status !== 'OUT_OF_STOCK';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <Pressable onPress={handleShare} hitSlop={12}>
          <Text style={styles.shareBtn}>🔗</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {img ? (
            <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>📦</Text>
            </View>
          )}
        </View>

        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.price}>{product.price.toLocaleString()} XOF</Text>

        <View style={styles.stockRow}>
          <PBadge
            label={
              product.stock > 0 && product.status !== 'OUT_OF_STOCK'
                ? `Stock: ${product.stock}`
                : 'Rupture'
            }
            variant={
              product.stock > 0 && product.status !== 'OUT_OF_STOCK'
                ? 'success'
                : 'danger'
            }
          />
        </View>

        <Pressable
          style={styles.sellerRow}
          onPress={() => router.push(`/users/${(product.seller as { id?: string })?.id ?? ''}` as never)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(product.seller as { fullName?: string; fullname?: string })}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{sellerName}</Text>
            <Text style={styles.sellerLink}>Voir profil</Text>
          </View>
        </Pressable>

        <PButton
          label="💬 Contacter le vendeur"
          onPress={contactVendeur}
          variant="outline"
          size="sm"
          fullWidth
        />

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {product.description || 'Aucune description.'}
        </Text>
      </ScrollView>

      <View style={styles.stickyBar}>
        <View style={styles.quantityRow}>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </Pressable>
          <Text style={styles.quantityText}>{quantity}</Text>
          <Pressable
            style={styles.qtyBtn}
            onPress={() =>
              setQuantity((q) => Math.min(product.stock, q + 1))
            }
            disabled={quantity >= product.stock}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.buyRow}>
          <Text style={styles.totalLabel}>
            Total: {total.toLocaleString()} XOF
          </Text>
          <PButton
            label="Acheter maintenant"
            onPress={handleBuy}
            disabled={
              product.stock <= 0 ||
              product.status === 'OUT_OF_STOCK' ||
              quantity > product.stock
            }
          />
        </View>
      </View>

      <Modal
        visible={confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setConfirmModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Confirmer l'achat</Text>
            <Text style={styles.modalProduct}>
              {product.name} × {quantity}
            </Text>
            <Text style={styles.modalTotal}>
              Total: {total.toLocaleString()} XOF
            </Text>
            <Text style={styles.modalBalance}>
              Solde disponible: {balance.toLocaleString()} XOF
            </Text>
            <PInput
              label="Adresse de livraison"
              value={shippingAddress}
              onChangeText={setShippingAddress}
              placeholder="Quartier, Ville, Pays..."
              hint="Le vendeur vous contactera pour la livraison"
            />
            <ErrorMessage message={error} />
            <PButton
              label="Confirmer l'achat"
              onPress={handleConfirmPurchase}
              loading={submitting}
              disabled={!canBuy || submitting}
              fullWidth
              style={styles.modalBtn}
            />
            <PButton
              label="Annuler"
              onPress={() => setConfirmModal(false)}
              variant="outline"
              fullWidth
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    fontSize: theme.typography.size.lg,
    fontWeight: '600',
    color: theme.colors.black,
  },
  shareBtn: { fontSize: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.danger, fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 180 },
  imageContainer: {
    height: 280,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray100,
    marginBottom: theme.spacing.lg,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: { fontSize: 80 },
  productName: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing.sm,
  },
  price: {
    fontSize: theme.typography.size.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  stockRow: { marginBottom: theme.spacing.lg },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: theme.typography.size.md, fontWeight: '600', color: theme.colors.black },
  sellerLink: { fontSize: theme.typography.size.sm, color: theme.colors.primary },
  sectionTitle: {
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.size.base,
    color: theme.colors.gray700,
    lineHeight: 22,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 20, fontWeight: '600', color: theme.colors.gray700 },
  quantityText: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.size.lg,
    fontWeight: '600',
  },
  buyRow: { gap: theme.spacing.md },
  totalLabel: {
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.typography.size.xl,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing.lg,
  },
  modalProduct: { fontSize: theme.typography.size.base, marginBottom: 4 },
  modalTotal: {
    fontSize: theme.typography.size.lg,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  modalBalance: { fontSize: theme.typography.size.sm, color: theme.colors.gray500, marginBottom: theme.spacing.lg },
  modalBtn: { marginBottom: theme.spacing.sm },
});
