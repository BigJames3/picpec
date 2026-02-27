# Rapport d'analyse — Wallet PICPEC et connexions Market / Tontines

**Date :** 24 février 2025  
**Périmètre :** Analyse uniquement — aucune modification effectuée

---

## 1. WALLET ACTUEL

### 1.1 Solde de l'utilisateur

| Question | Réponse |
|----------|---------|
| **Quel est le solde actuel ?** | Stocké dans `User.walletBalance` (Decimal, DB). Récupéré via `GET /wallet/balance` → `WalletService.getBalance(userId)`. |
| **Comment est-il affiché dans wallet.tsx ?** | ✅ Implémenté — Affiché dans une carte orange : `{balance.toLocaleString()} XOF` (ligne 228-229). Source : `useWalletStore().balance` qui appelle `walletApi.getBalance()`. |
| **Le solde est-il rechargé après chaque transaction ?** | ⚠️ Partiel — Après dépôt/retrait/transfert dans wallet.tsx : `fetchBalance()` et `fetchTransactions()` sont appelés. Après achat produit : `fetchBalance()` est appelé (wallet store). **Mais** : le store auth (`user.walletBalance`) n'est jamais mis à jour après transactions. |
| **Types de transactions** | ✅ Implémenté — `TransactionType` : DEPOSIT, WITHDRAW, TRANSFER, TONTINE_PAYMENT, TONTINE_PAYOUT, PRODUCT_PURCHASE (schema.prisma L27-33). |
| **Limite de solde ou transaction ?** | ⚠️ Partiel — **Limite journalière** : 2 000 000 XOF pour TRANSFER et WITHDRAW (`DAILY_LIMIT_XOF` dans wallet.service.ts L21). Pas de limite sur le solde max. Pas de limite par transaction (sauf solde insuffisant). |

---

## 2. CONNEXION WALLET → MARKET

### 2.1 Flux d'achat produit

| Question | Réponse |
|----------|---------|
| **Comment l'achat est-il déclenché ?** | ✅ Implémenté — Bouton "Acheter maintenant" → `handleBuy()` ouvre modal → "Confirmer l'achat" → `handleConfirmPurchase()` appelle `productsApi.purchase(product.id, quantity, shippingAddress)`. |
| **Le solde wallet est-il vérifié avant l'achat ?** | ✅ Implémenté — Backend : `products.service.ts` L199-203 vérifie `Number(buyer.walletBalance) < totalAmount` → `BadRequestException('Insufficient balance')`. Frontend : `canBuy = balance >= total` désactive le bouton. |
| **Si solde insuffisant → que se passe-t-il ?** | ✅ Implémenté — Bouton "Confirmer l'achat" désactivé (`disabled={!canBuy \|\| submitting}`). Backend rejette avec 400 si contourné. Erreur affichée via `ErrorMessage`. |
| **Après achat → solde mis à jour en temps réel ?** | ⚠️ Partiel — `fetchBalance()` (wallet store) est appelé après achat. **Bug** : la page produit utilise `balance = user?.walletBalance` (auth store), pas le wallet store. L'auth store n'est jamais rafraîchi → solde affiché dans la modal reste obsolète si l'utilisateur revient sur une autre fiche produit. |
| **Confirmation avant débit ?** | ✅ Implémenté — Modal "Confirmer l'achat" avec récap (produit, quantité, total, solde disponible, adresse livraison). |

---

## 3. CONNEXION WALLET → TONTINES

### 3.1 Flux de paiement cotisation

