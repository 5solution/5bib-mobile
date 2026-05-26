/**
 * apps/mobile/src/adapters/google-signin.ts
 *
 * Google Sign-In adapter — wraps @react-native-google-signin/google-signin
 * with environment-aware OAuth client IDs.
 *
 * Setup (Danny 2026-05-26):
 *   - 2 Firebase projects each with own Google OAuth clients
 *   - PROD `bib-60bff`:
 *     - iOS:     47150553581-gvff8not3telqajbs0ta533qkmsfmqrg.apps.googleusercontent.com
 *     - Android: 47150553581-oepv8gc1jvkrr2pb51haqqs64ij1cjnq.apps.googleusercontent.com (cert hash 5e8f16... OUTDATED — update sau Google approve keystore reset)
 *     - Web:     47150553581-19tiqppkonn5ff4kj76g9g9ar68obf61.apps.googleusercontent.com (used by Android + backend for ID token verification)
 *   - DEV `bib-dev-b4d19`:
 *     - iOS:     ⚠️ MISSING — Firebase Auth Google provider chưa enable cho iOS dev (Danny TODO)
 *     - Android: 283252148170-t7bc2b6mb4urtlq4of1eaa9b0rdq8899.apps.googleusercontent.com (cert hash 4032cdae... match upload keystore)
 *     - Web:     283252148170-l3sbfrcomnmdvmdkfh03s1671tai63od.apps.googleusercontent.com
 *
 * Usage:
 *   import { initGoogleSignIn, signInWithGoogle, signOutGoogle } from '@/adapters/google-signin';
 *
 *   // At app boot (after Sentry init):
 *   initGoogleSignIn();
 *
 *   // In login screen:
 *   const result = await signInWithGoogle();
 *   if (result.success) {
 *     // result.idToken → send to backend POST /auth/google/login
 *     // result.user → display in UI (avatar, email)
 *   }
 */

import {
  GoogleSignin,
  statusCodes,
  type User as GoogleUser,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { captureError, addBreadcrumb } from './sentry';

const APP_ENV =
  (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ?? 'production';
const IS_DEV = APP_ENV === 'development';

// OAuth client IDs per env (sync với Firebase configs)
const IOS_CLIENT_ID = IS_DEV
  ? undefined // ⚠️ TODO Danny: enable Google Sign-In trong DEV Firebase iOS app, re-download plist, fill ID here
  : '47150553581-gvff8not3telqajbs0ta533qkmsfmqrg.apps.googleusercontent.com';

const WEB_CLIENT_ID = IS_DEV
  ? '283252148170-l3sbfrcomnmdvmdkfh03s1671tai63od.apps.googleusercontent.com'
  : '47150553581-19tiqppkonn5ff4kj76g9g9ar68obf61.apps.googleusercontent.com';

let initialized = false;

export function initGoogleSignIn(): void {
  if (initialized) return;

  // iOS bị disable nếu IOS_CLIENT_ID missing (dev env)
  if (Platform.OS === 'ios' && !IOS_CLIENT_ID) {
    if (__DEV__) {
      console.warn(
        '[google-signin] iOS Client ID missing in DEV — Google Sign-In disabled on iOS dev builds. ' +
          'Enable Google Sign-In in Firebase DEV iOS app + re-download GoogleService-Info.dev.plist.',
      );
    }
    return;
  }

  GoogleSignin.configure({
    // webClientId required for both iOS + Android to get ID token for backend verification
    webClientId: WEB_CLIENT_ID,
    // iosClientId only used on iOS native flow
    iosClientId: IOS_CLIENT_ID,
    // Request id token + user profile (email, name, photo)
    scopes: ['profile', 'email'],
    // Force account picker every sign-in (avoid auto-pick cached account — better UX)
    offlineAccess: false,
  });

  initialized = true;
  addBreadcrumb({
    category: 'google-signin',
    message: `Google Sign-In initialized (${APP_ENV})`,
    level: 'info',
  });
}

export interface GoogleSignInSuccess {
  success: true;
  idToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    photo: string | null;
  };
}

export interface GoogleSignInFailure {
  success: false;
  reason:
    | 'cancelled' // User backed out of picker
    | 'in_progress' // Multiple concurrent calls (shouldn't happen with proper UI)
    | 'play_services_unavailable' // Android only — Google Play Services missing
    | 'no_id_token' // SDK returned without idToken (config issue)
    | 'not_initialized' // initGoogleSignIn() not called (likely iOS dev missing client ID)
    | 'unknown';
  error?: unknown;
}

export async function signInWithGoogle(): Promise<
  GoogleSignInSuccess | GoogleSignInFailure
> {
  if (!initialized) {
    return { success: false, reason: 'not_initialized' };
  }
  try {
    addBreadcrumb({
      category: 'google-signin',
      message: 'signIn() called',
      level: 'info',
    });

    // Check Play Services on Android (no-op on iOS)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const userInfo: GoogleUser = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();

    if (!tokens.idToken) {
      return { success: false, reason: 'no_id_token' };
    }

    return {
      success: true,
      idToken: tokens.idToken,
      user: {
        id: userInfo.user.id,
        email: userInfo.user.email,
        name: userInfo.user.name ?? '',
        photo: userInfo.user.photo ?? null,
      },
    };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, reason: 'cancelled' };
    }
    if (code === statusCodes.IN_PROGRESS) {
      return { success: false, reason: 'in_progress' };
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, reason: 'play_services_unavailable' };
    }
    captureError(error, { tag: 'google-signin', code });
    return { success: false, reason: 'unknown', error };
  }
}

export async function signOutGoogle(): Promise<void> {
  if (!initialized) return;
  try {
    await GoogleSignin.signOut();
    addBreadcrumb({
      category: 'google-signin',
      message: 'signOut() success',
      level: 'info',
    });
  } catch (error) {
    captureError(error, { tag: 'google-signin-signout' });
  }
}

export async function getCurrentGoogleUser(): Promise<GoogleUser | null> {
  if (!initialized) return null;
  try {
    return await GoogleSignin.getCurrentUser();
  } catch {
    return null;
  }
}
