/**
 * Types utilisateur PICPEC Admin
 */

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MERCHANT';

export interface User {
  id: string;
  fullname: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole | string;
  isActive?: boolean;
  isBlocked?: boolean;
  walletBalance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
