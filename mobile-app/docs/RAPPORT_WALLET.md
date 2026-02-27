# RAPPORT D'ANALYSE — WALLET PICPEC

> Analyse complète des fonctionnalités liées au portefeuille et aux transactions du projet PICPEC.

---

## 1. STRUCTURE DES FICHIERS WALLET

### Mobile (Expo/React Native)

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Écran principal wallet | `mobile-app/app/(tabs)/wallet.tsx` | Affiche solde, boutons Dépôt/Retrait/Transfert/Recevoir, modals, FlatList historique |
| Détail transaction | `mobile-app/app/wallet/transaction-detail.tsx` | Détail d'une transaction + partage du reçu |
| Recevoir | `mobile-app/app/wallet/receive.tsx` | Affiche l'ID utilisateur pour recevoir des transferts (copier/partager) |
| PIN | `mobile-app/app/wallet/pin.tsx` | Écran de saisie PIN 4 chiffres (SecureStore) — **non intégré au flux wallet** |
| API wallet | `mobile-app/src/api/wallet.api.ts` | Appels HTTP : getBalance, deposit, withdraw, transfer, getTransactions |
| Store wallet | `mobile-app/src/store/wallet.store.ts` | Store Zustand : balance, transactions, fetchBalance, fetchTransactions |
| Composant AmountInput | `mobile-app/src/components/ui/AmountInput.tsx` | Input montant (XOF) réutilisable |
| Types | `mobile-app/src/types/index.ts` | Interface `Transaction` et types liés |

### Backend (NestJS)

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Controller | `backend/src/wallet/wallet.controller.ts` | Routes : balance, deposit, withdraw, transfer, transactions, transactions/:id |
| Service | `backend/src/wallet/wallet.service.ts` | Logique métier : solde, dépôt, retrait, transfert P2P |
| DTO Deposit | `backend/src/wallet/dto/deposit.dto.ts` | Validation montant (100–10M XOF) |
| DTO Withdraw | `backend/src/wallet/dto/withdraw.dto.ts` | Validation montant (100–5M XOF) |
| DTO Transfer | `backend/src/wallet/dto/transfer.dto.ts` | receiverId, amount, note |
| DTO GetTransactions | `backend/src/wallet/dto/get-transactions.dto.ts` | Pagination + filtres type, status, dateFrom, dateTo |
| Mock wallet (tests) | `backend/src/mock/mock-wallet.service.ts` | MockWallet/MockTransaction pour tests locaux |

### Prisma

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Schema | `backend/prisma/schema.prisma` | Modèles User (walletBalance), Transaction, MockWallet, MockTransaction |

---

## 2. ÉCRAN WALLET EXISTANT

### 2.1 Écran principal `wallet.tsx`

**Contenu complet :**

