# Modifications Prisma requises — Modération Marketplace

**À ajouter dans `prisma/schema.prisma`** dans le modèle `Product` (après `imageUrl`) :

```prisma
  isApproved  Boolean   @default(false) @map("is_approved")
  approvedAt  DateTime? @map("approved_at")
  approvedBy  String?   @map("approved_by")
```

Puis exécuter :
```bash
npx prisma migrate dev --name add_product_approval
npx prisma generate
```