| Question | Réponse |
|----------|---------|
| **Comment la cotisation est-elle payée ?** | ✅ Implémenté — Bouton "Payer ma cotisation" → redirection vers `/payments/mobile-money` avec `tontineId`, `amount`, `tontineTitle`. |
| **Wallet ou Mobile Money direct ?** | ❌ **Mobile Money uniquement** — Le paiement tontine utilise **uniquement** Mobile Money (MTN, Orange, Wave). Le wallet n'est **pas** utilisé pour payer les cotisations. Flux : `paymentsApi.initiate()` → `POST /payments/initiate` → `PaymentService.initiateCotisationPayment()` → checkout URL externe. |
| **Le solde est-il vérifié avant paiement ?** | ❌ Non applicable — Pas de débit wallet. Le paiement est externe (Mobile Money). |
| **Après paiement → solde mis à jour ?** | ❌ Non applicable — Le wallet n'est pas débité. Le bénéficiaire du tour reçoit le montant sur son wallet via `disburseCycle()` (crédit `walletBalance`). |
| **Les pénalités sont-elles débitées du wallet ?** | ❌ Non applicable — Les pénalités (retard) sont incluses dans le montant total payé via Mobile Money. `payCotisation()` calcule `totalPaye = montant + penalite` et crée une Transaction TONTINE_PAYMENT (audit). Aucun débit wallet. |

---

## 4. TRANSACTIONS

| Question | Réponse |
|----------|---------|
| **L'historique montre-t-il les achats market ?** | ✅ Implémenté — Les transactions `PRODUCT_PURCHASE` sont créées (products.service.ts L238-249) et récupérées par `getTransactions()`. Labels dans wallet.tsx : `PRODUCT_PURCHASE: 'Achat'`. |
| **L'historique montre-t-il les paiements tontine ?** | ✅ Implémenté — `TONTINE_PAYMENT` et `TONTINE_PAYOUT` sont affichés (labels "Cotisation", "Gain tontine"). |
| **Filtre par type de transaction ?** | ⚠️ Partiel — Backend : `GetTransactionsDto` supporte `type`, `status`, `dateFrom`, `dateTo`. **Frontend** : `wallet.store.ts` et `wallet.tsx` n'utilisent pas ces filtres — uniquement `{ page, limit }`. |
| **Transactions paginées ?** | ✅ Implémenté — `limit: 10`, `page` incrémenté, `hasMore`, `onEndReached` pour charger plus. |

---

## 5. SÉCURITÉ

