import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isLocal } from '../common/config/environment';
import { appConfig } from '../common/config/app.config';
import { PrismaService } from '../prisma/prisma.service';
import {
  TontineStatus,
  MemberRole,
  MemberStatus,
  CotisationStatus,
  CycleStatus,
  FrequenceType,
  TransactionType,
  TransactionStatus,
  NotificationType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';

function generateToken(): string {
  return randomUUID().replace(/-/g, '').slice(0, 24);
}

function calculateCycleStart(
  dateDebut: Date,
  frequence: FrequenceType,
  index: number,
): Date {
  const d = new Date(dateDebut);
  switch (frequence) {
    case FrequenceType.JOURNALIER:
      d.setDate(d.getDate() + index);
      break;
    case FrequenceType.HEBDOMADAIRE:
      d.setDate(d.getDate() + index * 7);
      break;
    case FrequenceType.MENSUEL:
      d.setMonth(d.getMonth() + index);
      break;
    case FrequenceType.TRIMESTRIEL:
      d.setMonth(d.getMonth() + index * 3);
      break;
  }
  return d;
}

function calculateCycleEnd(
  dateDebut: Date,
  frequence: FrequenceType,
  index: number,
): Date {
  const start = calculateCycleStart(dateDebut, frequence, index);
  const end = new Date(start);
  switch (frequence) {
    case FrequenceType.JOURNALIER:
      end.setDate(end.getDate() + 1);
      break;
    case FrequenceType.HEBDOMADAIRE:
      end.setDate(end.getDate() + 7);
      break;
    case FrequenceType.MENSUEL:
      end.setMonth(end.getMonth() + 1);
      break;
    case FrequenceType.TRIMESTRIEL:
      end.setMonth(end.getMonth() + 3);
      break;
  }
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return end;
}

@Injectable()
export class TontinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createTontine(userId: string, dto: CreateTontineDto) {
    const dateDebut = new Date(dto.dateDebut);
    if (dateDebut <= new Date()) {
      throw new BadRequestException('La date de début doit être future');
    }
    if (dto.tauxPenalite != null && (dto.tauxPenalite < 0 || dto.tauxPenalite > 50)) {
      throw new BadRequestException('Taux de pénalité entre 0 et 50%');
    }

    return this.prisma.$transaction(async (tx) => {
      const tontine = await tx.tontine.create({
        data: {
          titre: dto.titre,
          description: dto.description,
          montant: dto.montant,
          nombreMembres: dto.nombreMembres,
          frequence: dto.frequence,
          dateDebut,
          tauxPenalite: dto.tauxPenalite ?? 0,
          status: TontineStatus.PENDING,
          creatorId: userId,
          invitationToken: generateToken(),
          invitationActive: true,
        },
      });

      await tx.tontineMember.create({
        data: {
          tontineId: tontine.id,
          userId,
          role: MemberRole.CREATOR,
          status: MemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });

      return tontine;
    });
  }

  async joinTontine(userId: string, token: string) {
    const tontine = await this.prisma.tontine.findUnique({
      where: { invitationToken: token },
      include: { members: true },
    });

    if (!tontine) throw new NotFoundException('Lien invalide ou expiré');
    if (!tontine.invitationActive) {
      throw new BadRequestException("Ce lien n'est plus actif");
    }
    if (tontine.status !== TontineStatus.PENDING) {
      throw new BadRequestException('Cette tontine a déjà démarré');
    }

    const existing = tontine.members.find((m) => m.userId === userId);
    if (existing) {
      throw new ConflictException('Vous êtes déjà membre de cette tontine');
    }
    if (tontine.creatorId === userId) {
      throw new BadRequestException('Vous êtes le créateur de cette tontine');
    }

    const activeMembers = tontine.members.filter(
      (m) => m.status === MemberStatus.ACTIVE,
    ).length;
    if (activeMembers >= tontine.nombreMembres) {
      throw new BadRequestException('La tontine est complète');
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.tontineMember.create({
        data: {
          tontineId: tontine.id,
          userId,
          role: MemberRole.MEMBER,
          status: MemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });

      const totalActive = activeMembers + 1;
      if (totalActive === tontine.nombreMembres) {
        await tx.tontine.update({
          where: { id: tontine.id },
          data: { invitationActive: false },
        });
        await this.activateTontine(tx as unknown as PrismaClient, tontine.id);
      }

      return member;
    });
  }

  private async activateTontine(tx: PrismaClient, tontineId: string): Promise<void> {
    const tontine = await tx.tontine.findUnique({
      where: { id: tontineId },
      include: { members: { where: { status: MemberStatus.ACTIVE } } },
    });
    if (!tontine) return;

    const shuffled = [...tontine.members].sort(() => Math.random() - 0.5);

    await Promise.all(
      shuffled.map((member, index) =>
        tx.tontineMember.update({
          where: { id: member.id },
          data: { tourOrder: index + 1 },
        }),
      ),
    );

    const cycles = shuffled.map((member, index) => ({
      tontineId,
      cycleNumber: index + 1,
      beneficiaryId: member.id,
      dateDebut: calculateCycleStart(tontine.dateDebut, tontine.frequence, index),
      dateFin: calculateCycleEnd(tontine.dateDebut, tontine.frequence, index),
      montantTotal: tontine.montant * tontine.nombreMembres,
      status: CycleStatus.OPEN,
    }));

    await tx.tontineCycle.createMany({ data: cycles });

    const firstCycle = await tx.tontineCycle.findFirst({
      where: { tontineId, cycleNumber: 1 },
    });
    if (firstCycle) {
      await tx.cotisation.createMany({
        data: shuffled.map((member) => ({
          cycleId: firstCycle.id,
          memberId: member.id,
          montant: tontine.montant,
          penalite: 0,
          status: CotisationStatus.PENDING,
        })),
      });
    }

    await tx.tontine.update({
      where: { id: tontineId },
      data: { status: TontineStatus.ACTIVE, currentCycle: 1 },
    });
  }

  async payCotisation(
    userId: string,
    cotisationId: string,
    transactionId: string,
    provider: string,
  ): Promise<void> {
    const cotisation = await this.prisma.cotisation.findUnique({
      where: { id: cotisationId },
      include: {
        member: true,
        cycle: {
          include: { tontine: true, cotisations: true },
        },
      },
    });

    if (!cotisation) throw new NotFoundException('Cotisation introuvable');
    if (cotisation.member.userId !== userId) {
      throw new ForbiddenException('Non autorisé');
    }
    if (
      cotisation.status === CotisationStatus.PAID ||
      cotisation.status === CotisationStatus.LATE
    ) {
      throw new BadRequestException('Cotisation déjà payée');
    }

    const now = new Date();
    const isLate = now > cotisation.cycle.dateFin;
    const tontine = cotisation.cycle.tontine;

    const penalite = isLate
      ? (tontine.montant * tontine.tauxPenalite) / 100
      : 0;
    const totalPaye = tontine.montant + penalite;

    await this.prisma.$transaction(async (tx) => {
      await tx.cotisation.update({
        where: { id: cotisationId },
        data: {
          status: isLate ? CotisationStatus.LATE : CotisationStatus.PAID,
          penalite,
          totalPaye,
          transactionId,
          provider,
          paidAt: now,
        },
      });

      await tx.transaction.create({
        data: {
          senderId: userId,
          receiverId: null,
          amount: new Decimal(totalPaye),
          type: TransactionType.TONTINE_PAYMENT,
          status: TransactionStatus.COMPLETED,
          reference: `TONTINE-PAY-${cotisationId}-${Date.now()}`,
          note: `Cotisation tontine — cycle ${cotisation.cycle.cycleNumber}`,
          metadata: {
            tontineId: cotisation.cycle.tontineId,
            cycleId: cotisation.cycleId,
            cotisationId,
            penalite,
            provider,
            transactionId,
          },
        },
      });

      const allCotisations = cotisation.cycle.cotisations;
      const remainingCount = allCotisations.filter(
        (c) =>
          c.id !== cotisationId &&
          c.status !== CotisationStatus.PAID &&
          c.status !== CotisationStatus.LATE,
      ).length;

      if (remainingCount === 0) {
        await this.disburseCycle(tx as unknown as PrismaClient, cotisation.cycle.id);
      }
    });
  }

  private async disburseCycle(tx: PrismaClient, cycleId: string): Promise<void> {
    const cycle = await tx.tontineCycle.findUnique({
      where: { id: cycleId },
      include: {
        tontine: true,
        beneficiary: { include: { user: true } },
        cotisations: true,
      },
    });

    if (!cycle) return;

    const montantBeneficiaire = Number(cycle.tontine.montant) * cycle.tontine.nombreMembres;
    const beneficiaryUserId = cycle.beneficiary.userId;

    await tx.tontineCycle.update({
      where: { id: cycleId },
      data: { status: CycleStatus.DISBURSED, datePaiement: new Date() },
    });

    await tx.user.update({
      where: { id: beneficiaryUserId },
      data: { walletBalance: { increment: montantBeneficiaire } },
    });

    await tx.transaction.create({
      data: {
        senderId: null,
        receiverId: beneficiaryUserId,
        amount: new Decimal(montantBeneficiaire),
        type: TransactionType.TONTINE_PAYOUT,
        status: TransactionStatus.COMPLETED,
        reference: `TONTINE-OUT-${cycle.tontineId}-${cycle.cycleNumber}-${Date.now()}`,
        note: `Gain tontine — tour ${cycle.cycleNumber}`,
        metadata: {
          tontineId: cycle.tontineId,
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
        },
      },
    });

    const isLastCycle = cycle.cycleNumber === cycle.tontine.nombreMembres;

    if (isLastCycle) {
      await tx.tontine.update({
        where: { id: cycle.tontineId },
        data: { status: TontineStatus.COMPLETED },
      });
    } else {
      const nextCycleNumber = cycle.cycleNumber + 1;
      const nextCycle = await tx.tontineCycle.findFirst({
        where: { tontineId: cycle.tontineId, cycleNumber: nextCycleNumber },
      });

      const members = await tx.tontineMember.findMany({
        where: { tontineId: cycle.tontineId, status: MemberStatus.ACTIVE },
      });

      if (nextCycle) {
        await tx.cotisation.createMany({
          data: members.map((member) => ({
            cycleId: nextCycle.id,
            memberId: member.id,
            montant: cycle.tontine.montant,
            penalite: 0,
            status: CotisationStatus.PENDING,
          })),
        });

        await tx.tontine.update({
          where: { id: cycle.tontineId },
          data: { currentCycle: nextCycleNumber },
        });

        await tx.tontineCycle.update({
          where: { id: nextCycle.id },
          data: { status: CycleStatus.OPEN },
        });
      }
    }
  }

  async getTontinesForUser(userId: string) {
    const memberships = await this.prisma.tontineMember.findMany({
      where: { userId, status: MemberStatus.ACTIVE },
      include: {
        tontine: {
          include: {
            creator: { select: { id: true, fullname: true } },
            members: {
              where: { status: MemberStatus.ACTIVE },
              include: { user: { select: { id: true, fullname: true } } },
            },
            cycles: {
              where: {
                status: { in: [CycleStatus.OPEN, CycleStatus.WAITING] },
              },
              take: 1,
              orderBy: { cycleNumber: 'asc' },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.tontine,
      userRole: m.role,
      userMemberId: m.id,
      userTourOrder: m.tourOrder,
      showButton: this.resolveButtonAction(
        m.role,
        m.tontine.status,
        m.tontine.creatorId,
        userId,
      ),
    }));
  }

  private resolveButtonAction(
    role: MemberRole,
    status: TontineStatus,
    creatorId: string,
    userId: string,
  ): 'SHARE' | 'PAY' | 'NONE' {
    if (role === MemberRole.CREATOR && status === TontineStatus.PENDING) {
      return 'SHARE';
    }
    if (role === MemberRole.MEMBER && status === TontineStatus.ACTIVE) {
      return 'PAY';
    }
    if (role === MemberRole.CREATOR && status === TontineStatus.ACTIVE) {
      return 'PAY';
    }
    return 'NONE';
  }

  async getPendingTontinesForCreator(userId: string) {
    return this.prisma.tontine.findMany({
      where: { creatorId: userId, status: TontineStatus.PENDING },
      include: {
        members: { where: { status: MemberStatus.ACTIVE } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHistoryForUser(userId: string) {
    return this.prisma.tontineMember.findMany({
      where: {
        userId,
        tontine: {
          status: {
            in: [TontineStatus.COMPLETED, TontineStatus.CANCELLED],
          },
        },
      },
      include: {
        tontine: {
          include: {
            members: {
              include: { user: { select: { id: true, fullname: true } } },
              orderBy: { tourOrder: 'asc' },
            },
            cycles: {
              include: {
                cotisations: { where: { member: { userId } } },
              },
              orderBy: { cycleNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvitationLink(userId: string, tontineId: string): Promise<string> {
    const tontine = await this.prisma.tontine.findUnique({
      where: { id: tontineId },
    });

    if (!tontine) throw new NotFoundException('Tontine introuvable');
    if (tontine.creatorId !== userId) {
      throw new ForbiddenException('Seul le créateur peut partager le lien');
    }
    if (tontine.status !== TontineStatus.PENDING) {
      throw new BadRequestException('La tontine a déjà démarré');
    }
    if (!tontine.invitationActive) {
      throw new BadRequestException(
        'Le lien est désactivé (tontine complète)',
      );
    }

    const inviteLink = `${appConfig.deepLinkBase}/tontine/join/${tontine.invitationToken}`;
    if (isLocal()) {
      console.log(`\n🧪 [LIEN INVITATION] ${inviteLink}`);
      console.log(`📱 Partage ce lien sur ton réseau local pour tester`);
    }
    return inviteLink;
  }

  async validateInvitationToken(token: string) {
    const tontine = await this.prisma.tontine.findUnique({
      where: { invitationToken: token },
      include: {
        creator: { select: { fullname: true } },
        members: { where: { status: MemberStatus.ACTIVE } },
      },
    });

    if (!tontine) {
      return { tontine: {}, canJoin: false, reason: 'Lien invalide ou expiré' };
    }
    if (!tontine.invitationActive) {
      return {
        tontine: {
          titre: tontine.titre,
          description: tontine.description,
          montant: tontine.montant,
          nombreMembres: tontine.nombreMembres,
          frequence: tontine.frequence,
          dateDebut: tontine.dateDebut,
        },
        canJoin: false,
        reason: 'La tontine est déjà complète',
      };
    }
    if (tontine.status !== TontineStatus.PENDING) {
      return {
        tontine: {
          titre: tontine.titre,
          description: tontine.description,
          montant: tontine.montant,
          nombreMembres: tontine.nombreMembres,
          frequence: tontine.frequence,
          dateDebut: tontine.dateDebut,
        },
        canJoin: false,
        reason: 'La tontine a déjà démarré',
      };
    }

    const spotsLeft = tontine.nombreMembres - tontine.members.length;

    return {
      tontine: {
        titre: tontine.titre,
        description: tontine.description,
        montant: tontine.montant,
        nombreMembres: tontine.nombreMembres,
        frequence: tontine.frequence,
        dateDebut: tontine.dateDebut,
      },
      canJoin: true,
      reason: `${spotsLeft} place(s) restante(s)`,
    };
  }

  async payCotisationWallet(tontineId: string, userId: string) {
    const tontine = await this.prisma.tontine.findUnique({
      where: { id: tontineId },
      include: {
        members: { where: { status: MemberStatus.ACTIVE } },
        cycles: {
          where: { status: { in: [CycleStatus.OPEN, CycleStatus.WAITING] } },
          orderBy: { cycleNumber: 'asc' },
          take: 1,
          include: { cotisations: { include: { member: true } } },
        },
      },
    });

    if (!tontine) throw new NotFoundException('Tontine introuvable');

    const activeCycle = tontine.cycles[0];
    if (!activeCycle) throw new BadRequestException('Aucun cycle actif');

    const member = tontine.members.find((m) => m.userId === userId);
    if (!member) throw new ForbiddenException('Non membre');

    const existingCotisation = activeCycle.cotisations.find(
      (c) => c.member.userId === userId && (c.status === CotisationStatus.PAID || c.status === CotisationStatus.LATE),
    );
    if (existingCotisation) {
      throw new BadRequestException('Cotisation déjà payée');
    }

    const now = new Date();
    const isLate = now > activeCycle.dateFin;
    const penalite = isLate
      ? (Number(tontine.montant) * Number(tontine.tauxPenalite)) / 100
      : 0;
    const montantTotal = Number(tontine.montant) + penalite;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user || Number(user.walletBalance) < montantTotal) {
      throw new BadRequestException(
        `Solde insuffisant. Requis: ${montantTotal} XOF, ` +
          `Disponible: ${Number(user?.walletBalance ?? 0)} XOF`,
      );
    }

    const reference = `TONTINE-WALLET-${tontineId}-${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      const cotisation = await tx.cotisation.findFirst({
        where: {
          cycleId: activeCycle.id,
          memberId: member.id,
        },
      });

      if (cotisation) {
        await tx.cotisation.update({
          where: { id: cotisation.id },
          data: {
            status: isLate ? CotisationStatus.LATE : CotisationStatus.PAID,
            penalite,
            totalPaye: montantTotal,
            transactionId: reference,
            provider: 'WALLET',
            paidAt: now,
          },
        });
      } else {
        await tx.cotisation.create({
          data: {
            cycleId: activeCycle.id,
            memberId: member.id,
            montant: tontine.montant,
            penalite,
            totalPaye: montantTotal,
            status: isLate ? CotisationStatus.LATE : CotisationStatus.PAID,
            transactionId: reference,
            provider: 'WALLET',
            paidAt: now,
          },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: montantTotal },
        },
      });

      await tx.transaction.create({
        data: {
          senderId: userId,
          receiverId: null,
          amount: new Decimal(montantTotal),
          type: TransactionType.TONTINE_PAYMENT,
          status: TransactionStatus.COMPLETED,
          reference,
          note: `Cotisation tontine ${tontine.titre} — Cycle ${activeCycle.cycleNumber}`,
          metadata: {
            tontineId,
            cycleId: activeCycle.id,
            montantBase: tontine.montant,
            penalite,
          },
        },
      });

      const allCotisations = await tx.cotisation.findMany({
        where: { cycleId: activeCycle.id },
      });
      const allPaid = allCotisations.every(
        (c) =>
          c.status === CotisationStatus.PAID || c.status === CotisationStatus.LATE,
      );
      if (allPaid) {
        await this.disburseCycle(tx as unknown as PrismaClient, activeCycle.id);
      }
    });

    await this.notificationsService.create(
      userId,
      '✅ Cotisation payée',
      `Votre cotisation de ${montantTotal} XOF a été débitée de votre wallet.`,
      NotificationType.WALLET_DEBIT,
      { amount: montantTotal, tontineId },
    );

    return {
      success: true,
      montantPayé: montantTotal,
      nouveauSolde: Number(user.walletBalance) - montantTotal,
    };
  }

  async getPendingCotisation(userId: string, tontineId: string) {
    const cycle = await this.prisma.tontineCycle.findFirst({
      where: {
        tontineId,
        status: { in: [CycleStatus.OPEN, CycleStatus.WAITING] },
      },
      orderBy: { cycleNumber: 'asc' },
    });
    if (!cycle) return null;
    const cotisation = await this.prisma.cotisation.findFirst({
      where: {
        cycleId: cycle.id,
        member: { userId, tontineId },
        status: { in: [CotisationStatus.PENDING, CotisationStatus.MISSING] },
      },
    });
    return cotisation;
  }

  async getTontineDetail(userId: string, id: string) {
    const membership = await this.prisma.tontineMember.findFirst({
      where: { tontineId: id, userId },
      include: {
        tontine: {
          include: {
            creator: { select: { id: true, fullname: true, avatarUrl: true } },
            members: {
              where: { status: MemberStatus.ACTIVE },
              include: {
                user: { select: { id: true, fullname: true, avatarUrl: true } },
              },
              orderBy: { tourOrder: 'asc' },
            },
            cycles: {
              where: {
                status: { in: [CycleStatus.OPEN, CycleStatus.WAITING] },
              },
              take: 1,
              orderBy: { cycleNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!membership || !membership.tontine) {
      throw new NotFoundException('Tontine introuvable');
    }

    return {
      ...membership.tontine,
      userRole: membership.role,
      userMemberId: membership.id,
      userTourOrder: membership.tourOrder,
    };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.tontine.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, fullname: true, avatarUrl: true } },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.tontine.count(),
    ]);
    return { data, total, page, limit };
  }

  async updateStatus(id: string, status: TontineStatus) {
    const tontine = await this.prisma.tontine.findUnique({ where: { id } });
    if (!tontine) throw new NotFoundException('Tontine introuvable');
    return this.prisma.tontine.update({
      where: { id },
      data: { status },
    });
  }

  async cancelTontine(userId: string, id: string) {
    const tontine = await this.prisma.tontine.findUnique({
      where: { id },
    });

    if (!tontine) throw new NotFoundException('Tontine introuvable');
    if (tontine.creatorId !== userId) {
      throw new ForbiddenException('Seul le créateur peut annuler');
    }
    if (tontine.status !== TontineStatus.PENDING) {
      throw new BadRequestException(
        'Impossible d\'annuler une tontine déjà démarrée',
      );
    }

    return this.prisma.tontine.update({
      where: { id },
      data: { status: TontineStatus.CANCELLED },
    });
  }
}