```tsx
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Text, Button, Modal, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth.store';
import { useWalletStore } from '../../src/store/wallet.store';
import { walletApi } from '../../src/api/wallet.api';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Transaction } from '../../src/types';

type ModalType = 'deposit' | 'withdraw' | 'transfer' | null;

function TransactionItem({ item, onPress }: { item: Transaction; onPress: () => void }) {
  const isCredit = ['DEPOSIT', 'TONTINE_PAYOUT'].includes(item.type);
  const labels: Record<string, string> = {
    DEPOSIT: 'Dépôt',
    WITHDRAW: 'Retrait',
    TRANSFER: 'Transfert',
    TONTINE_PAYMENT: 'Cotisation',
    TONTINE_PAYOUT: 'Gain tontine',
    PRODUCT_PURCHASE: 'Achat',
  };
  return (
    <TouchableOpacity style={styles.txItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.txLeft}>
        <Text style={styles.txType}>{labels[item.type] ?? item.type}</Text>
        <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString('fr-FR')}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? '#16A34A' : '#DC2626' }]}>
        {isCredit ? '+' : '-'}{item.amount.toLocaleString()} XOF
      </Text>
    </TouchableOpacity>
  );
}

export default function WalletScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { balance, transactions, fetchBalance, fetchTransactions, isLoading } = useWalletStore();
  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState(0);
  const [receiverId, setReceiverId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    fetchBalance();
    fetchTransactions();
  }, [isHydrated, accessToken, fetchBalance, fetchTransactions]);

  const handleAction = async () => {
    if (modal === 'transfer' && !receiverId) { setError('ID du destinataire requis'); return; }
    if (amount <= 0) { setError('Montant invalide'); return; }
    setError('');
    setSubmitting(true);
    try {
      if (modal === 'deposit') await walletApi.deposit(amount);
      if (modal === 'withdraw') await walletApi.withdraw(amount);
      if (modal === 'transfer') await walletApi.transfer(receiverId, amount, note);
      await fetchBalance();
      await fetchTransactions();
      setModal(null);
      setAmount(0);
      setReceiverId('');
      setNote('');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceAmount}>{balance.toLocaleString()} XOF</Text>
      </View>
      <View style={styles.actions}>
        {(['deposit', 'withdraw', 'transfer'] as const).map((action) => (
          <Button key={action} mode="contained" onPress={() => { setModal(action); setError(''); setAmount(0); }}
            style={styles.actionBtn}
            buttonColor={action === 'deposit' ? '#16A34A' : action === 'withdraw' ? '#DC2626' : '#E85D04'}>
            {action === 'deposit' ? '⬇ Dépôt' : action === 'withdraw' ? '⬆ Retrait' : '↔ Transfert'}
          </Button>
        ))}
        <Button mode="outlined" onPress={() => router.push('/wallet/receive')} style={styles.receiveBtn}>
          📥 Recevoir
        </Button>
      </View>
      <Text variant="titleMedium" style={styles.historyTitle}>Historique</Text>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TransactionItem item={item} onPress={() => router.push(`/wallet/transaction-detail?id=${item.id}`)} />
        )}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { fetchBalance(); fetchTransactions(); }} />}
        ListEmptyComponent={<EmptyState title="Aucune transaction" subtitle="Votre historique apparaîtra ici" />}
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <Portal>
        <Modal visible={!!modal} onDismiss={() => setModal(null)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>
            {modal === 'deposit' ? 'Effectuer un dépôt' : modal === 'withdraw' ? 'Effectuer un retrait' : 'Transférer des fonds'}
          </Text>
          {modal === 'transfer' && (
            <TextInput placeholder="ID du destinataire (UUID)" value={receiverId} onChangeText={setReceiverId}
              style={[styles.inputBase, styles.modalInput]} />
          )}
          <AmountInput value={amount} onChange={setAmount} />
          <ErrorMessage message={error} />
          <Button mode="contained" onPress={handleAction} loading={submitting} disabled={submitting} style={{ marginTop: 16 }} buttonColor="#E85D04">
            Confirmer
          </Button>
          <Button mode="text" onPress={() => setModal(null)}>Annuler</Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  balanceCard: { backgroundColor: '#E85D04', padding: 32, alignItems: 'center' },
  balanceLabel: { color: '#FED7AA', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8 },
  actionBtn: { flex: 1, minWidth: 80 },
  receiveBtn: { flex: 1, minWidth: 120 },
  historyTitle: { paddingHorizontal: 16, paddingVertical: 8 },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff' },
  txLeft: { gap: 2 },
  txType: { fontWeight: '600', fontSize: 14 },
  txDate: { color: '#9CA3AF', fontSize: 12 },
  txAmount: { fontWeight: 'bold', fontSize: 16 },
  modal: { backgroundColor: '#fff', margin: 24, padding: 24, borderRadius: 16 },
  modalTitle: { marginBottom: 16, fontWeight: 'bold' },
  inputBase: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  modalInput: { marginBottom: 8 },
});
```

