# PICPEC — Seed, Simulation & Tests E2E

## Prérequis

- PostgreSQL
- Variables d'environnement (`.env`) : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Pour tests E2E : `DATABASE_URL_TEST` (optionnel, sinon utilise `DATABASE_URL`)

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run db:reset` | Reset DB (migrate reset + seed) |
| `npm run db:seed` | Exécute le seed uniquement |
| `npm run simulate` | Simulation métier complète |
| `npm run test:e2e` | Tests E2E (reset DB + seed + tests) |

## Exécution

### 1. Reset + Seed

```bash
cd backend
npm run db:reset
```

Réinitialise la base, applique les migrations et exécute le seed.

### 2. Seed seul (sans reset)

```bash
npm run db:seed
```

Utile après un reset manuel ou pour re-seeder sans tout effacer.

### 3. Simulation métier

```bash
npm run simulate
```

Exécute des scénarios réalistes :
- Transfert wallet
- Achat produit
- Like post
- Création notification
- Paiement tontine
- Transferts parallèles (concurrence)

Vérifie : pas d'exception, soldes non négatifs, pas de doublons.

### 4. Tests E2E

```bash
# Optionnel : reset DB avant les tests (base propre)
npm run db:reset

# Lancer les tests (le global setup exécute le seed)
npm run test:e2e
```

1. **Global setup** : exécute le seed (données de test)
2. **Tests** : users, wallet, tontines, marketplace, notifications

Utilise `DATABASE_URL_TEST` si défini, sinon `DATABASE_URL`.

## Base de données test

Pour ne pas impacter la base principale :

```bash
# .env ou .env.test
DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/picpec_test
```

Puis :

```bash
DATABASE_URL_TEST=postgresql://... npm run test:e2e
```

## Données du seed

### Utilisateurs (mot de passe : `Picpec@123`)

| Email | Rôle | Solde |
|-------|------|-------|
| superadmin@picpec.com | SUPER_ADMIN | 0 |
| admin@picpec.com | ADMIN | 0 |
| admin2@picpec.com | ADMIN | 0 |
| user1@picpec.com | USER | 150 000 |
| user2@picpec.com | USER | 200 000 |
| user3@picpec.com | USER | 80 000 |
| user4@picpec.com | USER | 120 000 |
| user5@picpec.com | USER | 95 000 |
| vendeur1@picpec.com | USER | 500 000 |
| vendeur2@picpec.com | USER | 350 000 |

### Contenu

- **20 posts** avec likes et commentaires
- **3 tontines** : PENDING, ACTIVE, COMPLETED
- **10 produits** marketplace
- **Transactions** et **notifications**

## Résultat attendu

```bash
npm run db:reset   # OK
npm run db:seed    # OK
npm run simulate   # OK
npm run test:e2e   # OK
```
