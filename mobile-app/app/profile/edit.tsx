import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PButton } from '../../src/components/ui/PButton';
import { PInput } from '../../src/components/ui/PInput';
import { PCard } from '../../src/components/ui/PCard';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { useAuthStore } from '../../src/store/auth.store';
import { usersApi } from '../../src/api/users.api';
import { theme } from '../../src/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullname(user.fullName ?? (user as { fullname?: string }).fullname ?? '');
      setPhone(user.phone ?? '');
      setCountry(user.country ?? '');
      setCity(user.city ?? '');
      setWhatsapp(user.whatsapp ?? '');
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const updated = await usersApi.updateMe({
        fullname: fullname.trim() || undefined,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
      });
      await updateUser({
        fullName: updated.fullname ?? fullname,
        fullname: updated.fullname,
        phone: updated.phone,
        country: updated.country,
        city: updated.city,
        whatsapp: updated.whatsapp,
      });
      router.back();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Erreur lors de la mise à jour'
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
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>📝 Informations</Text>
          <PInput
            label="Nom complet"
            value={fullname}
            onChangeText={setFullname}
            placeholder="Votre nom"
          />
          <PInput
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Ex: +2250700000000"
            keyboardType="phone-pad"
          />
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>📍 Localisation</Text>
          <PInput
            label="🌍 Pays"
            value={country}
            onChangeText={setCountry}
            placeholder="Ex: CI, SN, CM..."
            hint="Permet aux acheteurs de trouver vos produits"
          />
          <PInput
            label="🏙️ Ville"
            value={city}
            onChangeText={setCity}
            placeholder="Ex: Abidjan, Dakar, Douala..."
          />
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>📱 Contact vendeur</Text>
          <PInput
            label="WhatsApp"
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="Ex: +2250700000000"
            keyboardType="phone-pad"
            hint="Pour que les acheteurs puissent vous contacter"
          />
        </PCard>

        {error && <ErrorMessage message={error} />}

        <PButton
          label={loading ? 'Enregistrement...' : 'Enregistrer'}
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.saveBtn}
        />
      </ScrollView>
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
  content: { padding: theme.spacing.lg, paddingBottom: 48 },
  sectionTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
  },
  saveBtn: { marginTop: theme.spacing.lg },
});
