/**
 * apps/mobile/src/sdk/core/index.ts
 *
 * Fetcher class — axios-based HTTP client for `@5bib/sdk` adapter.
 *
 * Ported from selling-web `src/services/core/index.ts` with these upgrades:
 *   1. Retry uses exponential backoff (1s, 2s, 4s) instead of fixed 1s.
 *   2. NO hard-coded `next-auth.signOut()` — auth lifecycle injected via
 *      `onUnauthorized` callback (mobile uses expo-secure-store + Zustand,
 *      web uses next-auth — both register their own handler).
 *   3. Token retrieval injected via `getToken()` callback (lazy read from
 *      SecureStore / cookie / etc.) so SDK has zero platform dependencies.
 *   4. baseURL injected (mobile reads from `expo-constants`, web from env).
 *
 * Source of truth: 01-ba-prd-overview.md "SDK Normalization Strategy".
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

/** Event names emitted by the fetcher's lifecycle. */
export const FETCHER_EVENTS = {
  AUTH_EXPIRED: 'AUTH_EXPIRED',
} as const;

export type FetcherEvent = (typeof FETCHER_EVENTS)[keyof typeof FETCHER_EVENTS];

/** Listener signature for fetcher events. */
export type FetcherListener = (event: FetcherEvent, payload?: unknown) => void;

/**
 * Adapter injected at boot. Keeps the SDK platform-agnostic.
 */
export interface FetcherAdapter {
  /** Base URL for all requests, e.g. `https://dapi.5bib.com`. */
  baseURL: string;
  /**
   * Lazy token getter — called on every request. Return `undefined` for
   * unauthenticated calls. Mobile reads from expo-secure-store; web reads
   * from next-auth session.
   */
  getToken: () => Promise<string | undefined> | string | undefined;
  /**
   * Called when backend returns 401. Adapter MUST clear local credentials
   * and trigger the app's sign-out flow. SDK does NOT touch storage directly.
   */
  onUnauthorized?: () => void | Promise<void>;
  /**
   * Optional one-shot token refresh. Called by the Fetcher on a 401 BEFORE
   * giving up: the adapter should hit `/renew`, persist the fresh token, and
   * return it (or `null` if refresh failed). When it returns a token the
   * Fetcher retries the original request once with the new credential; only
   * if it returns null does `onUnauthorized` fire. Single-token model — there
   * is no separate refresh token, the about-to-expire JWT renews itself.
   */
  refreshToken?: () => Promise<string | null>;
  /** Optional request timeout in ms. Default: 15000. */
  timeoutMs?: number;
  /** Optional default headers (e.g. `Accept-Language`). */
  defaultHeaders?: Record<string, string>;
}

/** Backend wrapper envelope: `{ data: <T>, success: boolean, message?: string }`. */
export interface ApiEnvelope<T> {
  data: T;
  success?: boolean;
  message?: string;
}

/** Typed error thrown when backend returns >=400. */
export class FetcherError<T = unknown> extends Error {
  status: number;
  response?: T;
  constructor(message: string, status: number, response?: T) {
    super(message);
    this.name = 'FetcherError';
    this.status = status;
    this.response = response;
  }
}

/** Retry configuration. */
const MAX_RETRIES = 3;
/** Exponential backoff delays in ms: 1s, 2s, 4s. */
const BACKOFF_DELAYS_MS = [1000, 2000, 4000];

/** Request options accepted by Fetcher's HTTP verbs. */
export interface RequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Override base URL for this single call (rare). */
  baseURL?: string;
  /** Override timeout for this single call. */
  timeoutMs?: number;
  /** Skip retries entirely (e.g. payment idempotency-sensitive POST). */
  noRetry?: boolean;
}

/**
 * Fetcher — axios-backed HTTP client with retry, 401 handling, and
 * pluggable auth via adapter.
 */
export class Fetcher {
  private client: AxiosInstance;
  private adapter: FetcherAdapter;
  private listeners = new Set<FetcherListener>();

