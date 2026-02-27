/**
 * PICPEC - Seed réaliste et cohérent
 * Exécution répétable : upsert par email pour users
 */
import {
  PrismaClient,
  Role,
  TontineStatus,
  FrequenceType,
  MemberRole,
  MemberStatus,
  TransactionType,
  TransactionStatus,
  ProductStatus,
  NotificationType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const PASSWORD = 'Picpec@123';
const VIDEO_PLACEHOLDER = 'https://example.com/video/placeholder.mp4';

const TEST_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

const TEST_DESCRIPTIONS = [
  '🌍 Découvrez les saveurs locales sur PICPEC Marketplace !',
  '💰 Gérez vos tontines digitales facilement avec PICPEC',
  '🤝 La solidarité financière africaine version digitale',
  '🛒 Achetez et vendez local sur PICPEC Marketplace',
  '🚀 PICPEC : votre wallet africain nouvelle génération',
];

async function main() {
  faker.seed(42);

  // ─── 1. USERS ─────────────────────────────────────────────────────────
  const userData = [
    { email: 'superadmin@picpec.com', fullname: 'Super Admin PicPec', role: Role.SUPER_ADMIN, walletBalance: 0 },
    { email: 'admin@picpec.com', fullname: 'Admin PicPec', role: Role.ADMIN, walletBalance: 0 },
    { email: 'admin2@picpec.com', fullname: 'Admin Secondaire', role: Role.ADMIN, walletBalance: 0 },
    { email: 'user1@picpec.com', fullname: 'Amadou Diallo', role: Role.USER, walletBalance: 150000 },
    { email: 'user2@picpec.com', fullname: 'Fatou Sow', role: Role.USER, walletBalance: 200000 },
    { email: 'user3@picpec.com', fullname: 'Moussa Traoré', role: Role.USER, walletBalance: 80000 },
    { email: 'user4@picpec.com', fullname: 'Aïssata Keita', role: Role.USER, walletBalance: 120000 },
    { email: 'user5@picpec.com', fullname: 'Ibrahim Coulibaly', role: Role.USER, walletBalance: 95000 },
    { email: 'vendeur1@picpec.com', fullname: 'Boutique Afrique', role: Role.USER, walletBalance: 500000 },
    { email: 'vendeur2@picpec.com', fullname: 'Artisan Local', role: Role.USER, walletBalance: 350000 },
  ];

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users: { id: string; email: string }[] = [];

  for (const u of userData) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: { walletBalance: u.walletBalance },
      create: {
        fullname: u.fullname,
        email: u.email,
        phone: faker.phone.number(),
        passwordHash,
        role: u.role,
        walletBalance: u.walletBalance,
      },
    });
    users.push({ id: created.id, email: created.email });
  }

  const [superAdmin, admin1, admin2, u1, u2, u3, u4, u5, v1, v2] = users;
  const regularUsers = [u1, u2, u3, u4, u5];
  const sellers = [v1, v2];

  console.log('✓ Users:', users.length);

  // ─── 2. POSTS + LIKES + COMMENTS ──────────────────────────────────────
  const postAuthors = [...regularUsers, ...sellers];
  const posts: { id: string }[] = [];

  for (let i = 0; i < 20; i++) {
    const author = postAuthors[i % postAuthors.length];
    const useTestVideo = i < 5;
    const post = await prisma.post.upsert({
      where: { id: `seed-post-${i}` },
      update: {},
      create: {
        id: `seed-post-${i}`,
        userId: author.id,
        videoUrl: useTestVideo ? TEST_VIDEOS[i] : VIDEO_PLACEHOLDER,
        description: useTestVideo ? TEST_DESCRIPTIONS[i] : faker.lorem.sentences(2),
        likesCount: useTestVideo ? Math.floor(Math.random() * 500) : 0,
        commentsCount: useTestVideo ? Math.floor(Math.random() * 50) : 0,
      },
    });
    posts.push({ id: post.id });
  }

  // Likes (chaque user like 3-8 posts aléatoires)
  for (const user of users) {
    const toLike = faker.helpers.arrayElements(posts, faker.number.int({ min: 3, max: 8 }));
    for (const post of toLike) {
      await prisma.postLike.upsert({
        where: {
          postId_userId: { postId: post.id, userId: user.id },
        },
        update: {},
        create: { postId: post.id, userId: user.id },
      });
    }
  }

  // Mettre à jour likesCount
  for (const post of posts) {
    const count = await prisma.postLike.count({ where: { postId: post.id } });
    await prisma.post.update({ where: { id: post.id }, data: { likesCount: count } });
  }

  // Commentaires (30 commentaires répartis sur les posts)
  const comments = ['Super !', 'Très intéressant', 'Merci pour le partage', 'Excellent', "J'adore"];
  for (let i = 0; i < 30; i++) {
    const post = posts[i % posts.length];
    const author = users[faker.number.int({ min: 0, max: users.length - 1 })];
    await prisma.comment.upsert({
      where: { id: `seed-comment-${i}` },
      update: {},
      create: {
        id: `seed-comment-${i}`,
        postId: post.id,
        userId: author.id,
        content: faker.helpers.arrayElement(comments),
      },
    });
  }

  console.log('✓ Posts:', posts.length, '| Likes & comments créés');

  // ─── 3. TONTINES ──────────────────────────────────────────────────────
  const dateDebut = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.tontine.upsert({
    where: { id: 'seed-tontine-pending' },
    update: {},
    create: {
      id: 'seed-tontine-pending',
      titre: 'Tontine Mensuelle Épargne',
      description: faker.lorem.sentence(),
      montant: 10000,
      nombreMembres: 4,
      frequence: FrequenceType.MENSUEL,
      dateDebut,
      tauxPenalite: 5,
      invitationToken: 'seed-inv-token-pending',
      invitationActive: true,
      status: TontineStatus.PENDING,
      creatorId: u1.id,
    },
  });

  await prisma.tontineMember.upsert({
    where: { tontineId_userId: { tontineId: 'seed-tontine-pending', userId: u1.id } },
    update: {},
    create: {
      tontineId: 'seed-tontine-pending',
      userId: u1.id,
      role: MemberRole.CREATOR,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });
  await prisma.tontineMember.upsert({
    where: { tontineId_userId: { tontineId: 'seed-tontine-pending', userId: u2.id } },
    update: {},
    create: {
      tontineId: 'seed-tontine-pending',
      userId: u2.id,
      role: MemberRole.MEMBER,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  console.log('✓ Tontines: 1 (PENDING)');

  // ─── 4. TRANSACTIONS (dépôts, transferts, tontine) ─────────────────────
  const txRefs = [
    `DEP-SEED-${Date.now()}-1`,
    `DEP-SEED-${Date.now()}-2`,
    `TRF-SEED-${Date.now()}-3`,
  ];
  await prisma.transaction.createMany({
    data: [
      { receiverId: u1.id, amount: 50000, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED, reference: txRefs[0] },
      { receiverId: v1.id, amount: 200000, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED, reference: txRefs[1] },
      {
        senderId: u1.id,
        receiverId: u2.id,
        amount: 10000,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
        reference: txRefs[2],
      },
    ],
    skipDuplicates: true,
  });

  console.log('✓ Transactions créées');

  // ─── 4b. CATÉGORIES MARKETPLACE ─────────────────────────────────────────
  const categories = [
    { name: 'Tout', emoji: '🏪', slug: 'all' },
    { name: 'Alimentaire', emoji: '🥗', slug: 'alimentaire' },
    { name: 'Mode', emoji: '👗', slug: 'mode' },
    { name: 'Électronique', emoji: '📱', slug: 'electronique' },
    { name: 'Artisanat', emoji: '🎨', slug: 'artisanat' },
    { name: 'Beauté', emoji: '💄', slug: 'beaute' },
    { name: 'Maison', emoji: '🏠', slug: 'maison' },
    { name: 'Agriculture', emoji: '🌾', slug: 'agriculture' },
    { name: 'Services', emoji: '🔧', slug: 'services' },
  ];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✓ Catégories:', categories.length);

  // ─── 5. PRODUITS MARKETPLACE ──────────────────────────────────────────
  const productNames = [
    'Sac en cuir artisanal',
    'Boubou traditionnel',
    'Statue bois',
    'Tissu wax',
    'Collier perles',
    'Panier tressé',
    'Savon karité',
    'Café robusta',
    'Miel sauvage',
    'Épices mélange',
  ];

  const artisanatCat = await prisma.category.findUnique({ where: { slug: 'artisanat' } });
  for (let i = 0; i < 10; i++) {
    const seller = sellers[i % 2];
    await prisma.product.upsert({
      where: { id: `seed-product-${i}` },
      update: {},
      create: {
        id: `seed-product-${i}`,
        sellerId: seller.id,
        categoryId: artisanatCat?.id ?? null,
        name: productNames[i],
        description: faker.commerce.productDescription(),
        price: new Decimal(faker.number.int({ min: 2000, max: 50000 })),
        stock: faker.number.int({ min: 5, max: 50 }),
        status: ProductStatus.ACTIVE,
        isApproved: true,
      },
    });
  }

  console.log('✓ Produits: 10');

  // ─── 6. NOTIFICATIONS ───────────────────────────────────────────────────
  const notifData = [
    { id: 'seed-notif-1', userId: u2.id, title: 'Rappel cotisation', body: 'Votre cotisation est due dans 3 jours', type: NotificationType.TONTINE_PAYMENT_DUE },
    { id: 'seed-notif-2', userId: u3.id, title: "C'est votre tour !", body: 'Vous recevez 75 000 XOF de la tontine', type: NotificationType.TONTINE_TURN_WON },
    { id: 'seed-notif-3', userId: u1.id, title: 'Crédit reçu', body: '+10 000 XOF sur votre wallet', type: NotificationType.WALLET_CREDIT },
    { id: 'seed-notif-4', userId: u2.id, title: 'Débit effectué', body: '-10 000 XOF de votre wallet', type: NotificationType.WALLET_DEBIT },
  ];

  for (const n of notifData) {
    const { id, ...data } = n;
    await prisma.notification.upsert({
      where: { id },
      update: {},
      create: { id, ...data, isRead: faker.datatype.boolean(0.3) },
    });
  }

  console.log('✓ Notifications:', notifData.length);

  // ─── RÉSUMÉ ───────────────────────────────────────────────────────────
  console.log('\n📊 Seed terminé. Identifiants de test :');
  console.log('   Email: user1@picpec.com ... vendeur2@picpec.com');
  console.log('   Mot de passe: ' + PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
