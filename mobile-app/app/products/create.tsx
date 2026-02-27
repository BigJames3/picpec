import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { PButton } from '../../src/components/ui/PButton';
import { PInput } from '../../src/components/ui/PInput';
import { PCard } from '../../src/components/ui/PCard';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { productsApi } from '../../src/api/products.api';
import { theme } from '../../src/theme';

const CATEGORIES_FALLBACK = [{ id: '', name: 'Sélectionner une catégorie', emoji: '📦', slug: '' }];

export default function CreateProductScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [categories, setCategories] = useState(CATEGORIES_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    productsApi
      .getCategories()
      .then((cats) =>
        setCategories([
          { id: '', name: 'Sélectionner une catégorie', emoji: '📦', slug: '' },
          ...cats,
        ])
      )
      .catch(() => {});
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Accès à la galerie requis');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Le nom est requis';
    if (!price || parseFloat(price) <= 0) errs.price = 'Prix invalide';
    if (!stock || parseInt(stock, 10) < 0) errs.stock = 'Stock invalide';
    if (!categoryId) errs.categoryId = 'Catégorie requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setLoading(true);
    setGlobalError('');
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('categoryId', categoryId);
      if (image) {
        formData.append('image', {
          uri: image,
          type: 'image/jpeg',
          name: 'product.jpg',
        } as unknown as Blob);
      }
      await productsApi.create(formData);
      Alert.alert(
        '✅ Annonce soumise',
        "Votre annonce est en cours de validation par l'équipe PICPEC. Elle sera visible après approbation.",
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: unknown) {
      setGlobalError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la publication'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une annonce</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>📸 Photo du produit</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <View style={styles.imagePreview}>
                <Text style={{ fontSize: 60 }}>🖼</Text>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📷</Text>
                <Text style={styles.imagePlaceholderText}>
                  Appuyer pour ajouter une photo
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {image && (
            <TouchableOpacity onPress={pickImage} style={{ marginTop: 8 }}>
              <Text style={styles.changeImage}>Changer la photo</Text>
            </TouchableOpacity>
          )}
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>📝 Informations</Text>
          <View style={styles.fieldGroup}>
            <PInput
              label="Nom du produit"
              value={name}
              onChangeText={setName}
              placeholder="Ex: Robe en pagne africain"
              error={errors.name}
              required
            />
            <PInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez votre produit, matière, taille, état..."
              multiline
              numberOfLines={4}
            />
          </View>
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>💰 Prix & Stock</Text>
          <View style={styles.fieldGroup}>
            <PInput
              label="Prix (XOF)"
              value={price}
              onChangeText={setPrice}
              placeholder="Ex: 15000"
              keyboardType="numeric"
              error={errors.price}
              required
            />
            <PInput
              label="Quantité disponible"
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
              placeholder="Ex: 10"
              error={errors.stock}
              required
            />
          </View>
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>🏷️ Catégorie</Text>
          <View style={styles.categoriesGrid}>
            {categories
              .filter((c) => c.id)
              .map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catChip,
                    categoryId === c.id && styles.catChipActive,
                  ]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={styles.catEmoji}>{c.emoji || '📦'}</Text>
                  <Text
                    style={[
                      styles.catName,
                      categoryId === c.id && styles.catNameActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
          {errors.categoryId && (
            <Text style={styles.errorText}>{errors.categoryId}</Text>
          )}
        </PCard>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Votre annonce sera visible après validation par l'équipe PICPEC
            (sous 24h). Vos coordonnées (pays, ville, WhatsApp) seront affichées
            aux acheteurs.
          </Text>
        </View>

        {globalError && <ErrorMessage message={globalError} />}
      </ScrollView>

      <View style={styles.footer}>
        <PButton
          label={loading ? 'Publication en cours...' : '🚀 Publier mon annonce'}
          onPress={handlePublish}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: theme.colors.black, fontWeight: '600' },
  headerTitle: {
    fontSize: theme.typography.size.md,
    fontWeight: '700',
    color: theme.colors.black,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
  },
  fieldGroup: { gap: theme.spacing.md },
  imagePicker: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.gray50,
  },
  imagePlaceholderIcon: { fontSize: 40 },
  imagePlaceholderText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    textAlign: 'center',
  },
  imagePreview: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray100,
  },
  changeImage: {
    textAlign: 'center',
    color: theme.colors.primary,
    fontSize: theme.typography.size.sm,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  catChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  catEmoji: { fontSize: 16 },
  catName: {
    fontSize: theme.typography.size.sm,
    fontWeight: '600',
    color: theme.colors.gray700,
  },
  catNameActive: { color: theme.colors.primary },
  errorText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.danger,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    fontSize: theme.typography.size.sm,
    color: '#1E40AF',
    lineHeight: 20,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
