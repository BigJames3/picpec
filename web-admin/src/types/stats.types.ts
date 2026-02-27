/**
 * Types statistiques pour le Dashboard Analytics
 */

export interface StatsOverview {
  users: number;
  posts: number;
  tontines: number;
  products: number;
  transactions?: number;
  revenue?: number;
}

export interface UsersGrowthPoint {
  date: string;
  count: number;
  cumulative?: number;
}

export interface RoleDistribution {
  role: string;
  count: number;
  percentage?: number;
}

export interface RevenuePoint {
  date: string;
  amount: number;
  currency?: string;
}
