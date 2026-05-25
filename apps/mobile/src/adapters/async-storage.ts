/**
 * AsyncStorage Adapter
 * Typed wrapper around `@react-native-async-storage/async-storage` with
 * JSON serialize/deserialize.
 *
 * Use cases:
 *  - Checkout draft persistence (EPIC-3)
 *  - Browse filters + recent searches (LRU max 10)
 *  - Non-sensitive cached preferences
 *
 * Sensitive data (JWT, password) MUST use secure-storage.ts instead (BR-GLOBAL-06).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function asyncGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function asyncSet<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function asyncRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function asyncMultiRemove(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}

/** Zustand persist storage adapter shape (zustand v4 createJSONStorage). */
export const zustandAsyncStorage = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};
