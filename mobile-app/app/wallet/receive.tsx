import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../src/store/auth.store';
import { theme } from '../../src/theme';
import { PCard } from '../../src/components/ui/PCard';
import { PButton } from '../../src/components/ui/PButton';

export default function ReceiveScreen() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(userId);
    Alert.alert('Copié', 'Votre ID a été copié dans le presse-papier.');
  };

  const handleShare = async () => {
    await Share.share({
      message: `Mon ID PICPEC pour recevoir des transferts: ${userId}`,
      title: 'Recevoir de l\'argent',
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Recevoir de l'argent</Text>

      <PCard padding="lg" style={styles.card}>
        <Text style={styles.label}>Mon ID utilisateur</Text>
        <Text style={styles.userId} selectable>
          {userId || '—'}
        </Text>
        <PButton
          label="Copier mon ID"
          onPress={handleCopy}
          variant="outline"
          fullWidth
          style={{ marginTop: 16 }}
        />
      </PCard>

      <Text style={styles.instructions}>
        Partagez votre ID pour recevoir un transfert. L'expéditeur devra
        saisir cet ID dans l'application.
      </Text>

      <View style={styles.qrContainer}>
        <QRCode
          value={userId || ''}
          size={180}
          color="#0F172A"
          backgroundColor="#FFFFFF"
        />
        <Text style={styles.qrHint}>
          Faites scanner ce QR Code pour recevoir un transfert
        </Text>
      </View>

      <PButton
        label="Partager mon ID"
        onPress={handleShare}
        fullWidth
        style={{ marginTop: 24 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  back: { marginBottom: 24 },
  backText: { fontSize: 16, color: theme.colors.primary },
  title: {
    fontSize: theme.typography.size.xl,
    fontWeight: 'bold',
    color: theme.colors.black,
    marginBottom: 24,
  },
  card: { marginBottom: 24 },
  label: { fontSize: 14, color: theme.colors.gray500, marginBottom: 8 },
  userId: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: theme.colors.black,
  },
  instructions: {
    fontSize: 14,
    color: theme.colors.gray500,
    lineHeight: 22,
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 16,
  },
  qrHint: {
    fontSize: 12,
    color: theme.colors.gray500,
    textAlign: 'center',
    marginTop: 12,
  },
});
