import axios from 'axios';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  InitiatePaymentParams,
  TransferParams,
  PaymentResult,
  TransactionVerification,
  PaymentStatus,
} from '../interfaces/payment-provider.interface';

export class WaveProvider implements PaymentProvider {
  name = 'WAVE';
  private baseUrl = 'https://api.wave.com/v1';
  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.WAVE_API_KEY ?? '';
    this.webhookSecret = process.env.WAVE_WEBHOOK_SECRET ?? '';
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    console.log(
      `[${this.name}] initiatePay ref=${params.reference} amount=${params.amount} phone=${params.phone.slice(0, -4)}****`,
    );
    const response = await axios.post(
      `${this.baseUrl}/checkout/sessions`,
      {
        amount: String(params.amount),
        currency: params.currency,
        client_reference: params.reference,
        success_url: `${process.env.APP_DEEP_LINK ?? 'yourapp://'}/payment/success`,
        error_url: `${process.env.APP_DEEP_LINK ?? 'yourapp://'}/payment/error`,
        webhook_url: `${process.env.API_BASE_URL ?? ''}/api/webhooks/payment/wave`,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      transactionId: response.data.id,
      status: 'PENDING',
      checkoutUrl: response.data.wave_launch_url,
    };
  }

  async initiateTransfer(params: TransferParams): Promise<PaymentResult> {
    const response = await axios.post(
      `${this.baseUrl}/payout`,
      {
        currency: params.currency,
        receive_amount: String(params.amount),
        mobile: params.phone,
        name: params.recipientName,
        client_reference: params.reference,
        payment_reason: 'Tontine — virement tour',
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      transactionId: response.data.id,
      status: response.data.status === 'succeeded' ? 'SUCCESS' : 'PENDING',
    };
  }

  async verifyTransaction(
    transactionId: string,
  ): Promise<TransactionVerification> {
    const response = await axios.get(
      `${this.baseUrl}/checkout/sessions/${transactionId}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    );

    const statusMap: Record<string, PaymentStatus> = {
      complete: 'SUCCESS',
      expired: 'FAILED',
      cancelled: 'CANCELLED',
    };

    return {
      transactionId,
      status: statusMap[response.data.checkout_status] ?? 'PENDING',
      amount: response.data.amount,
    };
  }

  validateWebhookSignature(payload: unknown, signature: string): boolean {
    const expectedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return `sha256=${expectedSig}` === signature;
  }
}
