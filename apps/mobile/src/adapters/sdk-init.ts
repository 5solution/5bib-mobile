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
import { secureGet, secureRemove, secureSet } from './secure-storage';
import { eventBus } from './event-bus';
import { user } from '../sdk/services/user';

export const TOKEN_KEY = 'auth.token';

/** Decode a JWT's `exp` (ms epoch). Returns null if unparseable. */
function tokenExpMs(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 =
      part.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - (part.length % 4)) % 4);
    // Hermes (RN 0.74) provides a global atob.
    const json =
      typeof atob === 'function' ? atob(b64) : '';
    if (!json) return null;
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Persist a freshly-renewed token. Single source of truth for API auth is
 * SecureStore (getToken reads it), so every in-flight + future request picks
 * up the new credential immediately.
 */
async function persistRenewedToken(token: string): Promise<void> {
  await secureSet(TOKEN_KEY, token);
}

/**
 * PROACTIVE refresh — call at app boot and on foreground. Renews the JWT
 * before it expires so the user is never bounced to login mid-session. The
 * token lives ~7 days; refresh once it's inside its final 2 days (or if we
 * can't read its expiry). Silent: failure just defers to the reactive 401
 * path in the Fetcher.
 */
const PROACTIVE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
export async function maybeRefreshToken(): Promise<void> {
  const current = await secureGet<string>(TOKEN_KEY);
  if (!current) return;
  const expMs = tokenExpMs(current);
  if (expMs != null && expMs - Date.now() > PROACTIVE_WINDOW_MS) return;
  try {
    const res = await user.refresh();
    if (res?.token) await persistRenewedToken(res.token);
  } catch {
    // ignore — the reactive refresh-on-401 path is the safety net.
  }
}

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
    refreshToken: async () => {
      // REACTIVE refresh — the Fetcher calls this on a 401 BEFORE logging out.
      // Renew via /renew, persist, and hand the new token back so the original
      // request is retried. Return null (→ logout) only if renew itself fails.
      try {
        const res = await user.refresh();
        if (res?.token) {
          await persistRenewedToken(res.token);
          return res.token;
        }
        return null;
      } catch {
        return null;
      }
    },
    onUnauthorized: async () => {
      // BR-AUTH-04: refresh already failed → clear token + force logout.
      await secureRemove(TOKEN_KEY);
      eventBus.emit('AUTH_EXPIRED', { reason: '401' });
    },
    timeoutMs: 15000,
  });
}
