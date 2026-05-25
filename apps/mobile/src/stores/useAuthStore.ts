/**
 * useAuthStore — JWT + user profile (EPIC-1 Auth)
 *
 * BR refs:
 *  - BR-AUTH-04: 401 → force logout + redirect Login
 *  - BR-AUTH-12: logout clears SecureStore + store + nav stack
 *  - BR-AUTH-15 / BR-GLOBAL-06: token in SecureStore ONLY (never AsyncStorage)
 *
 * Persistence: token + user persisted via `zustandSecureStorage` adapter.
 * Hydration: `hydrate()` must be awaited at app start before rendering protected routes.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../sdk/models';
import { zustandSecureStorage } from '../adapters/secure-storage';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
}

export interface AuthActions {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrating: true,

      login: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        // BR-AUTH-12: caller must additionally clear nav stack + redirect Login.
        // Side effects (clear ticket cache, etc.) handled by AuthGate listener.
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (partial) => {
        const cur = get().user;
        if (!cur) return;
        set({ user: { ...cur, ...partial } });
      },

      hydrate: async () => {
        // persist middleware auto-rehydrates; this just flips the flag once done.
        // TODO(coder): if `persist.rehydrate()` returns a promise, await it.
        set({ isHydrating: false });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => zustandSecureStorage),
      partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrating = false;
      },
    }
  )
);
