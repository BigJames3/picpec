import api from './client';

export type PaymentProvider = 'MTN_MOMO' | 'ORANGE_MONEY' | 'WAVE';

export interface InitiatePaymentParams {
  tontineId: string;
  provider: PaymentProvider;
  phone: string;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  status: string;
  checkoutUrl?: string;
  message?: string;
}

export const paymentsApi = {
  initiate: (params: InitiatePaymentParams) =>
    api.post<InitiatePaymentResponse>('/payments/initiate', params),
};
