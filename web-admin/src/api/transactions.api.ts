import api from './client';

export const transactionsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get('/wallet/transactions', { params }),
  getById: (id: string) => api.get(`/wallet/transactions/${id}`),
};
