/**
 * SDK Initializer
 * Boots `@5bib/sdk` with platform adapters:
 *  - storage   → SecureStore for JWT (BR-AUTH-15)
 *  - onUnauthorized → eventBus.emit('AUTH_EXPIRED') (BR-AUTH-04)
 *  - baseURL   → EXPO_PUBLIC_API_URL
 *
 * Called ONCE at app entry (e.g. inside RootProvider).
 *
 * TODO(coder): finalize once @5bib/sdk public init API stabilizes.
 *              Current shape is a placeholder — adjust to real SDK contract.
 */

import { secureGet, secureSet, secureRemove } from './secure-storage';
import { eventBus } from './event-bus';

const TOKEN_KEY = 'auth.token';

export interface SdkInitOptions {
  baseURL?: string;
  resultURL?: string;
}

export async function initSdk(opts: SdkInitOptions = {}): Promise<void> {
  const baseURL = opts.baseURL ?? process.env.EXPO_PUBLIC_API_URL;
  const resultURL = opts.resultURL ?? process.env.EXPO_PUBLIC_RESULT_URL;

  if (!baseURL) {
    // eslint-disable-next-line no-console
    console.warn('[sdk-init] EXPO_PUBLIC_API_URL not set — SDK requests will fail.');
  }

  // TODO(coder): replace with actual @5bib/sdk configure() call.
  // Example shape (adjust to real SDK):
  //
  // import { configureSdk } from '@5bib/sdk';
  // await configureSdk({
  //   baseURL,
  //   resultURL,
  //   storage: {
  //     getToken: () => secureGet<string>(TOKEN_KEY),
  //     setToken: (t) => secureSet(TOKEN_KEY, t),
  //     clearToken: () => secureRemove(TOKEN_KEY),
  //   },
  //   onUnauthorized: () => eventBus.emit('AUTH_EXPIRED', { reason: '401' }),
  // });

  void baseURL;
  void resultURL;
  void secureGet;
  void secureSet;
  void secureRemove;
  void eventBus;
  void TOKEN_KEY;
}