  constructor(adapter: FetcherAdapter) {
    this.adapter = adapter;
    this.client = axios.create({
      baseURL: adapter.baseURL,
      timeout: adapter.timeoutMs ?? 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(adapter.defaultHeaders ?? {}),
      },
    });
  }

  /**
   * Subscribe to fetcher events (e.g. `AUTH_EXPIRED`). Returns unsubscribe fn.
   */
  on(listener: FetcherListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: FetcherEvent, payload?: unknown): void {
    this.listeners.forEach((l) => l(event, payload));
  }

  /**
   * Shared refresh: many requests can 401 at once (token just expired); we
   * must call `/renew` exactly ONCE and let them all await the same result.
   */
  private refreshInFlight: Promise<string | null> | null = null;
  private refreshOnce(): Promise<string | null> {
    if (!this.adapter.refreshToken) return Promise.resolve(null);
    if (!this.refreshInFlight) {
      this.refreshInFlight = Promise.resolve(this.adapter.refreshToken())
        .catch(() => null)
        .finally(() => {
          this.refreshInFlight = null;
        });
    }
    return this.refreshInFlight;
  }

  /**
   * Manual token override — sets a long-lived Authorization header.
   * Most callers should rely on `adapter.getToken()` instead.
   */
  setToken(token?: string): void {
    if (token) {
      this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common.Authorization;
    }
  }

  /** Update the base URL at runtime (e.g. switching staging/prod). */
  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
    this.adapter.baseURL = baseURL;
  }

  // ---------- HTTP verbs ----------

  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'GET', url: path, ...options });
  }

  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>({ method: 'POST', url: path, data: body, ...options });
  }

  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>({ method: 'PUT', url: path, data: body, ...options });
  }

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>({ method: 'PATCH', url: path, data: body, ...options });
  }

  delete<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>({ method: 'DELETE', url: path, data: body, ...options });
  }

  /**
   * Core request executor with retry + 401 handling.
   * Retries 3x with exponential backoff on network error OR 5xx response.
   * Does NOT retry on 4xx (client error) or when `noRetry` is true.
   */
  private async request<T>(
    config: AxiosRequestConfig & { noRetry?: boolean },
  ): Promise<T> {
    const { noRetry, ...axiosConfig } = config;

    // Lazy-resolve token per request
    const token = await this.adapter.getToken();
    if (token) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    let lastError: unknown;
    // Guards the one-shot reactive token refresh (below) so a request whose
    // retry ALSO 401s logs out instead of looping on /renew forever.
    let didRefresh = false;

    for (let attempt = 0; attempt < (noRetry ? 1 : MAX_RETRIES); attempt++) {
      try {
        const response: AxiosResponse<T> = await this.client.request<T>(axiosConfig);
        return response.data;
      } catch (err) {
        lastError = err;
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;

        // 401 → try a one-shot token refresh, then retry; only logout if that
        // fails. Skip for the /renew call itself (can't refresh a refresh).
        if (status === 401) {
          if (
            this.adapter.refreshToken &&
            !didRefresh &&
            axiosConfig.url !== '/renew'
          ) {
            didRefresh = true;
            const newToken = await this.refreshOnce();
            if (newToken) {
              axiosConfig.headers = {
                ...axiosConfig.headers,
                Authorization: `Bearer ${newToken}`,
              };
              // Re-run THIS attempt with the fresh credential (decrement so
              // the loop bound — even noRetry's bound of 1 — still allows it).
              attempt--;
              continue;
            }
          }
          // No refresh available, or it failed → expire the session.
          this.emit(FETCHER_EVENTS.AUTH_EXPIRED, {
            url: axiosConfig.url,
          });
          if (this.adapter.onUnauthorized) {
            await this.adapter.onUnauthorized();
          }
          throw new FetcherError(
            'Session expired',
            401,
            axiosErr.response?.data,
          );
        }

        // 4xx (non-401) → no retry, throw immediately
        if (status && status >= 400 && status < 500) {
          throw new FetcherError(
            axiosErr.message,
            status,
            axiosErr.response?.data,
          );
        }

        // 5xx OR network error → retry with exponential backoff
        if (attempt < MAX_RETRIES - 1 && !noRetry) {
          await sleep(BACKOFF_DELAYS_MS[attempt] ?? 4000);
          continue;
        }
      }
    }

    // Exhausted retries
    if (lastError instanceof FetcherError) throw lastError;
    const axiosErr = lastError as AxiosError;
    throw new FetcherError(
      axiosErr?.message ?? 'Network error',
      axiosErr?.response?.status ?? 0,
      axiosErr?.response?.data,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Singleton holder. The mobile app's bootstrap calls `initFetcher(adapter)`
 * once at startup (e.g. in `app/_layout.tsx`).
 *
 * TODO: confirm whether multiple base URLs are needed for partner whitelabel —
 * if yes, switch to a factory pattern.
 */
let _network: Fetcher | null = null;

export function initFetcher(adapter: FetcherAdapter): Fetcher {
  _network = new Fetcher(adapter);
  return _network;
}

export function network(): Fetcher {
  if (!_network) {
    throw new Error(
      '[@5bib/sdk] Fetcher not initialized. Call initFetcher(adapter) at app startup.',
    );
  }
  return _network;
}
