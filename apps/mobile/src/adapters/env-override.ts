/**
 * apps/mobile/src/adapters/env-override.ts
 *
 * Hidden DEV ↔ PROD environment switch (Danny request 2026-06-12: tap the
 * login-screen logo 6 times). The override persists in AsyncStorage and is
 * read at boot BEFORE the SDK fetcher initializes, so it survives restarts
 * and wins over EXPO_PUBLIC_API_URL.
 *
 * Switching environments:
 *   1. persists the override,
 *   2. wipes the auth token (a DEV JWT is garbage on PROD and vice versa),
 *   3. re-initializes the SDK fetcher against the new host,
 *   4. re-points the NetInfo reachability probe.
 * Caller (login screen) additionally clears the auth store + shows a toast.
 *
 * ⚠️ Safety: every prod-only guard in the app keys off `isProductionApi()`
 * which reads the LIVE resolved base URL — so switching to PROD inside a
 * __DEV__ client correctly disables fake-payment, and the login screen
 * shows a permanent badge whenever the app is NOT on prod.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { initSdk } from './sdk-init';
import { secureRemove } from './secure-storage';
import { updateReachabilityUrl } from '../hooks';

export type ApiEnv = 'dev' | 'prod';

const ENV_OVERRIDE_KEY = '5bib.env.override';
const TOKEN_KEY = 'auth.token'; // mirrors sdk-init.TOKEN_KEY (import cycle-free)

export const ENV_URLS: Record<ApiEnv, string> = {
  dev: 'https://dapi.5bib.com',
  prod: 'https://api.5bib.com',
};

export function envForUrl(url: string): ApiEnv {
  return /(^|\/\/|\.)api\.5bib\.com/i.test(url) ? 'prod' : 'dev';
}

/** Read the persisted override — null means "no override, use build default". */
export async function getEnvOverride(): Promise<ApiEnv | null> {
  try {
    const v = await AsyncStorage.getItem(ENV_OVERRIDE_KEY);
    return v === 'dev' || v === 'prod' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Switch the running app to the other backend. Returns the new base URL.
 */
export async function switchApiEnv(env: ApiEnv): Promise<string> {
  const baseURL = ENV_URLS[env];
  try {
    await AsyncStorage.setItem(ENV_OVERRIDE_KEY, env);
  } catch {
    // Persistence failing is non-fatal — the in-memory switch still applies
    // until next cold start.
  }
  // Cross-env token is invalid AND dangerous (PROD token left behind while
  // testing DEV, or vice versa) — always start the new env logged out.
  await secureRemove(TOKEN_KEY);
  await initSdk({ baseURL });
  updateReachabilityUrl(baseURL);
  return baseURL;
}
