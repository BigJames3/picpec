import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CycleStatus, CotisationStatus } from '@prisma/client';

@Injectable()
export class TontinesScheduler {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 * * * *')
  async checkExpiredCycles() {
    const now = new Date();

    const expiredCycles = await this.prisma.tontineCycle.findMany({
      where: {
        status: CycleStatus.OPEN,
        dateFin: { lt: now },
      },
      include: {
        tontine: true,
        cotisations: {
          where: { status: CotisationStatus.PENDING },
          include: { member: { include: { user: true } } },
        },
      },
    });

    for (const cycle of expiredCycles) {
      for (const cotisation of cycle.cotisations) {
        const penalite =
          (cycle.tontine.montant * cycle.tontine.tauxPenalite) / 100;
        await this.prisma.cotisation.update({
          where: { id: cotisation.id },
          data: {
            penalite,
            totalPaye: cycle.tontine.montant + penalite,
          },
        });
      }

      await this.prisma.tontineCycle.update({
        where: { id: cycle.id },
        data: { status: CycleStatus.WAITING },
      });
    }
  }
}
