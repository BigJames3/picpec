import { Injectable, Logger } from '@nestjs/common';
import { PaymentService, ProviderName } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { TontinesService } from '../tontines/tontines.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WebhookHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
    private readonly tontinesService: TontinesService,
    private readonly notifications: NotificationsService,
  ) {}

  async handleWave(payload: Record<string, unknown>, signature: string) {
    const provider = this.paymentService.getProvider('WAVE');

    if (!provider.validateWebhookSignature(payload, signature)) {
      throw new Error('Signature Wave invalide');
    }

    const reference = payload.client_reference as string;
    const isSuccess = payload.checkout_status === 'complete';
    const transactionId = payload.id as string;

    await this.processCotisationPayment(
      reference,
      isSuccess,
      'WAVE',
      transactionId,
    );
  }

  async handleOrangeMoney(
    payload: Record<string, unknown>,
    signature: string,
  ) {
    const provider = this.paymentService.getProvider('ORANGE_MONEY');

    if (!provider.validateWebhookSignature(payload, signature)) {
      throw new Error('Signature Orange Money invalide');
    }

    const reference = payload.cpm_trans_id as string;
    const isSuccess = payload.cpm_result === '00';

    await this.processCotisationPayment(
      reference,
      isSuccess,
      'ORANGE_MONEY',
      reference,
    );
  }

  async handleMTNMoMo(
    payload: Record<string, unknown>,
    signature: string,
    rawBody?: string,
  ) {
    const provider = this.paymentService.getProvider('MTN_MOMO');
    const bodyForSig = rawBody ?? JSON.stringify(payload);
    if (!provider.validateWebhookSignature(bodyForSig, signature)) {
      throw new Error('Signature MTN MoMo invalide');
    }
    const reference = payload.externalId as string;
    const isSuccess = payload.status === 'SUCCESSFUL';
    const transactionId =
      (payload.financialTransactionId as string) ?? reference;

    await this.processCotisationPayment(
      reference,
      isSuccess,
      'MTN_MOMO',
      transactionId,
    );
  }

  async processCotisationPayment(
    reference: string,
    isSuccess: boolean,
    provider: ProviderName,
    transactionId: string,
  ) {
    if (reference.startsWith('WALLET-DEP-')) {
      await this.processWalletDeposit(reference, isSuccess, transactionId);
      return;
    }

    if (reference.startsWith('WALLET-WIT-')) {
      await this.processWalletWithdraw(reference, isSuccess, transactionId);
      return;
    }

    const existing = await this.prisma.pendingPayment.findUnique({
      where: { reference },
    });
    if (!existing) {
      this.logger.log(`Webhook already processed: ${reference}`);
      return;
    }

    let pending;
    try {
      pending = await this.prisma.pendingPayment.delete({
        where: { reference },
        include: { user: true },
      });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025') {
        this.logger.log(`Webhook already processed: ${reference}`);
        return;
      }
      throw e;
    }

    if (!isSuccess) {
      await this.notifications.create(
        pending.userId,
        'Paiement échoué',
        'Votre paiement mobile money n\'a pas abouti. Réessayez.',
        'SYSTEM',
        { reference, provider },
      );
      return;
    }

    if (pending.cotisationId) {
      await this.tontinesService.payCotisation(
        pending.userId,
        pending.cotisationId,
        transactionId,
        provider,
      );
    }

    await this.validateReferralOnFirstPayment(pending.userId);
  }

  private async processWalletDeposit(
    reference: string,
    isSuccess: boolean,
    mobileMoneyTxId: string,
  ): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      include: { receiver: true },
    });

    if (!transaction || transaction.status !== 'PENDING') {
      this.logger.log(`Wallet deposit already processed or not found: ${reference}`);
      return;
    }

    if (!isSuccess) {
      await this.prisma.transaction.update({
        where: { reference },
        data: { status: 'FAILED' },
      });
      await this.notifications.create(
        transaction.receiverId!,
        'Dépôt échoué',
        'Votre dépôt Mobile Money n\'a pas abouti. Réessayez.',
        'SYSTEM',
        { reference },
      );
      return;
    }

    const amount = Number(transaction.amount);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: transaction.receiverId! },
        data: { walletBalance: { increment: amount } },
      }),
      this.prisma.transaction.update({
        where: { reference },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...((transaction.metadata as object) ?? {}),
            mobileMoneyTxId,
          },
        },
      }),
    ]);

    await this.notifications.create(
      transaction.receiverId!,
      'Dépôt confirmé',
      `${amount.toLocaleString('fr-FR')} XOF ont été ajoutés à votre wallet`,
      'WALLET_CREDIT',
      { amount, reference },
    );
  }

  private async processWalletWithdraw(
    reference: string,
    isSuccess: boolean,
    mobileMoneyTxId: string,
  ): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      this.logger.log(`Wallet withdraw not found: ${reference}`);
      return;
    }

    if (!isSuccess && transaction.senderId) {
      const amount = Number(transaction.amount);
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: transaction.senderId },
          data: { walletBalance: { increment: amount } },
        }),
        this.prisma.transaction.update({
          where: { reference },
          data: { status: 'FAILED' },
        }),
      ]);
      await this.notifications.create(
        transaction.senderId,
        'Retrait échoué',
        'Le virement vers votre Mobile Money a échoué. Votre solde a été rétabli.',
        'SYSTEM',
        { reference },
      );
    } else if (isSuccess) {
      await this.prisma.transaction.update({
        where: { reference },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...((transaction.metadata as object) ?? {}),
            mobileMoneyTxId,
          },
        },
      });
    }
  }

  private async validateReferralOnFirstPayment(userId: string) {
    const paymentsCount = await this.prisma.transaction.count({
      where: {
        senderId: userId,
        type: 'TONTINE_PAYMENT',
        status: 'COMPLETED',
      },
    });
    if (paymentsCount !== 1) return;

    const referral = await this.prisma.referral.findFirst({
      where: { referredId: userId, status: 'PENDING' },
    });
    if (!referral) return;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'VALIDATED', validatedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: referral.referrerId },
      data: { penaltyCredits: { increment: Number(referral.rewardValue) } },
    });
    await this.notifications.create(
      referral.referrerId,
      'Parrainage validé !',
      `Votre filleul a effectué son premier paiement. Vous gagnez ${referral.rewardValue} crédit(s) de pénalité.`,
      'SYSTEM',
      { type: 'REFERRAL_VALIDATED', referralId: referral.id },
    );
  }
}
