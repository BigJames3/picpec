# Déploiement PICPEC

## Prérequis

- Docker & Docker Compose
- Node.js 20.x (développement local)
- PostgreSQL 15

## Développement local

```bash
# 1. Base de données
cd infra && docker-compose up -d postgres

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run start:dev

# 3. Web Admin (autre terminal)
cd web-admin
npm install
npm run dev

# 4. Mobile (optionnel)
cd mobile-app
npm install
npx expo start
```

## Production (Docker)

```bash
cd infra
export JWT_SECRET=your-secret
export JWT_REFRESH_SECRET=your-refresh-secret
docker-compose up -d
```

Les Dockerfiles sont dans `backend/` et `web-admin/`.

## Variables d'environnement

| Variable           | Description        | Défaut     |
|--------------------|--------------------|------------|
| DATABASE_URL       | URL PostgreSQL     | -          |
| JWT_SECRET         | Secret JWT         | change_me  |
| JWT_REFRESH_SECRET | Secret refresh     | change_me  |
| PORT               | Port API           | 3000       |
| CORS_ORIGINS       | Origines CORS      | localhost  |

## CI/CD (GitHub Actions)

- **Build** : backend + web-admin
- **Lint** : ESLint
- **Tests** : Jest (backend)
- Déploiement staging/production via workflows dédiés
