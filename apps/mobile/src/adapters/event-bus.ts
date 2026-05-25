/**
 * Typed Event Bus
 * Lightweight pub/sub for cross-module coordination without prop drilling
 * or store cross-dependencies.
 *
 * Events:
 *  - AUTH_EXPIRED   — JWT 401 detected by SDK interceptor → useAuthStore.logout() + redirect
 *  - PAYMENT_RETURN — deep link from VNPay/Payoo/MoMo redirect → checkout finalize
 *  - FORCE_UPDATE   — backend signals app version too old (BR-GLOBAL-04)
 */

export type EventMap = {
  AUTH_EXPIRED: { reason?: 'expired' | 'revoked' | '401' };
  PAYMENT_RETURN: { orderId: string; status: 'success' | 'failed' | 'pending'; raw?: unknown };
  FORCE_UPDATE: { minVersion: string; storeUrl?: string };
};

type Listener<E extends keyof EventMap> = (payload: EventMap[E]) => void;

class TypedEventBus {
  private readonly listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<E extends keyof EventMap>(event: E, fn: Listener<E>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as Listener<E>)(payload);
      } catch {
        // TODO: pipe to Sentry
      }
    }
  }

  off<E extends keyof EventMap>(event: E, fn: Listener<E>): void {
    this.listeners.get(event)?.delete(fn);
  }
}

export const eventBus = new TypedEventBus();