**État interne :**
- `modal` : type de modal ouvert (deposit | withdraw | transfer | null)
- `amount`, `receiverId`, `note` : champs des formulaires
- `error`, `submitting` : gestion erreurs et chargement
- `useWalletStore` : balance, transactions, isLoading, fetchBalance, fetchTransactions
- `useAuthStore` : accessToken, isHydrated

**Librairies :** react-native, expo-router, react-native-paper (Button, Modal, Portal, Text), react-native-safe-area-context, zustand

**Mock vs réel :** Tout est réel — appels API vers le backend. Aucune donnée mockée.

---

### 2.2 Écran `transaction-detail.tsx`

- **Source des données :** `useWalletStore().transactions` — pas de fetch par ID. Si la transaction n'est pas dans la liste, affiche "Transaction non trouvée".
- **État :** Aucun useState local. Lit `transactions.find(t => t.id === id)`.
- **Librairies :** react-native, expo-router, Share, theme, PCard, PButton, PBadge
- **Reçu :** Partage via `Share.share()` avec message texte (pas de PDF).

---

### 2.3 Écran `receive.tsx`

- **Données :** `useAuthStore().user?.id` — ID utilisateur pour recevoir des transferts.
- **Actions :** Copier ID (Clipboard), Partager ID (Share), placeholder QR Code (non fonctionnel).
- **Librairies :** expo-clipboard, Share, PCard, PButton

---

### 2.4 Écran `pin.tsx`

- **État :** `pin` (array 4 chiffres), `error`, `shakeAnim` (Animated)
- **Stockage :** `SecureStore.getItemAsync(PIN_KEY)` — clé `picpec_pin`
- **Flux :** Vérifie le PIN, puis `router.replace('/(tabs)/wallet')` si correct. **Aucun lien depuis wallet.tsx** — l'écran PIN n'est jamais appelé dans le flux actuel.
- **Oubli PIN :** Bouton "Oublié votre PIN ?" sans action (pas de reset).

---

## 3. BOUTONS ET ACTIONS DU WALLET

| Bouton | Label / Icône | onPress | Comportement actuel |
|--------|---------------|---------|---------------------|
| Dépôt | ⬇ Dépôt | `setModal('deposit')` | Ouvre modal dépôt. Confirmer → `walletApi.deposit(amount)` → **Fonctionnel** (incrémente walletBalance, crée Transaction DEPOSIT, metadata `method: 'manual'`) |
| Retrait | ⬆ Retrait | `setModal('withdraw')` | Ouvre modal retrait. Confirmer → `walletApi.withdraw(amount)` → **Fonctionnel** (décrémente walletBalance, crée Transaction WITHDRAW) |
| Transfert | ↔ Transfert | `setModal('transfer')` | Ouvre modal avec champ receiverId (UUID). Confirmer → `walletApi.transfer(receiverId, amount, note)` → **Fonctionnel** (P2P, limite 2M XOF/jour) |
| Recevoir | 📥 Recevoir | `router.push('/wallet/receive')` | Navigue vers écran receive → **Fonctionnel** (affiche ID, copier, partager) |
| Confirmer (modal) | Confirmer | `handleAction()` | Exécute l'action selon le modal ouvert |
| Annuler (modal) | Annuler | `setModal(null)` | Ferme le modal |
| Item transaction | — | `router.push('/wallet/transaction-detail?id=...')` | Ouvre le détail → **Fonctionnel** (si transaction dans le store) |
| Partager le reçu | Partager le reçu | `Share.share(...)` | Partage texte du reçu → **Fonctionnel** |
| Copier mon ID | Copier mon ID | `Clipboard.setStringAsync(userId)` | Copie l'ID → **Fonctionnel** |
| Partager mon ID | Partager mon ID | `Share.share(...)` | Partage l'ID → **Fonctionnel** |
| Oublié votre PIN ? | Oublié votre PIN ? | — | **Aucune action** |

---

## 4. MODÈLE DE DONNÉES

### 4.1 User (extrait)

