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

export class OrangeMoneyProvider implements PaymentProvider {
  name = 'ORANGE_MONEY';
  private baseUrl = 'https://api-checkout.cinetpay.com/v2';
  private apiKey: string;
  private siteId: string;
  private secretKey: string;
  private notifyUrl: string;

  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY ?? '';
    this.siteId = process.env.CINETPAY_SITE_ID ?? '';
    this.secretKey = process.env.CINETPAY_SECRET_KEY ?? '';
    this.notifyUrl = `${process.env.API_BASE_URL ?? ''}/api/webhooks/payment/orange`;
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    console.log(
      `[${this.name}] initiatePay ref=${params.reference} amount=${params.amount} phone=${params.phone.slice(0, -4)}****`,
    );
    const response = await axios.post(`${this.baseUrl}/payment`, {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: params.reference,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      customer_name: '',
      customer_phone_number: params.phone,
      channels: 'MOBILE_MONEY',
      notify_url: this.notifyUrl,
      return_url: `${process.env.APP_DEEP_LINK ?? 'yourapp://'}/payment/result`,
      metadata: JSON.stringify({
        userId: params.userId,
        tontineId: params.tontineId,
        cycleId: params.cycleId,
      }),
    });

    if (response.data.code !== '201') {
      throw new Error(`CinetPay error: ${response.data.message}`);
    }

    return {
      transactionId: params.reference,
      status: 'PENDING',
      checkoutUrl: response.data.data?.payment_url,
    };
  }

  async initiateTransfer(params: TransferParams): Promise<PaymentResult> {
    const response = await axios.post(
      `${this.baseUrl}/transfer/money/send/contact`,
      {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: params.reference,
        amount: params.amount,
        currency: params.currency,
        prefix: '225',
        phone: params.phone,
        notify_url: `${process.env.API_BASE_URL ?? ''}/api/webhooks/payment/orange/transfer`,
      },
    );

    return {
      transactionId: params.reference,
      status: response.data.code === '0' ? 'SUCCESS' : 'PENDING',
    };
  }

  async verifyTransaction(
    transactionId: string,
  ): Promise<TransactionVerification> {
    const response = await axios.post(`${this.baseUrl}/payment/check`, {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: transactionId,
    });

    const statusMap: Record<string, PaymentStatus> = {
      ACCEPTED: 'SUCCESS',
      REFUSED: 'FAILED',
      PENDING: 'PENDING',
    };

    return {
      transactionId,
      status: statusMap[response.data.data?.status] ?? 'FAILED',
      amount: response.data.data?.amount,
    };
  }

  validateWebhookSignature(payload: unknown, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    return expected === signature;
  }
}
