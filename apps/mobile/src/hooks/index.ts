/**
 * apps/mobile/src/hooks/index.ts
 *
 * Mobile-specific custom hooks.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getApiBaseUrl } from '../adapters/sdk-init';

/** Online/offline detection — BR-GLOBAL-02 + BR-BROWSE-14 + BR-WAIVER-13.
 *
 * Singleton manager instead of a bare addEventListener per hook because
 * NetInfo's `isInternetReachable` is notorious for sticking at `false`
 * after connectivity returns (its internal probe result is cached and the
 * recheck timer doesn't always fire — the app showed "offline" forever
 * until restart). Three defenses:
 *   1. Reachability probe points at OUR backend root (any HTTP response,
 *      even 403, proves the internet + 5bib are reachable) instead of the
 *      default clients3.google.com — which is both slower from VN and not
 *      the thing we actually care about.
 *   2. While offline, force `NetInfo.refresh()` every 5s so recovery is
 *      detected promptly instead of waiting on NetInfo's own timers.
 *   3. On app foreground (background→active), force a refresh — the classic
 *      stuck case is toggling airplane mode while the app is backgrounded.
 *
 * iOS Simulator + some platform configs return `isConnected = null` /
 * `isInternetReachable = null` on first event. Treat null as "unknown" =
 * online (assume connected until proven offline) — avoids the false
 * "Offline" banner on every screen that appeared during QC.
 */
type OnlineListener = (online: boolean) => void;
const onlineListeners = new Set<OnlineListener>();
let onlineState = true;
let onlineManagerStarted = false;
let offlineRecoveryTimer: ReturnType<typeof setInterval> | null = null;

function computeOnline(state: NetInfoState): boolean {
  const connected = state.isConnected !== false; // null/undefined → true
  const reachable = state.isInternetReachable !== false; // null/undefined → true
  return connected && reachable;
}

function setOnlineState(next: boolean) {
  if (next !== onlineState) {
    onlineState = next;
    onlineListeners.forEach((l) => l(next));
  }
  // Recovery polling only runs while offline.
  if (!onlineState && !offlineRecoveryTimer) {
    offlineRecoveryTimer = setInterval(() => {
      void refreshOnlineState();
    }, 5_000);
  } else if (onlineState && offlineRecoveryTimer) {
    clearInterval(offlineRecoveryTimer);
    offlineRecoveryTimer = null;
  }
}

async function refreshOnlineState(): Promise<void> {
  try {
    const s = await NetInfo.refresh();
    setOnlineState(computeOnline(s));
  } catch {
    // refresh itself failing ≠ offline; keep current state.
  }
}

function startOnlineManager() {
  if (onlineManagerStarted) return;
  onlineManagerStarted = true;
  NetInfo.configure({
    reachabilityUrl: `${getApiBaseUrl()}/`,
    // fetch() only resolves when SOMETHING answered over the network — any
    // HTTP status (dapi root answers 403 in ~0.3s) means we're online.
    reachabilityTest: async (response) => response.status > 0,
    reachabilityShortTimeout: 5_000, // recheck cadence while offline
    reachabilityLongTimeout: 60_000, // recheck cadence while online
    reachabilityRequestTimeout: 10_000,
    reachabilityShouldRun: () => true,
    shouldFetchWiFiSSID: false,
    useNativeReachability: false,
  });
  NetInfo.addEventListener((state) => setOnlineState(computeOnline(state)));
  AppState.addEventListener('change', (st) => {
    if (st === 'active') void refreshOnlineState();
  });
}

export function useOnline() {
  const [online, setOnline] = useState(onlineState);
  useEffect(() => {
    startOnlineManager();
    const l: OnlineListener = (n) => setOnline(n);
    onlineListeners.add(l);
    // Re-sync in case state changed between render and effect.
    setOnline(onlineState);
    return () => {
      onlineListeners.delete(l);
    };
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
