import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { isLocal } from '../common/config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { TontinesService } from '../tontines/tontines.service';
import { TontinesScheduler } from '../tontines/tontines.scheduler';
import { MockWalletService } from './mock-wallet.service';
import * as bcrypt from 'bcrypt';

@Controller('test')
export class MockTestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tontinesService: TontinesService,
    private readonly tontinesScheduler: TontinesScheduler,
    private readonly walletService: MockWalletService,
  ) {}

  private guard() {
    if (!isLocal()) {
      throw new ForbiddenException('Endpoint de test désactivé en production');
    }
  }

  @Post('reset')
  async resetDatabase() {
    this.guard();
    await this.prisma.cotisation.deleteMany();
    await this.prisma.tontineCycle.deleteMany();
    await this.prisma.tontineMember.deleteMany();
    await this.prisma.tontine.deleteMany();
    await this.prisma.mockTransaction.deleteMany();
    await this.prisma.mockWallet.deleteMany();
    await this.prisma.pendingPayment.deleteMany();
    console.log('🧪 [TEST] Base de données réinitialisée');
    return { success: true, message: 'Base réinitialisée' };
  }

  @Post('seed/users')
  async seedUsers() {
    this.guard();
    const passwordHash = await bcrypt.hash('Test1234!', 12);
    const users = [
      { fullname: 'Alice Koné', email: 'alice@test.com', phone: '2250700000001' },
      { fullname: 'Bob Traoré', email: 'bob@test.com', phone: '2250700000002' },
      { fullname: 'Clara Diallo', email: 'clara@test.com', phone: '2250700000003' },
      { fullname: 'David Ouédraogo', email: 'david@test.com', phone: '2250700000004' },
      { fullname: 'Emma Coulibaly', email: 'emma@test.com', phone: '2250700000005' },
    ];

    const created = [];
    for (const u of users) {
      const user = await this.prisma.user.upsert({
        where: { email: u.email },
        update: { fullname: u.fullname, phone: u.phone, passwordHash },
        create: {
          fullname: u.fullname,
          email: u.email,
          phone: u.phone,
          passwordHash,
        },
      });
      await this.walletService.initWallet(user.id, 500000);
      created.push({ id: user.id, name: user.fullname, email: user.email });
    }

    console.log('🧪 [TEST] Utilisateurs créés :', created);
    return { success: true, users: created };
  }

  @Post('seed/tontine/:creatorId')
  async seedTontine(
    @Param('creatorId') creatorId: string,
    @Body()
    options: {
      frequence?: string;
      montant?: number;
      nombreMembres?: number;
      autoJoin?: boolean;
    },
  ) {
    this.guard();
    const {
      frequence = 'MENSUEL',
      montant = 10000,
      nombreMembres = 3,
      autoJoin = false,
    } = options;

    const tontine = await this.tontinesService.createTontine(creatorId, {
      titre: `Tontine Test ${frequence}`,
      description: 'Tontine créée automatiquement pour les tests',
      montant,
      nombreMembres,
      frequence: frequence as 'JOURNALIER' | 'HEBDOMADAIRE' | 'MENSUEL' | 'TRIMESTRIEL',
      tauxPenalite: 10,
      dateDebut: new Date(Date.now() + 60 * 1000).toISOString(),
    });

    if (autoJoin) {
      const autresUsers = await this.prisma.user.findMany({
        where: { id: { not: creatorId } },
        take: nombreMembres - 1,
      });
      for (const user of autresUsers) {
        await this.tontinesService.joinTontine(
          user.id,
          tontine.invitationToken,
        );
      }
    }

    console.log(`🧪 [TEST] Tontine créée : ${tontine.id}`);
    return { success: true, tontine };
  }

  @Post('pay/:cotisationId/:userId')
  async simulerPaiement(
    @Param('cotisationId') cotisationId: string,
    @Param('userId') userId: string,
  ) {
    this.guard();
    await this.tontinesService.payCotisation(
      userId,
      cotisationId,
      `mock-tx-${Date.now()}`,
      'MOCK',
    );
    console.log(`🧪 [TEST] Paiement simulé — cotisation ${cotisationId}`);
    return { success: true };
  }

  @Post('pay-all/:cycleId')
  async payerToutUnCycle(@Param('cycleId') cycleId: string) {
    this.guard();
    const cotisations = await this.prisma.cotisation.findMany({
      where: { cycleId, status: 'PENDING' },
      include: { member: true },
    });

    for (const c of cotisations) {
      await this.tontinesService.payCotisation(
        c.member.userId,
        c.id,
        `mock-tx-${Date.now()}-${c.id}`,
        'MOCK',
      );
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`🧪 [TEST] Toutes les cotisations du cycle ${cycleId} payées`);
    return { success: true, paid: cotisations.length };
  }

  @Post('trigger/penalties')
  async declencherPenalites() {
    this.guard();
    await this.tontinesScheduler.checkExpiredCycles();
    console.log('🧪 [TEST] CRON pénalités déclenché manuellement');
    return { success: true };
  }

  @Post('expire-cycle/:cycleId')
  async expirerCycle(@Param('cycleId') cycleId: string) {
    this.guard();
    await this.prisma.tontineCycle.update({
      where: { id: cycleId },
      data: { dateFin: new Date(Date.now() - 1000) },
    });
    console.log(`🧪 [TEST] Cycle ${cycleId} expiré`);
    return { success: true };
  }

  @Get('tontine/:id')
  async etatTontine(@Param('id') id: string) {
    this.guard();
    return this.prisma.tontine.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, fullname: true, email: true } } },
          orderBy: { tourOrder: 'asc' },
        },
        cycles: {
          include: {
            cotisations: {
              include: {
                member: { include: { user: { select: { fullname: true } } } },
              },
            },
          },
          orderBy: { cycleNumber: 'asc' },
        },
      },
    });
  }

  @Get('wallet/:userId')
  async etatWallet(@Param('userId') userId: string) {
    this.guard();
    const solde = await this.walletService.getSolde(userId);
    const historique = await this.walletService.getHistorique(userId);
    return { userId, solde, historique };
  }

  @Get('help')
  help() {
    this.guard();
    return {
      endpoints: [
        'POST /test/reset                      — Réinitialiser la BDD',
        'POST /test/seed/users                 — Créer 5 utilisateurs de test',
        'POST /test/seed/tontine/:creatorId    — Créer une tontine de test',
        'POST /test/pay/:cotisationId/:userId   — Simuler un paiement',
        'POST /test/pay-all/:cycleId           — Payer tout un cycle',
        'POST /test/trigger/penalties          — Déclencher le CRON pénalités',
        'POST /test/expire-cycle/:cycleId       — Expirer un cycle (test pénalités)',
        'GET  /test/tontine/:id                 — État complet d\'une tontine',
        'GET  /test/wallet/:userId              — Solde et historique wallet',
        'GET  /test/help                       — Cette aide',
      ],
    };
  }
}