```prisma
model User {
  id            String    @id @default(uuid())
  fullname      String
  email         String    @unique
  walletBalance Decimal   @default(0) @map("wallet_balance") @db.Decimal(15, 2)
  // ...
  transactionsSent    Transaction[] @relation("TransactionSender")
  transactionsReceived Transaction[] @relation("TransactionReceiver")
  // ...
}
```

**Champ balance :** `User.walletBalance` (Decimal) — solde stocké directement sur le modèle User.

### 4.2 Transaction

```prisma
enum TransactionType {
  DEPOSIT
  WITHDRAW
  TRANSFER
  TONTINE_PAYMENT
  TONTINE_PAYOUT
  PRODUCT_PURCHASE
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}

model Transaction {
  id         String   @id @default(uuid())
  senderId   String?  @map("sender_id")
  receiverId String?  @map("receiver_id")
  amount     Decimal  @db.Decimal(15, 2)
  type       TransactionType
  status     TransactionStatus @default(PENDING)
  commission Decimal? @db.Decimal(10, 2)
  reference  String?  @unique
  note       String?
  metadata   Json?    // Pour stocker ref tontine, product, etc.
  createdAt  DateTime @default(now()) @map("created_at")

  sender   User?  @relation("TransactionSender", fields: [senderId], references: [id])
  receiver User? @relation("TransactionReceiver", fields: [receiverId], references: [id])

  @@index([senderId])
  @@index([receiverId])
  @@index([createdAt])
  @@index([type, status])
  @@map("transactions")
}
```

### 4.3 MockWallet / MockTransaction (tests uniquement)

```prisma
model MockWallet {
  id        String   @id @default(cuid())
  userId    String   @unique @map("user_id")
  balance   Float    @default(100000)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions MockTransaction[]

  @@map("mock_wallets")
}

model MockTransaction {
  id          String   @id @default(cuid())
  walletId    String   @map("wallet_id")
  type        String
  amount      Float
  description String
  createdAt   DateTime @default(now()) @map("created_at")

  wallet MockWallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId])
  @@map("mock_transactions")
}
```

**Calcul du solde :** Le solde est un **champ direct** `User.walletBalance`, pas une somme des transactions. Les transactions sont un journal d'audit.

---

## 5. API ET BACKEND WALLET

### 5.1 Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/wallet/balance` | Retourne `{ balance: number }` |
| POST | `/wallet/deposit` | Body: `{ amount }` — incrémente walletBalance, crée Transaction DEPOSIT |
| POST | `/wallet/withdraw` | Body: `{ amount }` — décrémente walletBalance, crée Transaction WITHDRAW |
| POST | `/wallet/transfer` | Body: `{ receiverId, amount, note? }` — transfert P2P |
| GET | `/wallet/transactions` | Query: page, limit, type, status, dateFrom, dateTo — liste paginée |
| GET | `/wallet/transactions/:id` | Détail d'une transaction (non utilisé côté mobile actuellement) |

### 5.2 Chargement du solde

- `useWalletStore().fetchBalance()` → `walletApi.getBalance()` → `GET /wallet/balance` → `WalletService.getBalance(userId)` → `User.walletBalance`

### 5.3 Dépôt (recharge)

- **Actuel :** `POST /wallet/deposit` avec `{ amount }` → incrémente `walletBalance`, crée Transaction avec `metadata: { method: 'manual' }`.
- **Mobile Money :** **Aucune** logique de dépôt via Mobile Money (MTN MoMo, Orange Money, Wave). Le dépôt est manuel/simulé.

### 5.4 Retrait

- **Actuel :** `POST /wallet/withdraw` avec `{ amount }` → décrémente `walletBalance`, crée Transaction WITHDRAW.
- **Mobile Money :** **Aucune** logique de retrait vers Mobile Money.

### 5.5 Transferts entre utilisateurs

