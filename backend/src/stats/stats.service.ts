import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutMoisPrecedent = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const [
      totalUsers,
      newUsersThisMonth,
      usersLastMonth,
      transactionsToday,
      txTodayAgg,
      txLastMonthCount,
      activeTontines,
      tontinesCreatedThisMonth,
      tontinesCreatedLastMonth,
      activeProducts,
      productsCreatedThisMonth,
      productsCreatedLastMonth,
      recentUsers,
      recentTransactions,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: debutMois } },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: debutMoisPrecedent,
            lt: debutMois,
          },
        },
      }),
      this.prisma.transaction.count({
        where: { createdAt: { gte: debutJour } },
      }),
      this.prisma.transaction.aggregate({
        where: {
          createdAt: { gte: debutJour },
          status: TransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({
        where: {
          createdAt: {
            gte: debutMoisPrecedent,
            lt: debutMois,
          },
        },
      }),
      this.prisma.tontine.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tontine.count({
        where: { createdAt: { gte: debutMois } },
      }),
      this.prisma.tontine.count({
        where: {
          createdAt: {
            gte: debutMoisPrecedent,
            lt: debutMois,
          },
        },
      }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.count({
        where: { createdAt: { gte: debutMois } },
      }),
      this.prisma.product.count({
        where: {
          createdAt: {
            gte: debutMoisPrecedent,
            lt: debutMois,
          },
        },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullname: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, fullname: true } },
          receiver: { select: { id: true, fullname: true } },
        },
      }),
    ]);

    const transactionsTodayAmount = Number(txTodayAgg._sum.amount ?? 0);

    const userGrowthPercent =
      usersLastMonth > 0
        ? Math.round((newUsersThisMonth / usersLastMonth) * 100)
        : newUsersThisMonth > 0
          ? 100
          : 0;

    const transactionGrowthPercent =
      txLastMonthCount > 0
        ? Math.round(
            ((transactionsToday - txLastMonthCount) / txLastMonthCount) * 100,
          )
        : transactionsToday > 0
          ? 100
          : 0;

    const tontineGrowthPercent =
      tontinesCreatedLastMonth > 0
        ? Math.round(
            ((tontinesCreatedThisMonth - tontinesCreatedLastMonth) /
              tontinesCreatedLastMonth) *
              100,
          )
        : tontinesCreatedThisMonth > 0
          ? 100
          : 0;

    const productGrowthPercent =
      productsCreatedLastMonth > 0
        ? Math.round(
            ((productsCreatedThisMonth - productsCreatedLastMonth) /
              productsCreatedLastMonth) *
              100,
          )
        : productsCreatedThisMonth > 0
          ? 100
          : 0;

    return {
      totalUsers,
      newUsersThisMonth,
      userGrowthPercent,
      transactionsToday,
      transactionsTodayAmount,
      transactionGrowthPercent,
      activeTontines,
      tontineGrowthPercent,
      activeProducts,
      productGrowthPercent,
      recentUsers,
      recentTransactions,
    };
  }
}
