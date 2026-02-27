import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { useWalletStore } from './wallet.store';

const KEYS = {
  ACCESS_TOKEN: 'picpec_access_token',
  REFRESH_TOKEN: 'picpec_refresh_token',
  USER: 'picpec_user',
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  }) => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: async ({ accessToken, refreshToken, user }) => {
    // 1. Mise à jour immédiate du store (synchrone)
    set({ accessToken, refreshToken, user, isAuthenticated: true });

    // 2. Synchroniser le solde wallet
    useWalletStore.getState().refreshBalance().catch(() => {});

    // 3. Sauvegarde SecureStore en arrière-plan
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
      SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user)),
    ]);
  },

  updateUser: async (userData) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const merged = { ...current, ...userData } as User;
    set({ user: merged });
    await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(merged));
  },

  updateTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.USER);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(KEYS.USER),
      ]);
      const user = userStr ? (JSON.parse(userStr) as User) : null;
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: !!accessToken,
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },
}));
