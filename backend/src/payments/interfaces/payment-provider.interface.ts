export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type Currency = 'XOF' | 'GHS' | 'XAF';

export interface InitiatePaymentParams {
  amount: number;
  phone: string;
  currency: Currency;
  reference: string;
  description: string;
  userId: string;
  tontineId: string;
  cycleId: string;
}

export interface TransferParams {
  amount: number;
  phone: string;
  reference: string;
  recipientName: string;
  currency: Currency;
}

export interface PaymentResult {
  transactionId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  ussdCode?: string;
  message?: string;
}

export interface TransactionVerification {
  transactionId: string;
  status: PaymentStatus;
  amount?: number;
  fee?: number;
  completedAt?: Date;
}

export interface PaymentProvider {
  name: string;
  initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult>;
  initiateTransfer(params: TransferParams): Promise<PaymentResult>;
  verifyTransaction(transactionId: string): Promise<TransactionVerification>;
  validateWebhookSignature(payload: unknown, signature: string): boolean;
}
