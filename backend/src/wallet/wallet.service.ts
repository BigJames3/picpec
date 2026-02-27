import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentService, ProviderName } from '../payments/payment.service';
import { TransferDto } from './dto/transfer.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import {
  DepositMobileMoneyDto,
  WithdrawMobileMoneyDto,
} from './dto/deposit-mobile-money.dto';
import { paginate } from '../common/dto/pagination.dto';

const DAILY_LIMIT_XOF = 2_000_000;

@Injectable()
export class WalletService {
  private generateReference(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly paymentService: PaymentService,
    private readonly jwtService: JwtService,
  ) {}

  private async checkDailyLimit(userId: string, additionalAmount: number): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyTotal = await this.prisma.transaction.aggregate({
      where: {
        senderId: userId,
        type: { in: [TransactionType.TRANSFER, TransactionType.WITHDRAW] },
        createdAt: { gte: todayStart },
        status: TransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
    });
    const dailyUsed = Number(dailyTotal._sum.amount ?? 0);
    if (dailyUsed + additionalAmount > DAILY_LIMIT_XOF) {
      throw new BadRequestException(
        `Limite journalière dépassée. Reste disponible : ${(DAILY_LIMIT_XOF - dailyUsed).toLocaleString()} XOF`,
      );
    }
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    if (!user) return { balance: 0 };
    return { balance: Number(user.walletBalance) };
  }

  async deposit(userId: string, amount: number) {
    const decimalAmount = new Decimal(amount);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: decimalAmount } },
      }),
      this.prisma.transaction.create({
        data: {
          receiverId: userId,
          amount: decimalAmount,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          reference: this.generateReference('DEP'),
          metadata: { method: 'manual' },
        },
      }),
    ]);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    return { balance: Number(user!.walletBalance) };
  }

  async withdraw(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    if (!user) throw new BadRequestException('User not found');
    const balance = Number(user.walletBalance);
    if (balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const decimalAmount = new Decimal(amount);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: decimalAmount } },
      }),
      this.prisma.transaction.create({
        data: {
          senderId: userId,
          amount: decimalAmount,
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.COMPLETED,
          reference: this.generateReference('WDR'),
          metadata: { method: 'manual' },
        },
      }),
    ]);
    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    return { balance: Number(updated!.walletBalance) };
  }

  async transfer(senderId: string, dto: TransferDto) {
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
      select: { id: true, fullname: true, walletBalance: true },
    });
    if (!receiver)
      throw new NotFoundException('Destinataire introuvable');
    if (receiver.id === senderId) {
      throw new BadRequestException(
        'Impossible de se transférer à soi-même',
      );
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { walletBalance: true, fullname: true },
    });
    if (!sender) throw new NotFoundException('Utilisateur introuvable');
    if (Number(sender.walletBalance) < dto.amount) {
      throw new BadRequestException('Solde insuffisant');
    }

    await this.checkDailyLimit(senderId, dto.amount);

    const reference = `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const decimalAmount = new Decimal(dto.amount);

    const [, , transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: senderId },
        data: { walletBalance: { decrement: decimalAmount } },
      }),
      this.prisma.user.update({
        where: { id: dto.receiverId },
        data: { walletBalance: { increment: decimalAmount } },
      }),
      this.prisma.transaction.create({
        data: {
          senderId,
          receiverId: dto.receiverId,
          amount: decimalAmount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          reference,
          note: dto.note,
        },
      }),
    ]);

    this.notifications
      .notifyWalletDebit(senderId, dto.amount, 'TRANSFER')
      .catch(() => {});
    this.notifications
      .notifyWalletCredit(dto.receiverId, dto.amount, 'TRANSFER')
      .catch(() => {});

    return transaction;
  }

  async initiateDepositMobileMoney(userId: string, dto: DepositMobileMoneyDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullname: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const reference = `WALLET-DEP-${userId}-${Date.now()}`;

    const transaction = await this.prisma.transaction.create({
      data: {
        senderId: null,
        receiverId: userId,
        amount: new Decimal(dto.amount),
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        reference,
        metadata: {
          provider: dto.provider,
          phone: dto.phone,
          method: 'mobile_money',
        },
      },
    });

    const result = await this.paymentService.initiateCotisationPayment(
      dto.provider as ProviderName,
      {
        amount: dto.amount,
        phone: dto.phone,
        currency: 'XOF',
        reference,
        description: 'Dépôt wallet PICPEC',
        userId,
        tontineId: 'WALLET',
        cycleId: 'DEPOSIT',
      },
    );

    return {
      transactionId: transaction.id,
      reference,
      status: 'PENDING',
      checkoutUrl: result.checkoutUrl,
      message: `Confirmez le paiement de ${dto.amount.toLocaleString('fr-FR')} XOF sur votre téléphone`,
    };
  }

  async initiateWithdrawMobileMoney(userId: string, dto: WithdrawMobileMoneyDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullname: true, walletBalance: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const balance = Number(user.walletBalance);
    if (balance < dto.amount) {
      throw new BadRequestException(
        `Solde insuffisant (${balance.toLocaleString('fr-FR')} XOF disponible)`,
      );
    }

    await this.checkDailyLimit(userId, dto.amount);

    const reference = `WALLET-WIT-${userId}-${Date.now()}`;
    const decimalAmount = new Decimal(dto.amount);

    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: decimalAmount } },
      });

      return tx.transaction.create({
        data: {
          senderId: userId,
          receiverId: null,
          amount: decimalAmount,
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.PENDING,
          reference,
          metadata: {
            provider: dto.provider,
            phone: dto.phone,
            method: 'mobile_money',
          },
        },
      });
    });

    try {
      const disburseResult = await this.paymentService.disburseToBeneficiary({
        tontineId: 'WALLET',
        cycleId: transaction.id,
        beneficiaryPhone: dto.phone,
        beneficiaryName: user.fullname,
        amount: dto.amount,
        currency: 'XOF',
        provider: dto.provider as ProviderName,
      });

      if (disburseResult.status === 'SUCCESS') {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.COMPLETED },
        });
      }

      return {
        transactionId: transaction.id,
        reference,
        status: disburseResult.status,
      };
    } catch {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { walletBalance: { increment: decimalAmount } },
        }),
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.FAILED },
        }),
      ]);
      throw new BadRequestException('Le retrait vers Mobile Money a échoué');
    }
  }

  async verifyPin(userId: string, pin: string): Promise<{ actionToken: string }> {
    if (!/^\d{4}$/.test(pin)) {
      throw new BadRequestException('PIN invalide');
    }

    const actionToken = this.jwtService.sign(
      { sub: userId, purpose: 'wallet_action' },
      { expiresIn: '5m' },
    );

    return { actionToken };
  }

  async getTransactions(userId: string, dto: GetTransactionsDto) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      OR: [{ senderId: userId }, { receiverId: userId }],
    };
    if (dto.type) where.type = dto.type;
    if (dto.status) where.status = dto.status;
    if (dto.dateFrom || dto.dateTo) {
      where.createdAt = {};
      if (dto.dateFrom) where.createdAt.gte = dto.dateFrom;
      if (dto.dateTo) where.createdAt.lte = dto.dateTo;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return paginate(transactions, total, page, limit);
  }

  async findOneTransaction(transactionId: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        sender: { select: { id: true, fullname: true, avatarUrl: true } },
        receiver: { select: { id: true, fullname: true, avatarUrl: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Transaction introuvable');

    const isOwner =
      transaction.senderId === userId || transaction.receiverId === userId;
    if (!isOwner) throw new ForbiddenException('Accès non autorisé');

    return transaction;
  }
}
