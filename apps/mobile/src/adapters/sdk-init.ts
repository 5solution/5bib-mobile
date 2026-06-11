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

/** Resolved at init — single source of truth for "which backend am I on". */
let resolvedBaseURL = 'https://dapi.5bib.com';

/** The base URL the SDK was initialized with. */
export function getApiBaseUrl(): string {
  return resolvedBaseURL;
}

/**
 * True when pointed at the PRODUCTION backend (api.5bib.com).
 *
 * Used to hard-disable dev-only escape hatches regardless of `__DEV__`:
 * a dev client (Metro, __DEV__=true) pointed at prod via
 * EXPO_PUBLIC_API_URL must NOT expose fake-payment — it would mark real
 * orders as paid without money moving.
 */
export function isProductionApi(): boolean {
  return /(^|\.)api\.5bib\.com/i.test(resolvedBaseURL);
}

export async function initSdk(opts: SdkInitOptions = {}): Promise<void> {
  const baseURL =
    opts.baseURL ?? process.env.EXPO_PUBLIC_API_URL ?? 'https://dapi.5bib.com';
  resolvedBaseURL = baseURL;

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
