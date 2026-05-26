/**
 * SDK Initializer
 * Boots `@5bib/sdk` Fetcher with platform adapters:
 *  - storage   → SecureStore for JWT (BR-AUTH-15)
 *  - onUnauthorized → eventBus.emit('AUTH_EXPIRED') (BR-AUTH-04)
 *  - baseURL   → EXPO_PUBLIC_API_URL
 *
 * Called ONCE at app entry (app/_layout.tsx) BEFORE any screen renders.
 */

import { initFetcher } from '../sdk/core';
import { secureGet, secureRemove } from './secure-storage';
import { eventBus } from './event-bus';

export const TOKEN_KEY = 'auth.token';

export interface SdkInitOptions {
  baseURL?: string;
  resultURL?: string;
}

export async function initSdk(opts: SdkInitOptions = {}): Promise<void> {
  const baseURL =
    opts.baseURL ?? process.env.EXPO_PUBLIC_API_URL ?? 'https://dapi.5bib.com';

  if (!process.env.EXPO_PUBLIC_API_URL && !opts.baseURL) {
    // eslint-disable-next-line no-console
    console.warn(
      '[sdk-init] EXPO_PUBLIC_API_URL not set — falling back to dapi.5bib.com',
    );
  }

  initFetcher({
    baseURL,
    getToken: async () => {
      const t = await secureGet<string>(TOKEN_KEY);
      return t ?? undefined;
    },
    onUnauthorized: async () => {
      // BR-AUTH-04: 401 → clear token + notify app to force logout/redirect.
      await secureRemove(TOKEN_KEY);
      eventBus.emit('AUTH_EXPIRED', { reason: '401' });
    },
    timeoutMs: 15000,
  });
}
