# Architecture Backend PICPEC

## Stack

- **Node.js 20.x** LTS
- **NestJS** (dernière version stable)
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL 15**
- **JWT** + Refresh Token
- **Swagger** (documentation API)
- **class-validator** (validation)
- **bcrypt** (hash mots de passe)

## Structure

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/           # Authentification
│   ├── users/           # Utilisateurs
│   ├── posts/           # Feed vidéo
│   ├── wallet/          # Portefeuille
│   ├── tontines/        # Tontines
│   ├── products/        # Marketplace
│   ├── prisma/          # Service Prisma
│   └── common/          # Filtres, intercepteurs
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── package.json
```

## RBAC

| Rôle        | Description              |
|-------------|--------------------------|
| SUPER_ADMIN | Accès total              |
| ADMIN       | Gestion plateforme        |
| MANAGER     | Gestion équipe            |
| USER        | Utilisateur standard      |

## Endpoints principaux

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token
- `GET /api/users/me` - Profil utilisateur
- `POST /api/posts` - Créer un post
- `GET /api/posts` - Liste des posts
- `POST /api/wallet/deposit` - Déposer
- `POST /api/wallet/withdraw` - Retirer
- `POST /api/tontines` - Créer une tontine
- `POST /api/tontines/:id/join` - Rejoindre
- `POST /api/products/:id/buy` - Acheter
