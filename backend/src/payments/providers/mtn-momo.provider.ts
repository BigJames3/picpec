import * as crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentProvider,
  InitiatePaymentParams,
  TransferParams,
  PaymentResult,
  TransactionVerification,
  PaymentStatus,
} from '../interfaces/payment-provider.interface';

export class MTNMoMoProvider implements PaymentProvider {
  name = 'MTN_MOMO';

  private collectionBaseUrl: string;
  private disbursementBaseUrl: string;
  private collectionSubKey: string;
  private disbursementSubKey: string;
  private environment: 'sandbox' | 'production';

  constructor() {
    this.environment =
      (process.env.MTN_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
    this.collectionBaseUrl =
      this.environment === 'production'
        ? 'https://proxy.momoapi.mtn.com/collection'
        : 'https://sandbox.momodeveloper.mtn.com/collection';
    this.disbursementBaseUrl =
      this.environment === 'production'
        ? 'https://proxy.momoapi.mtn.com/disbursement'
        : 'https://sandbox.momodeveloper.mtn.com/disbursement';
    this.collectionSubKey = process.env.MTN_COLLECTION_SUBSCRIPTION_KEY ?? '';
    this.disbursementSubKey =
      process.env.MTN_DISBURSEMENT_SUBSCRIPTION_KEY ?? '';
  }

  private async getCollectionToken(): Promise<string> {
    const response = await axios.post(
      `${this.collectionBaseUrl}/token/`,
      {},
      {
        auth: {
          username: process.env.MTN_API_USER_COLLECTION ?? '',
          password: process.env.MTN_API_KEY_COLLECTION ?? '',
        },
        headers: { 'Ocp-Apim-Subscription-Key': this.collectionSubKey },
      },
    );
    return response.data.access_token;
  }

  private async getDisbursementToken(): Promise<string> {
    const response = await axios.post(
      `${this.disbursementBaseUrl}/token/`,
      {},
      {
        auth: {
          username: process.env.MTN_API_USER_DISBURSEMENT ?? '',
          password: process.env.MTN_API_KEY_DISBURSEMENT ?? '',
        },
        headers: { 'Ocp-Apim-Subscription-Key': this.disbursementSubKey },
      },
    );
    return response.data.access_token;
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    console.log(
      `[${this.name}] initiatePay ref=${params.reference} amount=${params.amount} phone=${params.phone.slice(0, -4)}****`,
    );
    const token = await this.getCollectionToken();
    const externalId = params.reference;

    await axios.post(
      `${this.collectionBaseUrl}/v1_0/requesttopay`,
      {
        amount: String(params.amount),
        currency: params.currency,
        externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: params.phone.replace('+', ''),
        },
        payerMessage: params.description,
        payeeNote: 'Tontine cotisation cycle',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': externalId,
          'X-Target-Environment': this.environment,
          'Ocp-Apim-Subscription-Key': this.collectionSubKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return { transactionId: externalId, status: 'PENDING' };
  }

  async initiateTransfer(params: TransferParams): Promise<PaymentResult> {
    const token = await this.getDisbursementToken();
    const transferId = uuidv4();

    await axios.post(
      `${this.disbursementBaseUrl}/v1_0/transfer`,
      {
        amount: String(params.amount),
        currency: params.currency,
        externalId: params.reference,
        payee: {
          partyIdType: 'MSISDN',
          partyId: params.phone.replace('+', ''),
        },
        payerMessage: 'Tontine - virement tour',
        payeeNote: `Bénéficiaire: ${params.recipientName}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': transferId,
          'X-Target-Environment': this.environment,
          'Ocp-Apim-Subscription-Key': this.disbursementSubKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return { transactionId: transferId, status: 'PENDING' };
  }

  async verifyTransaction(
    transactionId: string,
  ): Promise<TransactionVerification> {
    const token = await this.getCollectionToken();

    const response = await axios.get(
      `${this.collectionBaseUrl}/v1_0/requesttopay/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Target-Environment': this.environment,
          'Ocp-Apim-Subscription-Key': this.collectionSubKey,
        },
      },
    );

    const statusMap: Record<string, PaymentStatus> = {
      SUCCESSFUL: 'SUCCESS',
      FAILED: 'FAILED',
      PENDING: 'PENDING',
    };

    return {
      transactionId,
      status: statusMap[response.data.status] ?? 'FAILED',
      amount: response.data.amount,
    };
  }

  validateWebhookSignature(body: string, signature: string): boolean {
    const secret = process.env.MTN_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[MTN] MTN_WEBHOOK_SECRET not set — rejecting webhook');
      return false;
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature || '', 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
