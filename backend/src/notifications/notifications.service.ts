import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  }

  async findAllByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<{ id: string; title: string; body: string; type: string; isRead: boolean; createdAt: Date }>> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          body: true,
          type: true,
          isRead: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return paginate(data, total, page, limit);
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async notifyTontinePaymentDue(
    tontineId: string,
    memberId: string,
    daysLeft: number,
  ) {
    return this.create(
      memberId,
      'Rappel cotisation',
      `Votre cotisation est due dans ${daysLeft} jour(s)`,
      NotificationType.TONTINE_PAYMENT_DUE,
      { tontineId, daysLeft },
    );
  }

  async notifyTontineTurnWon(
    tontineId: string,
    winnerId: string,
    amount: number,
  ) {
    return this.create(
      winnerId,
      "🎉 C'est votre tour !",
      `Vous recevez ${amount.toLocaleString()} XOF de la tontine`,
      NotificationType.TONTINE_TURN_WON,
      { tontineId, amount },
    );
  }

  async notifyWalletCredit(
    userId: string,
    amount: number,
    type: string,
  ) {
    return this.create(
      userId,
      'Crédit reçu',
      `+${amount.toLocaleString()} XOF sur votre wallet`,
      NotificationType.WALLET_CREDIT,
      { amount, transactionType: type },
    );
  }

  async notifyWalletDebit(
    userId: string,
    amount: number,
    type: string,
  ) {
    return this.create(
      userId,
      'Débit effectué',
      `-${amount.toLocaleString()} XOF de votre wallet`,
      NotificationType.WALLET_DEBIT,
      { amount, transactionType: type },
    );
  }

  async notifyMarketplacePurchase(
    buyerId: string,
    sellerId: string,
    productName: string,
    amount: number,
  ) {
    await Promise.all([
      this.create(
        buyerId,
        'Achat effectué',
        `Vous avez acheté "${productName}" pour ${amount.toLocaleString()} XOF`,
        NotificationType.MARKETPLACE_PURCHASE,
        { productName, amount },
      ),
      this.create(
        sellerId,
        'Vente effectuée',
        `Votre produit "${productName}" a été vendu pour ${amount.toLocaleString()} XOF`,
        NotificationType.MARKETPLACE_SALE,
        { productName, amount },
      ),
    ]);
  }
}
