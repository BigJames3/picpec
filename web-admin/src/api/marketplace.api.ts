/**
 * API Marketplace - Modération produits
 * Utilise le client Axios configuré (Bearer + refresh)
 */
import api from './client';
import type {
  MarketplaceProduct,
  MarketplaceListParams,
} from '@/types/marketplace.types';

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const marketplaceApi = {
  /** Liste paginée des produits (modération) */
  getProducts: (params?: MarketplaceListParams) =>
    api
      .get<{ data: MarketplaceProduct[]; meta: PaginatedMeta }>(
        '/marketplace',
        { params }
      )
      .then((r) => r.data),

  /** Approuver un produit */
  approve: (id: string) =>
    api.patch<{ data: MarketplaceProduct }>(`/marketplace/${id}/approve`).then((r) => r.data),

  /** Rejeter un produit */
  reject: (id: string, reason?: string) =>
    api
      .patch<{ data: MarketplaceProduct }>(`/marketplace/${id}/reject`, { reason })
      .then((r) => r.data),

  /** Suspendre un produit */
  suspend: (id: string, reason?: string) =>
    api
      .patch<{ data: MarketplaceProduct }>(`/marketplace/${id}/suspend`, { reason })
      .then((r) => r.data),
};
