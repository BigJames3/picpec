import api from './client';
import { Transaction, PaginatedResult } from '../types';

export const walletApi = {
  getBalance: () => api.get<{ balance: number }>('/wallet/balance'),
  deposit: (amount: number) =>
    api.post<Transaction>('/wallet/deposit', { amount }),
  withdraw: (amount: number) =>
    api.post<Transaction>('/wallet/withdraw', { amount }),
  transfer: (receiverId: string, amount: number, note?: string) =>
    api.post<Transaction>('/wallet/transfer', { receiverId, amount, note }),
  depositMobileMoney: (amount: number, provider: string, phone: string) =>
    api.post<{ transactionId: string; reference: string; status: string; checkoutUrl?: string; message?: string }>(
      '/wallet/deposit/mobile-money',
      { amount, provider, phone },
    ),
  withdrawMobileMoney: (amount: number, provider: string, phone: string) =>
    api.post<{ transactionId: string; reference: string; status: string }>(
      '/wallet/withdraw/mobile-money',
      { amount, provider, phone },
    ),
  getTransactionById: (id: string) =>
    api.get<Transaction>(`/wallet/transactions/${id}`),
  verifyPin: (pin: string) =>
    api.post<{ actionToken: string }>('/wallet/verify-pin', { pin }),
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    api.get<PaginatedResult<Transaction>>('/wallet/transactions', {
      params,
    }),
};