| Question | Réponse |
|----------|---------|
| **PIN demandé avant transactions ?** | ⚠️ Partiel — **Wallet** (dépôt, retrait, transfert) : PIN demandé si `SecureStore.getItemAsync('picpec_pin')` existe → redirection vers `/wallet/pin`. **Achat produit** : ❌ Pas de PIN. **Paiement tontine** : ❌ Pas de PIN (Mobile Money gère l'authentification). **Backend** : `verify-pin` existe mais le token `actionToken` n'est **pas** utilisé pour sécuriser les endpoints wallet/dépôt/retrait/transfer. |
| **Limite par transaction ?** | ❌ Non implémenté — Pas de plafond par opération (sauf solde). |
| **Limite journalière ?** | ✅ Implémenté — 2 000 000 XOF/jour pour TRANSFER et WITHDRAW (`checkDailyLimit` dans wallet.service.ts). |
| **Transactions atomiques ?** | ✅ Implémenté — `prisma.$transaction` utilisé pour : dépôt, retrait, transfer, achat produit, payCotisation, disburseCycle. |

---

## 6. UX

| Question | Réponse |
|----------|---------|
| **L'utilisateur voit-il son solde avant de confirmer ?** | ⚠️ Partiel — **Achat produit** : oui, modal affiche "Solde disponible: X XOF". **Tontine** : montant à payer affiché, pas de solde wallet (paiement Mobile Money). **Wallet** : solde visible en haut, pas dans la modal. |
| **État de chargement pendant le paiement ?** | ✅ Implémenté — `submitting` / `loading` sur les boutons. |
| **Erreurs bien affichées ?** | ✅ Implémenté — Composant `ErrorMessage`, messages backend propagés. |
| **Reçu après transaction ?** | ⚠️ Partiel — Page détail transaction (`/wallet/transaction-detail`) avec bouton "Partager le reçu" (Share). Pas de reçu PDF/email automatique. |

---

## 7. RÉSUMÉ PAR SECTION

| Section | Statut |
|---------|--------|
| Wallet actuel | ✅ Implémenté et fonctionnel |
| Connexion Wallet → Market | ⚠️ Partiellement implémenté |
| Connexion Wallet → Tontines | ❌ Non implémenté (Mobile Money uniquement) |
| Transactions | ✅ Implémenté et fonctionnel |
| Sécurité | ⚠️ Partiellement implémenté |
| UX | ⚠️ Partiellement implémenté |

---

## 8. CONNEXIONS MANQUANTES

1. **Paiement cotisation via wallet** — Aucune option pour payer une cotisation tontine avec le solde wallet. Seul Mobile Money est proposé.
2. **Synchronisation auth store / wallet store** — Après achat produit (ou toute transaction), `user.walletBalance` dans l'auth store n'est pas mis à jour. La page produit lit cette valeur → solde potentiellement obsolète.
3. **Filtres transactions dans l'UI** — Le backend supporte `type`, `status`, `dateFrom`, `dateTo` mais le frontend ne les expose pas.
4. **PIN pour achat produit** — Aucune vérification PIN avant achat market, contrairement aux opérations wallet.
5. **actionToken non utilisé** — `verify-pin` génère un token mais aucun endpoint ne le requiert pour les opérations sensibles.

---

## 9. BUGS IDENTIFIÉS

1. **Solde obsolète sur la page produit** — `products/[id].tsx` utilise `user?.walletBalance` (auth store). Après un achat, seul le wallet store est rafraîchi. Si l'utilisateur navigue vers un autre produit sans recharger la page, le solde affiché peut être incorrect.
2. **Montant tontine dans l'UI** — La page `tontines/[id]` envoie `amount: tontine.montant` à mobile-money. Si une pénalité s'applique, le montant affiché peut être inférieur au montant réellement débité (le backend utilise `cotisation.montant + cotisation.penalite`). L'écran mobile-money affiche le montant passé en paramètre, pas le montant réel.
3. **Pas de refresh wallet après paiement tontine** — Après un paiement Mobile Money tontine réussi (webhook), le frontend ne reçoit pas de mise à jour. L'utilisateur doit rafraîchir manuellement pour voir la transaction TONTINE_PAYMENT et le nouveau solde (si bénéficiaire d'un tour).
4. **Gestion erreur fetchBalance** — `wallet.store.ts` : `fetchBalance` ne gère pas les erreurs (pas de try/catch). En cas d'échec API, le solde reste à 0 ou inchangé sans feedback.

---

## 10. RECOMMANDATIONS UX

1. **Unifier la source du solde** — Utiliser le wallet store comme source unique, ou synchroniser l'auth store après chaque `fetchBalance()` (via `updateUser({ walletBalance })`).
2. **Option "Payer avec le wallet" pour les tontines** — Proposer le choix : Mobile Money OU solde wallet si suffisant.
3. **Afficher le montant total (avec pénalité) sur l'écran tontine** — Récupérer la cotisation en attente (montant + pénalité) et l'afficher avant redirection vers Mobile Money.
4. **Filtres sur l'historique** — Ajouter des filtres par type (Dépôt, Retrait, Achat, Cotisation, etc.) et par période.
5. **PIN pour achat produit** — Aligner avec les opérations wallet : demander le PIN avant confirmation d'achat si configuré.
6. **Reçu automatique** — Envoyer une notification avec récapitulatif après chaque transaction, ou proposer un reçu téléchargeable.
7. **Feedback visuel solde insuffisant** — Sur la page produit, si `balance < total`, afficher un message explicite "Solde insuffisant. Rechargez votre wallet." avec lien vers l'onglet wallet.

---

*Rapport généré par analyse statique du code — aucune modification effectuée.*
