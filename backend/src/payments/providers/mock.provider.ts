import {
  PaymentProvider,
  InitiatePaymentParams,
  TransferParams,
  PaymentResult,
  TransactionVerification,
} from '../interfaces/payment-provider.interface';
import { mockConfig } from '../../common/config/environment';

const mockTransactions = new Map<
  string,
  {
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    amount: number;
    phone: string;
    type: 'PAYMENT' | 'TRANSFER';
    createdAt: Date;
  }
>();

export class MockPaymentProvider implements PaymentProvider {
  name = 'MOCK';

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    console.log(`\n🧪 [MOCK PAYMENT] Initiation paiement`);
    console.log(`   📱 Téléphone : ${params.phone}`);
    console.log(`   💰 Montant   : ${params.amount} FCFA`);
    console.log(`   🔑 Référence : ${params.reference}`);

    mockTransactions.set(params.reference, {
      status: 'PENDING',
      amount: params.amount,
      phone: params.phone,
      type: 'PAYMENT',
      createdAt: new Date(),
    });

    setTimeout(async () => {
      const shouldSucceed = Math.random() * 100 < mockConfig.successRate;
      const newStatus = shouldSucceed ? 'SUCCESS' : 'FAILED';

      const tx = mockTransactions.get(params.reference);
      if (tx) {
        mockTransactions.set(params.reference, { ...tx, status: newStatus });
      }

      console.log(`\n🧪 [MOCK PAYMENT] Confirmation automatique`);
      console.log(`   🔑 Référence : ${params.reference}`);
      console.log(`   ${shouldSucceed ? '✅' : '❌'} Statut : ${newStatus}`);

      await this.triggerLocalWebhook(params.reference, newStatus, params.amount);
    }, mockConfig.paymentDelayMs);

    return {
      transactionId: params.reference,
      status: 'PENDING',
      checkoutUrl: undefined,
    };
  }

  async initiateTransfer(params: TransferParams): Promise<PaymentResult> {
    console.log(`\n🧪 [MOCK TRANSFER] Initiation virement`);
    console.log(`   📱 Destinataire : ${params.phone}`);
    console.log(`   👤 Nom          : ${params.recipientName}`);
    console.log(`   💰 Montant      : ${params.amount} FCFA`);

    mockTransactions.set(params.reference, {
      status: 'PENDING',
      amount: params.amount,
      phone: params.phone,
      type: 'TRANSFER',
      createdAt: new Date(),
    });

    setTimeout(() => {
      const tx = mockTransactions.get(params.reference);
      if (tx) {
        mockTransactions.set(params.reference, { ...tx, status: 'SUCCESS' });
      }
      console.log(
        `\n🧪 [MOCK TRANSFER] ✅ Virement effectué vers ${params.phone} — ${params.amount} FCFA`
      );
    }, mockConfig.transferDelayMs);

    return { transactionId: params.reference, status: 'PENDING' };
  }

  async verifyTransaction(
    transactionId: string
  ): Promise<TransactionVerification> {
    const tx = mockTransactions.get(transactionId);
    if (!tx)
      return { transactionId, status: 'FAILED' as const };

    console.log(`🧪 [MOCK] Vérification transaction ${transactionId} → ${tx.status}`);
    return {
      transactionId,
      status: tx.status as 'PENDING' | 'SUCCESS' | 'FAILED',
      amount: tx.amount,
    };
  }

  validateWebhookSignature(_payload: unknown, _signature: string): boolean {
    return true;
  }

  private async triggerLocalWebhook(
    reference: string,
    status: string,
    amount: number
  ) {
    try {
      const axios = await import('axios');
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      await axios.default.post(
        `${baseUrl}/api/webhooks/payment/mock`,
        {
          reference,
          status,
          amount,
          timestamp: new Date().toISOString(),
        },
        { headers: { 'x-mock-signature': 'local-test' } }
      );
      console.log(`🧪 [MOCK WEBHOOK] Webhook déclenché pour ${reference}`);
    } catch (e) {
      console.error(`🧪 [MOCK WEBHOOK] Erreur :`, e);
    }
  }
}
