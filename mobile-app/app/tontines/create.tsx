import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { PButton } from '../../src/components/ui/PButton';
import { PInput } from '../../src/components/ui/PInput';
import { PCard } from '../../src/components/ui/PCard';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { tontinesApi } from '../../src/api/tontines.api';
import { theme } from '../../src/theme';

type Frequence = 'JOURNALIER' | 'HEBDOMADAIRE' | 'MENSUEL' | 'TRIMESTRIEL';

const FREQUENCES: { key: Frequence; label: string; emoji: string; desc: string }[] = [
  { key: 'JOURNALIER', label: 'Journalier', emoji: '📅', desc: 'Chaque jour' },
  { key: 'HEBDOMADAIRE', label: 'Hebdomadaire', emoji: '📆', desc: 'Chaque semaine' },
  { key: 'MENSUEL', label: 'Mensuel', emoji: '🗓️', desc: 'Chaque mois' },
  { key: 'TRIMESTRIEL', label: 'Trimestriel', emoji: '📊', desc: 'Tous les 3 mois' },
];

export default function CreateTontineScreen() {
  const router = useRouter();

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [nombreMembres, setNombreMembres] = useState('');
  const [frequence, setFrequence] = useState<Frequence>('MENSUEL');
  const [tauxPenalite, setTauxPenalite] = useState('5');
  const [dateDebut, setDateDebut] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!titre.trim()) errs.titre = 'Le titre est requis';
    if (!description.trim()) errs.description = 'La description est requise';
    if (!montant || parseFloat(montant) <= 0) errs.montant = 'Montant invalide';
    if (!nombreMembres || parseInt(nombreMembres) < 2) errs.nombreMembres = 'Minimum 2 membres';
    if (parseFloat(tauxPenalite) < 0 || parseFloat(tauxPenalite) > 50) {
      errs.tauxPenalite = 'Entre 0 et 50%';
    }
    if (dateDebut <= new Date()) errs.dateDebut = 'La date doit être dans le futur';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setGlobalError('');
    try {
      const tontine = await tontinesApi.create({
        titre: titre.trim(),
        description: description.trim(),
        montant: parseFloat(montant),
        nombreMembres: parseInt(nombreMembres),
        frequence,
        tauxPenalite: parseFloat(tauxPenalite),
        dateDebut: dateDebut.toISOString(),
      });
      router.replace({ pathname: `/tontines/${tontine.id}` as never, params: { newlyCreated: '1' } });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setGlobalError(err?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const totalParTour = (parseFloat(montant) || 0) * (parseInt(nombreMembres) || 0);
  const dureeLabel = {
    JOURNALIER: `${parseInt(nombreMembres) || 0} jours`,
    HEBDOMADAIRE: `${parseInt(nombreMembres) || 0} semaines`,
    MENSUEL: `${parseInt(nombreMembres) || 0} mois`,
    TRIMESTRIEL: `${(parseInt(nombreMembres) || 0) * 3} mois`,
  }[frequence];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une tontine</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>📝 Informations générales</Text>
          <View style={styles.fieldGroup}>
            <PInput
              label="Titre de la tontine"
              value={titre}
              onChangeText={setTitre}
              placeholder="Ex: Tontine des amis"
              error={errors.titre}
              required
            />
            <PInput
              label="Description / Règles"
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez l'objectif et les règles..."
              error={errors.description}
              multiline
              numberOfLines={3}
              required
            />
          </View>
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>💰 Paramètres financiers</Text>
          <View style={styles.fieldGroup}>
            <PInput
              label="Cotisation par membre / cycle (FCFA)"
              value={montant}
              onChangeText={setMontant}
              placeholder="Ex: 5000"
              keyboardType="decimal-pad"
              error={errors.montant}
              required
            />
            <PInput
              label="Nombre de membres"
              value={nombreMembres}
              onChangeText={setNombreMembres}
              placeholder="Ex: 5"
              keyboardType="number-pad"
              error={errors.nombreMembres}
              hint="Définit aussi le nombre de tours"
              required
            />
            <PInput
              label="Taux de pénalité de retard (%)"
              value={tauxPenalite}
              onChangeText={setTauxPenalite}
              placeholder="Ex: 5"
              keyboardType="decimal-pad"
              error={errors.tauxPenalite}
              hint="Appliqué si un membre paie après la date limite"
              required
            />
          </View>
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>📆 Type de cotisation</Text>
          <View style={styles.freqGrid}>
            {FREQUENCES.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.freqCard, frequence === f.key && styles.freqCardActive]}
                onPress={() => setFrequence(f.key)}
              >
                <Text style={styles.freqEmoji}>{f.emoji}</Text>
                <Text style={[styles.freqLabel, frequence === f.key && styles.freqLabelActive]}>
                  {f.label}
                </Text>
                <Text style={styles.freqDesc}>{f.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>🔒 Accès & Calendrier</Text>

          <View style={styles.comptePriveRow}>
            <View style={styles.comptePriveIcon}>
              <Text style={{ fontSize: 20 }}>🔗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.comptePriveLabel}>Compte privé — Invitation par lien</Text>
              <Text style={styles.comptePriveDesc}>
                Seul le créateur peut partager le lien d'invitation
              </Text>
            </View>
            <View style={styles.comptePriveBadge}>
              <Text style={styles.comptePriveBadgeText}>✓</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Date de début de cotisation *</Text>
            <TouchableOpacity
              style={[styles.dateBtn, errors.dateDebut ? styles.dateBtnError : null]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateBtnEmoji}>📅</Text>
              <Text style={styles.dateBtnText}>
                {dateDebut.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {errors.dateDebut && <Text style={styles.errorText}>{errors.dateDebut}</Text>}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateDebut}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setDateDebut(date);
              }}
              locale="fr-FR"
            />
          )}
        </PCard>

        {montant && nombreMembres && parseInt(nombreMembres) >= 2 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>📊 Résumé de votre tontine</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Chaque membre reçoit</Text>
              <Text style={styles.summaryValue}>{totalParTour.toLocaleString('fr-FR')} FCFA</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Durée totale</Text>
              <Text style={styles.summaryValue}>{dureeLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fréquence</Text>
              <Text style={styles.summaryValue}>{FREQUENCES.find((f) => f.key === frequence)?.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pénalité retard</Text>
              <Text style={styles.summaryValue}>
                {(((parseFloat(montant) || 0) * (parseFloat(tauxPenalite) || 0)) / 100).toLocaleString(
                  'fr-FR'
                )}{' '}
                FCFA
              </Text>
            </View>
          </View>
        )}

        {globalError ? <ErrorMessage message={globalError} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <PButton
          label={loading ? 'Création en cours...' : '🤝 Créer la tontine'}
          onPress={handleSubmit}
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
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  freqCard: {
    width: '47%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  freqCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  freqEmoji: { fontSize: 24, marginBottom: theme.spacing.xs },
  freqLabel: {
    fontSize: theme.typography.size.sm,
    fontWeight: '700',
    color: theme.colors.gray700,
  },
  freqLabelActive: { color: theme.colors.primary },
  freqDesc: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.gray500,
    marginTop: 2,
    textAlign: 'center',
  },
  comptePriveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  comptePriveIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comptePriveLabel: {
    fontSize: theme.typography.size.base,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  comptePriveDesc: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.primary,
    opacity: 0.8,
    marginTop: 2,
  },
  comptePriveBadge: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comptePriveBadgeText: { color: theme.colors.white, fontWeight: '700', fontSize: 12 },
  inputLabel: {
    fontSize: theme.typography.size.sm,
    fontWeight: '600',
    color: theme.colors.gray700,
    marginBottom: theme.spacing.xs,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.gray300,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  dateBtnError: { borderColor: theme.colors.danger },
  dateBtnEmoji: { fontSize: 18 },
  dateBtnText: {
    fontSize: theme.typography.size.base,
    color: theme.colors.black,
    fontWeight: '500',
  },
  errorText: { fontSize: theme.typography.size.sm, color: theme.colors.danger, marginTop: 4 },
  summaryBox: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primaryMuted,
    gap: theme.spacing.sm,
  },
  summaryTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: theme.typography.size.sm, color: theme.colors.gray500 },
  summaryValue: {
    fontSize: theme.typography.size.base,
    fontWeight: '700',
    color: theme.colors.black,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
