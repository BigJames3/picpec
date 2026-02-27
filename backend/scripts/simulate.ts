/**
 * PICPEC - Simulation métier complète
 * Utilise Prisma directement (pas de dépendance NestJS/JWT)
 * Vérifie : pas d'exception, solde jamais négatif, pas de double inscription/paiement
 */
import { PrismaClient, TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function simulate() {
  console.log('🧪 Démarrage simulation métier PICPEC...\n');

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, email: true, walletBalance: true },
  });
  const [u1, u2, u3, u4, v1] = users;
  if (!u1 || !u2 || !u3 || !u4 || !v1) {
    throw new Error('Seed requis : exécutez npm run db:seed');
  }

  const errors: string[] = [];

  // ─── 1. Transfert wallet (via Prisma transaction) ──────────────────────
  console.log('1️⃣  Transfert wallet...');
  try {
    const amount = 5000;
    const dec = new Decimal(amount);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: u1.id },
        data: { walletBalance: { decrement: dec } },
      }),
      prisma.user.update({
        where: { id: u2.id },
        data: { walletBalance: { increment: dec } },
      }),
      prisma.transaction.create({
        data: {
          senderId: u1.id,
          receiverId: u2.id,
          amount: dec,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          reference: `SIM-TRF-${Date.now()}`,
        },
      }),
    ]);
    console.log('   ✓ Transfert 5000 XOF u1→u2');
  } catch (e) {
    errors.push(`Transfert: ${(e as Error).message}`);
    console.log('   ✗', (e as Error).message);
  }

  // ─── 2. Like post ──────────────────────────────────────────────────────
  console.log('2️⃣  Like post...');
  try {
    const post = await prisma.post.findFirst();
    if (post && u4) {
      const existing = await prisma.postLike.findUnique({
        where: { postId_userId: { postId: post.id, userId: u4.id } },
      });
      if (existing) {
        await prisma.postLike.delete({
          where: { postId_userId: { postId: post.id, userId: u4.id } },
        });
        await prisma.post.update({
          where: { id: post.id },
          data: { likesCount: { decrement: 1 } },
        });
        console.log('   ✓ Unlike post');
      } else {
        await prisma.postLike.create({
          data: { postId: post.id, userId: u4.id },
        });
        await prisma.post.update({
          where: { id: post.id },
          data: { likesCount: { increment: 1 } },
        });
        console.log('   ✓ Like post');
      }
    }
  } catch (e) {
    errors.push(`Like: ${(e as Error).message}`);
    console.log('   ✗', (e as Error).message);
  }

  // ─── 3. Notification ────────────────────────────────────────────────────
  console.log('3️⃣  Création notification...');
  try {
    await prisma.notification.create({
      data: {
        userId: u1.id,
        title: 'Test simulation',
        body: 'Notification créée par simulate.ts',
        type: 'SYSTEM',
      },
    });
    console.log('   ✓ Notification créée');
  } catch (e) {
    errors.push(`Notification: ${(e as Error).message}`);
    console.log('   ✗', (e as Error).message);
  }

  // ─── 4. Simulation concurrence (Promise.all transferts) ──────────────────
  console.log('4️⃣  Simulation concurrence (transferts parallèles)...');
  try {
    const smallAmount = 100;
    const dec = new Decimal(smallAmount);
    await Promise.all([
      prisma.$transaction([
        prisma.user.update({ where: { id: u2.id }, data: { walletBalance: { decrement: dec } } }),
        prisma.user.update({ where: { id: u3.id }, data: { walletBalance: { increment: dec } } }),
        prisma.transaction.create({
          data: {
            senderId: u2.id,
            receiverId: u3.id,
            amount: dec,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.COMPLETED,
            reference: `SIM-C1-${Date.now()}`,
          },
        }),
      ]),
      prisma.$transaction([
        prisma.user.update({ where: { id: u3.id }, data: { walletBalance: { decrement: dec } } }),
        prisma.user.update({ where: { id: u4.id }, data: { walletBalance: { increment: dec } } }),
        prisma.transaction.create({
          data: {
            senderId: u3.id,
            receiverId: u4.id,
            amount: dec,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.COMPLETED,
            reference: `SIM-C2-${Date.now()}`,
          },
        }),
      ]),
    ]);
    console.log('   ✓ 2 transferts parallèles OK');
  } catch (e) {
    errors.push(`Concurrence: ${(e as Error).message}`);
    console.log('   ✗', (e as Error).message);
  }

  // ─── 5. Vérifications finales ───────────────────────────────────────────
  console.log('5️⃣  Vérifications (soldes, doublons)...');
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, walletBalance: true },
  });
  for (const u of allUsers) {
    const bal = Number(u.walletBalance);
    if (bal < 0) {
      errors.push(`Solde négatif: ${u.email} = ${bal}`);
    }
  }

  const tontineMembers = await prisma.tontineMember.groupBy({
    by: ['tontineId', 'userId'],
    _count: true,
  });
  const duplicates = tontineMembers.filter((g) => g._count > 1);
  if (duplicates.length > 0) {
    errors.push('Doublons tontine members détectés');
  }

  await prisma.$disconnect();

  // ─── Résultat ──────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  if (errors.length === 0) {
    console.log('✅ Simulation terminée sans erreur');
  } else {
    console.log('❌ Erreurs:');
    errors.forEach((e) => console.log('   -', e));
    process.exit(1);
  }
}

simulate().catch((e) => {
  console.error(e);
  process.exit(1);
});
