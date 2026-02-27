# Analyse Schema Prisma vs Code

## 1. Champs utilisés mais absents du schema

**Aucun.** Tous les champs utilisés dans le code (seed, simulate, notifications, products, tontines, wallet, users, posts) sont présents dans le schema.

### Détail par module

| Module | Champs utilisés | Présent schema |
|--------|-----------------|----------------|
| **seed.ts** | User (fullname, email, phone, passwordHash, role, walletBalance), Post (userId, videoUrl, description, likesCount), PostLike (postId, userId), Comment (postId, userId, content), Tontine (title, description, contributionAmount, frequency, membersLimit, status, creatorId, currentTurn, currentCycle, nextPaymentDate), TontineMember (tontineId, userId, turnOrder, isPaid, paidAt, paidCycles), Transaction (receiverId, senderId, amount, type, status, reference), Product (sellerId, name, description, price, stock, status), Notification (userId, title, body, type, isRead) | ✅ Tous |
| **simulate.ts** | User (id, email, walletBalance, role), PostLike (postId, userId), Post (id, likesCount), Transaction (senderId, receiverId, amount, type, status, reference), Notification (userId, title, body, type), TontineMember (tontineId, userId) | ✅ Tous |
| **notifications/** | Notification (userId, title, body, type, metadata, isRead, createdAt) | ✅ Tous |
| **products/** | Product (id, sellerId, name, description, price, stock, status, imageUrl, createdAt), ProductPurchase (productId, buyerId, quantity, totalAmount, status), Transaction (senderId, receiverId, amount, type, status, commission, reference, metadata), User (walletBalance) | ✅ Tous |
| **tontines/** | Tontine (id, title, description, contributionAmount, frequency, membersLimit, status, creatorId, currentTurn, currentCycle, nextPaymentDate, alertSentAt), TontineMember (tontineId, userId, turnOrder, isPaid, paidAt, paidCycles), User (walletBalance, fullname, avatarUrl), Transaction (senderId, receiverId, amount, type, status, reference, metadata) | ✅ Tous |
| **wallet/** | User (walletBalance, fullname), Transaction (senderId, receiverId, amount, type, status, reference, note, metadata, createdAt) | ✅ Tous |

### Note sur GetProductsDto.categoryId

Le DTO `GetProductsDto` définit `categoryId` (IsUUID) mais :
- Le modèle `Product` n'a pas de champ `categoryId`
- Le service `products.service.ts` ne filtre pas par `categoryId` dans `findAll`
- **Conclusion** : Champ prévu pour évolution future, non implémenté. On ne l'ajoute pas au schema tant que la logique métier ne l'utilise pas.

---

## 2. Enums manquants

**Aucun.** Tous les enums utilisés sont définis :

| Enum | Utilisé dans |
|------|--------------|
| Role | seed, users |
| TontineStatus | seed, tontines |
| TontineFrequency | seed, tontines |
| TransactionType | seed, simulate, products, tontines, wallet |
| TransactionStatus | seed, simulate, products, tontines, wallet |
| ProductStatus | seed, products |
| NotificationType | seed, notifications, simulate |

---

## 3. Modèles manquants

**Aucun.** Tous les modèles utilisés existent : User, Post, Comment, PostLike, Tontine, TontineMember, Transaction, Product, ProductPurchase, Notification.

---

## 4. Relations nécessaires

Toutes les relations sont correctement définies :

| Relation | Schema actuel | Statut |
|----------|---------------|--------|
| User → Post | ✅ | OK |
| User → Comment | ✅ | OK |
| User → PostLike | ✅ | OK |
| User → Tontine (creator) | ✅ | OK |
| User → TontineMember | ✅ | OK |
| User → Transaction (sender/receiver) | ✅ | OK |
| User → Product (seller) | ✅ | OK |
| User → ProductPurchase (buyer) | ✅ | OK |
| User → Notification | ✅ | OK |
| Post → Comment | ✅ | OK |
| Post → PostLike | ✅ | OK |
| Tontine → TontineMember | ✅ | OK |
| Product → ProductPurchase | ✅ | OK |

---

## 5. Index recommandés

### Index manquants identifiés

| Modèle | Index recommandé | Justification |
|--------|------------------|---------------|
| **Product** | `[status]` | Filtrage fréquent par status (ACTIVE) dans findAll |
| **Product** | `[sellerId]` | getMyPurchases filtre par product.sellerId |
| **Product** | `[createdAt]` | Tri par date dans findAll |
| **Tontine** | `[status]` | Scheduler filtre par status ACTIVE |
| **Tontine** | `[nextPaymentDate]` | Scheduler filtre par nextPaymentDate |
| **Tontine** | `[creatorId]` | Liste par créateur (optionnel) |
| **TontineMember** | `[tontineId]` | findMany where tontineId (déjà couvert par unique partiel) |
| **ProductPurchase** | `[buyerId]` | getMyPurchases filtre par buyerId |
| **ProductPurchase** | `[productId]` | Jointures product |
| **Comment** | `[postId]` | Comptage comments par post |

### Index déjà présents (à conserver)

- Post: userId, createdAt
- Transaction: senderId, receiverId, createdAt, type+status
- Notification: userId, isRead, createdAt
- TontineMember: unique(tontineId, userId)
- PostLike: unique(postId, userId)

---

## 6. Autres observations

1. **Transaction.amount** : Pour DEPOSIT, le seed utilise `amount` sans `senderId` (correct, senderId optionnel).
2. **Transaction.receiverId** : Pour WITHDRAW, wallet.service n'envoie pas receiverId (correct, receiverId optionnel).
3. **ProductPurchase.status** : Utilise TransactionStatus (COMPLETED). Cohérent.
4. **Comment** : Pas de `updatedAt` — acceptable pour des commentaires immuables.
5. **Tontine.alertSentAt** : Utilisé par le scheduler pour éviter les doublons d'alerte. Présent ✅.
