import { create } from 'zustand';
import { Transaction } from '../types';
import { walletApi } from '../api/wallet.api';

interface WalletState {
  balance: number;
  transactions: Transaction[];
  totalTransactions: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  fetchBalance: () => Promise<void>;
  fetchTransactions: (page?: number) => Promise<void>;
  fetchMoreTransactions: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  transactions: [],
  totalTransactions: 0,
  page: 1,
  hasMore: true,
  isLoading: false,
  fetchBalance: async () => {
    const { data } = await walletApi.getBalance();
    set({ balance: data.balance });
  },
  refreshBalance: async () => {
    try {
      const res = await walletApi.getBalance();
      set({ balance: res.data.balance });
    } catch (e) {
      console.error('[Wallet] Erreur refresh:', e);
    }
  },
  fetchTransactions: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await walletApi.getTransactions({ page, limit: 10 });
      set({
        transactions: data.data,
        totalTransactions: data.meta.total,
        page,
        hasMore: data.meta.hasNextPage,
      });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchMoreTransactions: async () => {
    const { page, hasMore, transactions, isLoading } = get();
    if (!hasMore || isLoading) return;
    set({ isLoading: true });
    try {
      const nextPage = page + 1;
      const { data } = await walletApi.getTransactions({ page: nextPage, limit: 10 });
      set({
        transactions: [...transactions, ...data.data],
        page: nextPage,
        hasMore: data.meta.hasNextPage,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