- **Fonctionnel** : `POST /wallet/transfer` avec `receiverId` (UUID), `amount`, `note`.
- Limite journalière : 2 000 000 XOF (transfert + retrait cumulés).
- Notifications : `notifyWalletDebit` (expéditeur), `notifyWalletCredit` (destinataire).

### 5.6 Lien avec les tontines

- **Paiement cotisation :** Les cotisations sont payées via **Mobile Money direct** (`/payments/mobile-money`, `usePayment`, `paymentsApi.initiate`) — **pas via le wallet**.
- Le webhook (Wave, Orange, MTN) appelle `payCotisation` qui met à jour la cotisation (status, transactionId, provider) mais **ne crée pas de Transaction** et **ne modifie pas le wallet**.
- **TONTINE_PAYOUT :** Le `disburseCycle` (versement au bénéficiaire) **ne crédite pas le wallet** et **ne crée pas de Transaction TONTINE_PAYOUT**. C'est une lacune majeure.

### 5.7 Lien avec le Market

- **Achat produit :** `products.service.ts` utilise `User.walletBalance` pour payer. Débit acheteur, crédit vendeur, création Transaction `PRODUCT_PURCHASE`. **Le wallet est utilisé.**

---

## 6. TRANSACTIONS

### 6.1 Enregistrement

- **Wallet :** `WalletService.deposit`, `withdraw`, `transfer` créent des `Transaction` via `prisma.transaction.create`.
- **Market :** `ProductsService.purchase` crée une Transaction `PRODUCT_PURCHASE`.
- **Tontines :** `payCotisation` **ne crée pas** de Transaction. `disburseCycle` **ne crée pas** de Transaction TONTINE_PAYOUT.

### 6.2 Types de transactions

| Type | Créé par | Description |
|------|---------|-------------|
| DEPOSIT | WalletService.deposit | Dépôt manuel |
| WITHDRAW | WalletService.withdraw | Retrait |
| TRANSFER | WalletService.transfer | Transfert P2P |
| TONTINE_PAYMENT | — | **Jamais créé** (cotisation payée via Mobile Money) |
| TONTINE_PAYOUT | — | **Jamais créé** (disburseCycle ne crédite pas le wallet) |
| PRODUCT_PURCHASE | ProductsService.purchase | Achat marketplace |

### 6.3 Historique

- **Fonctionnel** : `GET /wallet/transactions` avec pagination et filtres (type, status, dateFrom, dateTo).
- Le store ne charge que la première page (limit 10). Pas de chargement infini/pagination côté mobile.

### 6.4 Reçus

- **Partage :** Bouton "Partager le reçu" dans `transaction-detail.tsx` → `Share.share()` avec message texte.
- **Pas de PDF** ni de reçu formaté.

---

## 7. SÉCURITÉ & PIN

| Fonctionnalité | État |
|----------------|------|
| Code PIN | Écran `pin.tsx` existe, stockage SecureStore, **non intégré** au flux wallet (dépôt/retrait/transfert) |
| Authentification biométrique | **Aucune** |
| Limite transaction journalière | **Oui** : 2 000 000 XOF pour transfert + retrait cumulés (backend) |
| Vérification PIN avant action | **Non** — le PIN n'est jamais demandé avant une action sensible |

---

## 8. FONCTIONNALITÉS MANQUANTES OU INCOMPLÈTES

### 8.1 Prévu mais non implémenté

- Dépôt via Mobile Money (MTN MoMo, Orange Money, Wave)
- Retrait vers Mobile Money
- Intégration du PIN avant dépôt/retrait/transfert
- Crédit du wallet lors du versement tontine (TONTINE_PAYOUT)
- Création de Transaction TONTINE_PAYMENT (pour traçabilité et parrainage)
- QR Code fonctionnel sur l'écran Recevoir
- Récupération du PIN oublié

### 8.2 Simulé / mocké

- **Dépôt/Retrait :** Méthode `manual` — pas de vraie entrée/sortie d'argent.
- **MockWalletService :** Utilisé uniquement pour les tests (`mock-test.controller`, `isLocal()`). Pas utilisé par le wallet principal.

