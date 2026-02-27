import {
  PaymentProvider,
  InitiatePaymentParams,
  TransferParams,
  PaymentResult,
} from './interfaces/payment-provider.interface';
import { MTNMoMoProvider } from './providers/mtn-momo.provider';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { WaveProvider } from './providers/wave.provider';
import { MockPaymentProvider } from './providers/mock.provider';
import { isLocal } from '../common/config/environment';

export type ProviderName = 'MTN_MOMO' | 'ORANGE_MONEY' | 'WAVE';

export class PaymentService {
  private providers: Map<ProviderName, PaymentProvider>;

  constructor() {
    if (isLocal()) {
      const mock = new MockPaymentProvider();
      this.providers = new Map<ProviderName, PaymentProvider>([
        ['MTN_MOMO', mock],
        ['ORANGE_MONEY', mock],
        ['WAVE', mock],
      ]);
      console.log('🧪 [PaymentService] Mode LOCAL — MockPaymentProvider activé');
    } else {
      this.providers = new Map<ProviderName, PaymentProvider>([
        ['MTN_MOMO', new MTNMoMoProvider()],
        ['ORANGE_MONEY', new OrangeMoneyProvider()],
        ['WAVE', new WaveProvider()],
      ]);
    }
  }

  getProvider(name: ProviderName): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider ${name} non trouvé`);
    return provider;
  }

  async initiateCotisationPayment(
    provider: ProviderName,
    params: InitiatePaymentParams,
  ): Promise<PaymentResult> {
    const p = this.getProvider(provider);
    return p.initiatePayment(params);
  }

  async disburseToBeneficiary(params: {
    tontineId: string;
    cycleId: string;
    beneficiaryPhone: string;
    beneficiaryName: string;
    amount: number;
    currency: 'XOF';
    provider: ProviderName;
  }): Promise<PaymentResult> {
    const p = this.getProvider(params.provider);

    const reference = `DISBURSE-${params.tontineId}-${params.cycleId}-${Date.now()}`;

    return p.initiateTransfer({
      amount: params.amount,
      phone: params.beneficiaryPhone,
      reference,
      recipientName: params.beneficiaryName,
      currency: params.currency,
    });
  }

  async checkTransactionStatus(
    provider: ProviderName,
    transactionId: string,
  ) {
    return this.getProvider(provider).verifyTransaction(transactionId);
  }
}
