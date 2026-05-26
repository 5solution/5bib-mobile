/**
 * apps/mobile/src/adapters/sentry.ts
 *
 * Sentry init + helpers.
 *
 * Setup:
 *   - 2 Sentry projects (Danny created 2026-05-26):
 *     - prod: o4511451510079488 / 4511454305714176
 *     - dev:  o4511451510079488 / 4511454317051904
 *   - DSN switched by APP_ENV at runtime (see app.config.js `extra.sentryDsn`)
 *   - Source maps uploaded via sentry-expo postPublish hook (eas build prod only)
 *
 * Usage at app boot — call in app/_layout.tsx BEFORE any other code:
 *
 *   import { initSentry } from '@/adapters/sentry';
 *   initSentry();
 *
 *   export default function RootLayout() { ... }
 *
 * Breadcrumbs + manual capture:
 *   import { addBreadcrumb, captureError, setUser, clearUser } from '@/adapters/sentry';
 *
 *   captureError(error, { tag: 'checkout-create', orderId });
 *   addBreadcrumb({ category: 'auth', message: 'Login success', level: 'info' });
 *   setUser({ id, email });    // after login
 *   clearUser();                // on logout
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const APP_ENV =
  (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ?? 'production';
const SENTRY_DSN =
  (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ?? '';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn(
        '[sentry] No DSN configured — skipping init. Set SENTRY_DSN via app.config.js extra.sentryDsn.',
      );
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    // Performance monitoring sample rate
    tracesSampleRate: APP_ENV === 'production' ? 0.1 : 1.0,
    // Profiling (optional, may add bundle weight — disable if perf concerns)
    profilesSampleRate: APP_ENV === 'production' ? 0.05 : 0.0,
    // Auto-capture unhandled promise rejections
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    // Filter noisy errors
    beforeSend(event, hint) {
      // Strip PII — never send tokens / passwords
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, string>).Authorization;
        delete (event.request.headers as Record<string, string>).Cookie;
      }
      // Filter network errors in dev (too noisy)
      if (__DEV__) {
        const error = hint.originalException;
        if (
          error instanceof Error &&
          /Network request failed|fetch.*timeout/i.test(error.message)
        ) {
          return null;
        }
      }
      return event;
    },
    // Tag every event with app metadata
    initialScope: {
      tags: {
        platform: 'mobile-rn',
        app: '5bib',
        env: APP_ENV,
      },
    },
  });

  initialized = true;
}

/**
 * Capture an error with optional structured context.
 *
 * @example
 *   try { await sdk.order.create(...) }
 *   catch (e) { captureError(e, { tag: 'checkout-create', orderId, userId }) }
 */
export function captureError(
  error: unknown,
  context?: { tag?: string; [key: string]: unknown },
): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context?.tag) scope.setTag('feature', context.tag);
    for (const [k, v] of Object.entries(context ?? {})) {
      if (k === 'tag') continue;
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

/**
 * Add breadcrumb for context leading up to an error.
 * Use sparingly — too many breadcrumbs = noisy event payload.
 */
export function addBreadcrumb(crumb: {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    category: crumb.category,
    message: crumb.message,
    level: crumb.level ?? 'info',
    data: crumb.data,
  });
}

/**
 * Set the current user (call after login). All subsequent events tagged with user.
 * Never send PII like phone number or full name — id + email is enough for support.
 */
export function setUser(user: { id: string; email?: string }): void {
  if (!initialized) return;
  Sentry.setUser({ id: user.id, email: user.email });
}

/**
 * Clear user on logout — subsequent events anonymous.
 */
export function clearUser(): void {
  if (!initialized) return;
  Sentry.setUser(null);
}