### 8.3 Bugs / incohérences

- **transaction-detail :** Lit les transactions depuis le store. Si l'utilisateur arrive par lien direct ou après refresh, la transaction peut être absente → "Transaction non trouvée". L'API `GET /wallet/transactions/:id` existe mais n'est pas appelée.
- **validateReferralOnFirstPayment :** Vérifie les transactions `TONTINE_PAYMENT` qui ne sont jamais créées → logique de parrainage **jamais déclenchée**.
- **disburseCycle :** Ne crédite pas le wallet du bénéficiaire → le gagnant de tontine ne reçoit rien sur son portefeuille.

---

## 9. LIEN AVEC LES AUTRES MODULES

### 9.1 Tontines

- **Paiement cotisation :** Mobile Money direct (pas le wallet). Flux : `payments/mobile-money` → `paymentsApi.initiate` → checkout externe → webhook → `payCotisation`.
- **Versement bénéficiaire :** `disburseCycle` met à jour le cycle mais **ne crédite pas le wallet**.
- **Parrainage :** Basé sur `TONTINE_PAYMENT` transactions — jamais créées → parrainage inopérant.

### 9.2 Market

- **Achat :** Utilise `User.walletBalance`. Débit acheteur, crédit vendeur, Transaction `PRODUCT_PURCHASE`, notifications.

### 9.3 Cashback / récompenses

- **Referral :** `ReferralRewardType` (PENALTY_CREDIT, CASHBACK, NONE). Le parrain reçoit des `penaltyCredits` si le filleul paie sa première cotisation — mais la validation ne se déclenche jamais (cf. TONTINE_PAYMENT).
- Pas de cashback sur achats ou dépôts.

---

## 10. DESIGN SYSTEM WALLET

### 10.1 Couleurs

| Usage | Couleur | Code |
|-------|---------|------|
| Carte solde | Orange principal | `#E85D04` |
| Label solde | Orange clair | `#FED7AA` |
| Dépôt | Vert | `#16A34A` |
| Retrait | Rouge | `#DC2626` |
| Transfert | Orange | `#E85D04` |
| Crédit (historique) | Vert | `#16A34A` |
| Débit (historique) | Rouge | `#DC2626` |
| Fond | Gris clair | `#F9FAFB` |
| Items transaction | Blanc | `#fff` |

### 10.2 Composants UI réutilisables

- `AmountInput` : Input montant (XOF), `mobile-app/src/components/ui/AmountInput.tsx`
- `ErrorMessage` : Affichage erreur
- `EmptyState` : État vide liste
- `PCard`, `PButton`, `PBage` : Utilisés dans transaction-detail et receive

### 10.3 Style des cartes et items

- **Carte solde :** `backgroundColor: '#E85D04'`, padding 32, centré
- **Items transaction :** `flexDirection: 'row'`, `justifyContent: 'space-between'`, padding 16, bordure basse `#F3F4F6`
- **Modal :** fond blanc, margin 24, padding 24, borderRadius 16

---

## RÉSUMÉ POUR IMPLÉMENTATION

Pour implémenter le wallet complet avec :

1. **Dépôt/retrait Mobile Money :** Réutiliser le flux `payments` (initiate, webhook) en l’adaptant pour créditer/débiter le wallet au lieu de payer une cotisation.
2. **Historique :** Déjà fonctionnel. Ajouter pagination infinie côté mobile si besoin.
3. **Code PIN :** Intégrer `router.push('/wallet/pin?context=deposit')` avant les actions sensibles, et vérifier le PIN côté backend.
4. **Transferts P2P :** Déjà fonctionnels. Améliorer l’UX (recherche par ID/téléphone, QR Code).
5. **Tontines :** Créer des Transactions `TONTINE_PAYMENT` et `TONTINE_PAYOUT`, et créditer le wallet dans `disburseCycle`.

---

*Rapport généré le 20 février 2025 — Projet PICPEC*
