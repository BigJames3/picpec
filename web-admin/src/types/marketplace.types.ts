/**
 * Types Marketplace / Modération produits
 */

export type ProductStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface MarketplaceProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  status: ProductStatus;
  sellerId: string;
  sellerName?: string;
  category?: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceListParams {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
