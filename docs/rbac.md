# RBAC - Rôles et Permissions PICPEC

## Rôles

| Rôle        | Niveau | Description                    |
|-------------|--------|--------------------------------|
| SUPER_ADMIN | 4      | Accès total, gestion plateforme |
| ADMIN       | 3      | Gestion entreprise             |
| MANAGER     | 2      | Gestion équipe                 |
| USER        | 1      | Utilisateur standard           |

## Matrice des permissions

| Ressource   | SUPER_ADMIN | ADMIN | MANAGER | USER |
|-------------|-------------|-------|---------|------|
| Users CRUD  | ✓           | ✓     | ✓       | Me   |
| Posts       | ✓           | ✓     | ✓       | ✓    |
| Wallet      | ✓           | ✓     | ✓       | ✓    |
| Tontines    | ✓           | ✓     | ✓       | ✓    |
| Products    | ✓           | ✓     | ✓       | ✓    |
| Paramètres  | ✓           | ✓     | -       | -    |
| Logs        | ✓           | ✓     | -       | -    |

## Implémentation NestJS

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Get('admin-only')
adminOnly() { ... }
```
