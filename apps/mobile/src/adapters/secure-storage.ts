/**
 * Secure Storage Adapter
 * Wrapper around `expo-secure-store` with JSON serialize/deserialize + typed errors.
 *
 * Use cases:
 *  - JWT token persistence (BR-AUTH-15, BR-GLOBAL-06 — SecureStore only)
 *  - User profile cached on device
 *
 * NOTE: SecureStore values are strings only, max ~2 KB per key on iOS Keychain.
 *       Do NOT use this for large payloads — use async-storage / sqlite-cache instead.
 */

import * as SecureStore from 'expo-secure-store';

export class SecureStorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SecureStorageError';
  }
}

/** Read + JSON.parse. Returns null if key missing or parse fails. */
export async function secureGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    // TODO: pipe to Sentry breadcrumb when sentry-expo init done
    return null;
  }
}

/** JSON.stringify + write. Throws SecureStorageError on failure. */
export async function secureSet<T>(key: string, value: T): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch (err) {
    throw new SecureStorageError(`Failed to secureSet "${key}"`, err);
  }
}

/** Idempotent delete. Silently no-op if missing. */
export async function secureRemove(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore — delete is idempotent
  }
}

/** Zustand persist storage adapter shape (sync API expected by zustand v4 createJSONStorage). */
export const zustandSecureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};
