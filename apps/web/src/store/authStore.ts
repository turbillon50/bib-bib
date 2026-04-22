import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import { setTokens, clearTokens } from '@/lib/api';
import { api } from '@/lib/api';

interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  initialize: () => void;
}

interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'passenger' | 'driver';
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isLoading: false,
      isAuthenticated: false,

      initialize: () => {
        const { tokens, user } = get();
        if (tokens && user) {
          setTokens(tokens);
          set({ isAuthenticated: true });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<AuthResponse>('/auth/login', { email, password });
          const tokens: AuthTokens = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresAt,
          };
          setTokens(tokens);
          set({
            user: response.user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true });
        try {
          const response = await api.post<AuthResponse>('/auth/register', payload);
          const tokens: AuthTokens = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresAt,
          };
          setTokens(tokens);
          set({
            user: response.user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        clearTokens();
        set({ user: null, tokens: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      setUser: (user: User) => set({ user }),

      setTokens: (tokens: AuthTokens) => {
        setTokens(tokens);
        set({ tokens });
      },

      updateProfile: async (data: Partial<User>) => {
        const updated = await api.patch<User>('/users/me', data);
        set({ user: updated });
      },

      refreshUser: async () => {
        try {
          const user = await api.get<User>('/users/me');
          set({ user });
        } catch {
          // Silently fail – auth interceptor handles 401
        }
      },
    }),
    {
      name: 'rideme-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
