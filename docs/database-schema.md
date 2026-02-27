# Schéma Base de Données PICPEC

## Diagramme ER (principales tables)

```
Users
├── id, fullname, email, phone, passwordHash
├── role (SUPER_ADMIN | ADMIN | MANAGER | USER)
├── walletBalance
└── refreshTokenHash, refreshTokenExpiresAt

Posts
├── id, userId, videoUrl, description
├── likesCount
└── → User

Comments
├── id, postId, userId, content
└── → Post, User

PostLike
├── postId, userId (unique)
└── → Post, User

Tontine
├── id, title, contributionAmount, frequency
├── membersLimit, status
└── creatorId → User

TontineMember
├── tontineId, userId, isPaid, paidAt
└── → Tontine, User

Transaction
├── id, senderId, receiverId, amount
├── type, status
└── → User (sender, receiver)

Product
├── id, sellerId, name, price, stock
└── → User

ProductPurchase
├── productId, buyerId, quantity, totalAmount
└── → Product, User
```

## Enums

- **Role**: SUPER_ADMIN, ADMIN, MANAGER, USER
- **TontineStatus**: PENDING, ACTIVE, COMPLETED, CANCELLED
- **TontineFrequency**: DAILY, WEEKLY, BIWEEKLY, MONTHLY
- **TransactionType**: DEPOSIT, WITHDRAW, TRANSFER, TONTINE_PAYMENT, TONTINE_PAYOUT, PRODUCT_PURCHASE
- **TransactionStatus**: PENDING, COMPLETED, FAILED, CANCELLED
