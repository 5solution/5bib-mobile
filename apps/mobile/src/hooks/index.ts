/**
 * apps/mobile/src/hooks/index.ts
 *
 * Mobile-specific custom hooks.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Online/offline detection — BR-GLOBAL-02 + BR-BROWSE-14 + BR-WAIVER-13. */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected && (state.isInternetReachable ?? true));
    });
    return () => unsub();
  }, []);
  return online;
}

/**
 * Countdown timer hook — for OTP resend, payment session, rolling BIB expiry.
 * Returns secondsLeft + a `restart(seconds)` function.
 */
export function useCountdown(initialSeconds: number, autoStart = true) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(autoStart);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      setRunning(false);
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, running]);

  const restart = useCallback((s: number) => {
    setSeconds(s);
    setRunning(true);
  }, []);

  return { seconds, running, restart };
}

/**
 * Debounced value hook for search input (BR-BROWSE-06, debounce 300ms).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return v;
}

/**
 * Persist draft form to AsyncStorage with debounce.
 * Used by checkout form (BR-CHECKOUT-16) — TTL 24h.
 *
 *   const { restore, save, clear } = useDraftPersist('draft_checkout_{race}_{course}', 24);
 *   useEffect(() => { restore().then((d) => d && setForm(d)); }, []);
 *   useEffect(() => { const id = setTimeout(() => save(form), 1000); return () => clearTimeout(id); }, [form]);
 */
export function useDraftPersist<T>(key: string, ttlHours = 24) {
  const expiryMs = ttlHours * 3600 * 1000;
  const save = useCallback(
    async (data: T) => {
      const payload = { ts: Date.now(), data };
      try {
        await AsyncStorage.setItem(key, JSON.stringify(payload));
      } catch {}
    },
    [key],
  );
  const restore = useCallback(async (): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > expiryMs) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      return parsed.data as T;
    } catch {
      return null;
    }
  }, [key, expiryMs]);
  const clear = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  }, [key]);

  return { save, restore, clear };
}

/**
 * Polling hook — for order status polling (BR-CHECKOUT-19, 10s interval, 15 min max).
 *
 *   const stop = usePolling(async () => {
 *     const order = await sdk.order.getById(orderId);
 *     if (order.financialStatus === 'paid') return order;
 *     return null; // null = keep polling
 *   }, { intervalMs: 10_000, timeoutMs: 15 * 60_000, onResolve, onTimeout });
 */
export interface UsePollingOpts<T> {
  intervalMs: number;
  timeoutMs?: number;
  onResolve?: (value: T) => void;
  onTimeout?: () => void;
  onError?: (err: unknown) => void;
}

export function usePolling<T>(
  task: () => Promise<T | null>,
  opts: UsePollingOpts<T>,
  enabled = true,
) {
  const stoppedRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    stoppedRef.current = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stoppedRef.current) return;
      try {
        const v = await task();
        if (v != null) {
          opts.onResolve?.(v);
          return;
        }
      } catch (e) {
        opts.onError?.(e);
      }
      if (opts.timeoutMs && Date.now() - startedAt > opts.timeoutMs) {
        opts.onTimeout?.();
        return;
      }
      if (stoppedRef.current) return;
      timer = setTimeout(tick, opts.intervalMs);
    };
    tick();
    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, opts.intervalMs, opts.timeoutMs]);
}

/** Password strength score (0-100) — matches BR for register screen. */
export function passwordStrength(p: string): number {
  if (!p) return 0;
  let score = p.length * 5;
  if (/[a-zA-Z]/.test(p)) score += 15;
  if (/[0-9]/.test(p)) score += 15;
  if (/[^a-zA-Z0-9]/.test(p)) score += 20;
  return Math.min(100, score);
}
