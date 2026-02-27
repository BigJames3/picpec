import api from './client';
import { Product, PaginatedResult } from '../types';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  slug: string;
}

export const productsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    priceMin?: number;
    priceMax?: number;
    country?: string;
    city?: string;
  }) => api.get<PaginatedResult<Product>>('/products', { params }),
  getById: (id: string) => api.get<Product>(`/products/${id}`),
  getCategories: () => api.get<Category[]>('/products/categories').then((r) => r.data),
  create: (formData: FormData) =>
    api.post<Product>('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  purchase: (id: string, quantity: number, shippingAddress?: string) =>
    api.post(`/products/${id}/purchase`, { quantity, shippingAddress }),
  getMyPurchases: (params?: { page?: number; limit?: number }) =>
    api.get<{
      purchases: { data: unknown[]; meta: { total: number; page: number; limit: number; hasMore: boolean } };
      sales: { data: unknown[]; meta: { total: number; page: number; limit: number; hasMore: boolean } };
    }>('/products/purchases/my', { params }),
  updateDeliveryStatus: (purchaseId: string, status: string, note?: string) =>
    api.patch(`/products/purchases/${purchaseId}/status`, { status, note }),
};
