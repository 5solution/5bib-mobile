# FEATURE-003: EPIC-9 — Infrastructure (Cross-cutting)

**Status:** 🔵 READY (rev2 2026-05-25 — Manager NEEDS_REVISION fixes: retry exponential note + Figma cleanup)
**Author:** 5bib-po-ba
**Wave:** 1 of 4 (final file)
**Linked:** [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md), [epic-1-auth](01-ba-prd-epic-1-auth.md)
**Audience:** Coder + DevOps. **Claude Design** chỉ cần đọc section "Force Update modal" và "Permission prompts" để generate UI cho 2 modal đó.

---

## 🎯 EPIC-9 Goal

Setup tất cả foundation cross-cutting để các EPIC khác chạy được: i18n, offline storage, push notification, deep link, analytics, crash reporting, EAS Update OTA, app version management. EPIC-9 phải DONE trước khi các EPIC core (1-8) ship production — nó là **infrastructure layer** chứ không phải user-facing feature.

## 📦 Scope EPIC-9

| Module | Spec section |
|--------|-------------|
| SDK initialization (adapter pattern) | 9.1 |
| Internationalization (i18n) | 9.2 |
| Token + Secure storage | 9.3 |
| Offline storage (SQLite + AsyncStorage) | 9.4 |
| Push notification (FCM + APNs) | 9.5 |
| Deep linking (universal link iOS + app link Android) | 9.6 |
| Analytics (Firebase + Facebook SDK) | 9.7 |
| Crash reporting (Sentry) | 9.8 |
| Performance monitoring (Firebase Performance) | 9.9 |
| EAS Update (OTA) | 9.10 |
| App version management + Force Update | 9.11 |
| Network state monitoring | 9.12 |
| Permission management | 9.13 |
| Error boundary + global error handler | 9.14 |
| Logging + debugging | 9.15 |

---

## 9.1 SDK Initialization (Adapter Pattern)

**Goal:** Cho phép `@5bib/sdk` (built cho cross-platform) chạy được trên RN bằng cách inject mobile-specific storage + network adapter.

**File:** `apps/mobile/src/adapters/sdk-init.ts`

```typescript
import { initSdk } from '@5bib/sdk/core';
import { secureStorage } from './secure-storage';
import { asyncStorage } from './async-storage';
import * as Application from 'expo-application';

export function initializeSdk() {
  initSdk({
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL!,  // https://api.5bib.com prod, dapi.5bib.com staging
    storage: {
      // Token in secure store
      getToken: () => secureStorage.getItem('jwt_token'),
      setToken: (t) => secureStorage.setItem('jwt_token', t),
      removeToken: () => secureStorage.removeItem('jwt_token'),
      getRefreshToken: () => secureStorage.getItem('refresh_token'),
      setRefreshToken: (t) => secureStorage.setItem('refresh_token', t),
    },
    onUnauthorized: () => {
      // BR-AUTH-04: force logout flow
      // Trigger via event bus to avoid circular import
      eventBus.emit('AUTH_EXPIRED');
    },
    headers: {
      'X-Client-Type': 'mobile',
      'X-Client-Platform': Platform.OS,  // 'ios' | 'android'
      'X-Client-Version': Application.nativeApplicationVersion,
      'X-Client-Build': Application.nativeBuildVersion,
    },
    retry: { count: 3, strategy: 'exponential', baseDelayMs: 1000 },  // BR-GLOBAL-04: 1s, 2s, 4s exponential. Note: code thật hiện tại (apps/web/src/services/core/index.ts:127-138) constant 1s — FEATURE-002 SDK extract sẽ upgrade sang exponential.
    timeoutMs: 30000,
  });
}
```

**Initialization order in app root (`app/_layout.tsx`):**
1. Initialize Sentry FIRST (capture early crashes)
2. Initialize SDK with adapter
3. Initialize i18n (load locale)
4. Initialize Firebase Analytics
5. Subscribe to network state
6. Subscribe to deep link handler
7. Render app

---

## 9.2 Internationalization (i18n)

**Library:** `i18next` + `react-i18next` + `expo-localization`

**Source of truth:** `@5bib/sdk/i18n` — extract từ web `i18n/` folder (vi/en/de.json)

**File:** `apps/mobile/src/i18n/index.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { vi, en, de } from '@5bib/sdk/i18n';
import { asyncStorage } from '../adapters/async-storage';

const SUPPORTED = ['vi', 'en', 'de'] as const;
const FALLBACK = 'vi';

export async function initI18n() {
  const userPref = await asyncStorage.getItem('user_locale');
  const deviceLocale = Localization.locale.split('-')[0];  // 'vi-VN' → 'vi'
  const locale = userPref ?? (SUPPORTED.includes(deviceLocale as any) ? deviceLocale : FALLBACK);

  await i18n
    .use(initReactI18next)
    .init({
      resources: { vi: { translation: vi }, en: { translation: en }, de: { translation: de } },
      lng: locale,
      fallbackLng: FALLBACK,
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v3',  // RN compatibility
    });
}

export async function changeLocale(lng: 'vi' | 'en' | 'de') {
  await i18n.changeLanguage(lng);
  await asyncStorage.setItem('user_locale', lng);
  // BR-AUTH-14: soft reload - re-mount root layout
  eventBus.emit('LOCALE_CHANGED');
}
```

**Usage in component:**
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
return <Text>{t('login.title')}</Text>;
```

**Date/number formatting:**
- Date: `date-fns` với locale-aware format
- Number: `Intl.NumberFormat(locale, { style: 'currency', currency: 'VND' })`

**BR carry-over:** BR-GLOBAL-01, BR-AUTH-14

---

## 9.3 Token + Secure Storage

**Library:** `expo-secure-store` (Keychain iOS / Keystore Android)

**File:** `apps/mobile/src/adapters/secure-storage.ts`

```typescript
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,  // iOS: don't sync to iCloud
  }),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Keys
export const SECURE_KEYS = {
  JWT_TOKEN: 'jwt_token',
  REFRESH_TOKEN: 'refresh_token',  // if backend supports PAUSE-05
  BIOMETRIC_ENABLED: 'biometric_enabled',  // Phase 2
} as const;
```

**BR:** BR-GLOBAL-06, BR-AUTH-15

---

## 9.4 Offline Storage

**Library:** `@react-native-async-storage/async-storage` (preferences) + `expo-sqlite` (structured cache)

**File:** `apps/mobile/src/adapters/async-storage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStorage = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
  getObject: async <T>(key: string): Promise<T | null> => {
    const s = await AsyncStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  },
  setObject: <T>(key: string, value: T) => AsyncStorage.setItem(key, JSON.stringify(value)),
};

export const ASYNC_KEYS = {
  USER_LOCALE: 'user_locale',
  FIRST_LAUNCH_DONE: 'first_launch_done',
  PUSH_PERMISSION_ASKED: 'push_permission_asked',
  CACHED_PROFILE: 'cached_profile',
  CACHED_RACE_LIST: 'cached_race_list',
  DRAFT_CHECKOUT: 'draft_checkout',
} as const;
```

**SQLite cache for QR tickets (BR-GLOBAL-02):**

```typescript
// apps/mobile/src/adapters/ticket-cache.ts
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('5bib_cache.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS cached_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    qr_data TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_user_tickets ON cached_tickets(user_id);
`);

export const ticketCache = {
  upsert: (ticket: Ticket) => { /* INSERT OR REPLACE */ },
  getById: (id: string) => { /* SELECT */ },
  getByUser: (userId: string) => { /* SELECT all */ },
  removeByUser: (userId: string) => { /* DELETE all on logout */ },
  removeStale: (olderThanMs: number) => { /* cleanup */ },
};
```

**Cache strategy:**
- Ticket fetched online → write to SQLite immediately
- Ticket screen mount → try fetch online; fallback SQLite if offline
- Logout → clear `cached_tickets` for user
- App start → cleanup stale tickets > 30 days old

---

## 9.5 Push Notification

**Library:** `expo-notifications` (cross-platform FCM Android + APNs iOS)

**Backend endpoints needed (TD-009):**
- `POST /devices/register` body `{ token, platform, appVersion, locale }` → store device
- `DELETE /devices/{token}` on logout

**Flow:**
1. **Permission request** — KHÔNG ask at app launch (UX bad). Ask at meaningful moment:
   - After first successful purchase → "Bật thông báo để nhận cập nhật giải đấu?"
   - From Settings → Thông báo → manual toggle
2. **Token registration** — after permission granted:
   ```typescript
   const { data: token } = await Notifications.getExpoPushTokenAsync();
   await sdk.device.register({ token, platform: Platform.OS, appVersion, locale });
   ```
3. **Foreground handler** — show in-app toast/banner (don't show system notif)
4. **Background handler** — system shows notif, tap → deep link
5. **Tap notification** — extract `data.deepLink` → navigate via Expo Router

**Notification categories:**
| Category | Trigger | Deep link target |
|----------|---------|------------------|
| `payment_success` | Order paid → backend webhook | `/orders/{id}` |
| `race_reminder` | 24h trước race day | `/tickets/{id}` |
| `result_published` | Result available | `/result/{id}/{bib}` |
| `e_waiver_request` | Backend sends signing request | `/e-waiver?code={code}` |
| `marketing` | New race published, promo | `/events/{path}` |

**UI for permission request screen:**

```
┌─────────────────────────────────────┐
│         [Bell illustration]         │
│                                     │
│   Bật thông báo                      │  ← heading.h2
│   Nhận cập nhật về giải đấu, kết    │  ← body.md
│   quả, và lời nhắc race day         │
│                                     │
│   [Bật thông báo]                    │  ← primary lg
│   [Để sau]                           │  ← ghost md
└─────────────────────────────────────┘
```

If permission denied at OS level → show banner in Settings "Vào cài đặt OS để bật thông báo" → `Linking.openSettings()`

---

## 9.6 Deep Linking

**Library:** `expo-linking` + `expo-router` built-in

**URL scheme:** `bib5://`
**Universal link domain:** `https://5bib.com` (PAUSE-08)

**Files needed on web:**
- `https://5bib.com/.well-known/apple-app-site-association`:
  ```json
  {
    "applinks": {
      "apps": [],
      "details": [{
        "appID": "TEAM_ID.com.5bib.???",
        "paths": ["/tickets/*", "/orders/*", "/events/*", "/result/*", "/e-waiver"]
      }]
    }
  }
  ```
- `https://5bib.com/.well-known/assetlinks.json`:
  ```json
  [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": { "namespace": "android_app", "package_name": "com.5bib.???", "sha256_cert_fingerprints": ["..."] }
  }]
  ```

**Route mapping:**
| Universal link | Custom scheme | Expo Router target |
|----------------|---------------|-------------------|
| `https://5bib.com/events/saigon-marathon` | `bib5://events/saigon-marathon` | `/events/[path]` |
| `https://5bib.com/tickets/abc123` | `bib5://tickets/abc123` | `/tickets/[id]` |
| `https://5bib.com/result/race123/A1234` | `bib5://result/race123/A1234` | `/result/[id]/[bib]` |
| `https://5bib.com/payment-return?orderId=X&status=Y` | `bib5://payment-return?...` | Modal handler in checkout flow |
| `https://5bib.com/e-waiver?code=ABC` | `bib5://e-waiver?code=ABC` | `/e-waiver?code=...` |

**Cold start vs warm start:**
- Cold start: `Linking.getInitialURL()` at app boot
- Warm: `Linking.addEventListener('url', handler)`
- Auth gate: if deep link requires auth + user not logged → save pending link in AsyncStorage → after login → navigate pending link

---

## 9.7 Analytics

**Libraries:**
- `@react-native-firebase/analytics` — Firebase Analytics (parity với web GA)
- `react-native-fbsdk-next` — Facebook SDK (parity với FB Pixel)

**Setup file:** `apps/mobile/src/services/analytics.ts`

```typescript
import analytics from '@react-native-firebase/analytics';
import { AppEventsLogger } from 'react-native-fbsdk-next';

export const track = (event: string, params?: Record<string, any>) => {
  analytics().logEvent(event, params);
  AppEventsLogger.logEvent(event, params);
};

export const setUser = (userId: string, properties?: Record<string, string>) => {
  analytics().setUserId(userId);
  AppEventsLogger.setUserID(userId);
  if (properties) {
    analytics().setUserProperties(properties);
  }
};

export const clearUser = () => {
  analytics().setUserId(null);
  AppEventsLogger.clearUserID();
};

export const screenView = (screenName: string, screenClass?: string) => {
  analytics().logScreenView({ screen_name: screenName, screen_class: screenClass ?? screenName });
};
```

**Events:** xem [overview.md section Analytics events](01-ba-prd-overview.md#analytics-events-cross-cutting) — đã list 17 events.

**Auto screen tracking:** Hook in Expo Router root:
```typescript
import { useNavigationState } from '@react-navigation/native';
const routeName = useNavigationState(state => state?.routes[state.index]?.name);
useEffect(() => { if (routeName) screenView(routeName); }, [routeName]);
```

---

## 9.8 Crash Reporting (Sentry)

**Library:** `sentry-expo` + `@sentry/react-native`

**Setup in `app/_layout.tsx` top:**

```typescript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,  // PAUSE-10
  enableInExpoDevelopment: false,
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
  release: `${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`,
  tracesSampleRate: 0.2,  // 20% performance traces
  beforeSend: (event) => {
    // Strip sensitive data
    if (event.request?.headers?.Authorization) event.request.headers.Authorization = '[REDACTED]';
    return event;
  },
});

// Set user context after login
Sentry.Native.setUser({ id: user.id, email: user.email });
// Clear on logout
Sentry.Native.setUser(null);
```

**Source map upload:** Configured in EAS Build hook → upload to Sentry per build. CI step.

**Error boundary:**
```typescript
// apps/mobile/src/components/ErrorBoundary.tsx
import * as Sentry from 'sentry-expo';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.Native.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
  }
  render() {
    if (this.state.hasError) return <FullScreenError onRetry={() => this.setState({ hasError: false })} />;
    return this.props.children;
  }
}
```

Wrap root layout with `<ErrorBoundary>`.

**UI for FullScreenError (BR-GLOBAL-07):**
```
┌─────────────────────────────────────┐
│                                     │
│         [Error illustration]        │
│                                     │
│   Có lỗi xảy ra                      │  ← heading.h2
│   Ứng dụng sẽ khởi động lại         │  ← body.md
│                                     │
│   Khởi động lại trong 3s...          │  ← body.sm countdown
│                                     │
│   [Khởi động lại ngay]               │  ← outline button (skip countdown)
│                                     │
└─────────────────────────────────────┘
```

---

## 9.9 Performance Monitoring

**Library:** `@react-native-firebase/perf`

**Auto-tracked:** HTTP requests + screen rendering
**Custom traces:**
- App cold start time
- Login flow time
- Checkout flow time

```typescript
import perf from '@react-native-firebase/perf';

const trace = await perf().startTrace('checkout_flow');
trace.putAttribute('payment_method', 'vnpay');
// ... do work
trace.putMetric('items_count', 3);
await trace.stop();
```

---

## 9.10 EAS Update (OTA)

**CRITICAL safety net thay tester.**

**File:** `apps/mobile/eas.json`

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "channel": "development" },
    "preview": { "distribution": "internal", "channel": "preview" },
    "production": { "channel": "production", "autoIncrement": true }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "PAUSE-03", "ascAppId": "PAUSE-03" },
      "android": { "serviceAccountKeyPath": "PAUSE-04" }
    }
  }
}
```

**Channels:**
- `development` — EAS Build dev clients, hot reload local
- `preview` — Internal beta testers (EAS internal distribution)
- `production` — App Store + Play Store

**Update flow:**
1. Dev fix bug → commit → push
2. `eas update --branch production --message "Fix: ..."` → upload JS bundle to EAS
3. User opens app → app checks update on launch (silent)
4. New bundle downloaded background → applied on next app restart
5. Time from commit to user device: ~5-10 phút

**Auto rollback (Manager require #4):**
- Sentry crash rate API monitored by CI cron
- If new update crash rate > 1% trong 24h → `eas update --branch production --republish PREV_UPDATE_ID`

**Runtime version policy:** `appVersion` — chỉ update JS-only changes; native module changes require new app version submission.

**App update prompt in app:**
```typescript
import * as Updates from 'expo-updates';

useEffect(() => {
  if (__DEV__) return;
  (async () => {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Quick optional UI: "Cập nhật mới, restart?" hoặc silent apply on next launch
      Updates.reloadAsync();
    }
  })();
}, []);
```

---

## 9.11 App Version Management + Force Update

**Backend endpoint:** `GET /global-config` returns:
```json
{
  "minSupportedAppVersion": { "ios": "2.0.0", "android": "2.0.0" },
  "latestAppVersion": { "ios": "2.1.0", "android": "2.1.0" },
  "forceUpdate": false
}
```

**Flow:**
1. Splash check → fetch global-config (timeout 3s)
2. Compare current `Application.nativeApplicationVersion` vs `minSupportedAppVersion`
3. If current < min → show Force Update modal (non-dismissable)
4. If current < latest but >= min → show Soft Update banner (dismissable)

**Force Update modal UI (BR-GLOBAL-05):**

```
┌─────────────────────────────────────┐
│                                     │
│         [Update illustration]       │
│                                     │
│   Cập nhật ứng dụng                  │  ← heading.h1
│                                     │
│   Phiên bản hiện tại không còn      │  ← body.md
│   được hỗ trợ. Vui lòng cập nhật    │
│   để tiếp tục sử dụng 5BIB          │
│                                     │
│   [Cập nhật ngay]                    │  ← primary lg full
│                                     │
└─────────────────────────────────────┘
```

KHÔNG có nút close, KHÔNG có swipe down, KHÔNG có back button. Tap CTA → `Linking.openURL('https://apps.apple.com/...' OR 'https://play.google.com/...')`.

**Soft Update banner:**

```
┌─────────────────────────────────────┐
│ ⓘ Phiên bản 2.1.0 đã có sẵn  [Cập nhật] [✕] │
└─────────────────────────────────────┘
```

Position: top of screen below status bar. Persistent across sessions until user dismisses or updates.

---

## 9.12 Network State Monitoring

**Library:** `@react-native-community/netinfo`

**File:** `apps/mobile/src/hooks/useNetworkState.ts`

```typescript
import NetInfo from '@react-native-community/netinfo';

export function useNetworkState() {
  const [state, setState] = useState<{ isConnected: boolean; type: string }>({ isConnected: true, type: 'unknown' });
  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => {
      setState({ isConnected: s.isConnected ?? false, type: s.type });
    });
    return unsub;
  }, []);
  return state;
}
```

**Global offline banner:**
- Show when `isConnected: false`
- Color: `semantic.warning` 10% bg, full width top
- Auto-hide khi reconnect

---

## 9.13 Permission Management

**Centralized permission flow:**

| Permission | When ask | Library | Settings fallback |
|------------|----------|---------|-------------------|
| Camera | First open Check-in screen / Avatar capture | `expo-camera.requestCameraPermissionsAsync` | `Linking.openSettings()` |
| Photo library | First open Avatar picker | `expo-image-picker.requestMediaLibraryPermissionsAsync` | Same |
| Notifications | After first purchase / Settings toggle | `expo-notifications.requestPermissionsAsync` | Same |
| Location | First open Race detail map | `expo-location.requestForegroundPermissionsAsync` | Same |
| Face ID / Touch ID (Phase 2) | Settings → enable biometric | `expo-local-authentication` | — |

**Permission denied UX pattern:**
1. First request → native OS dialog
2. If denied → in-app explainer + "Mở cài đặt" CTA
3. Never show OS dialog twice (iOS limitation) — must guide to Settings

**Permission explainer screen template:**
```
┌─────────────────────────────────────┐
│                                     │
│         [Permission icon.2xl]        │
│                                     │
│   Cần quyền truy cập [permission]    │
│                                     │
│   5BIB cần quyền [X] để [Y].         │
│   Bạn có thể bật trong cài đặt.     │
│                                     │
│   [Mở cài đặt]                       │
│   [Bỏ qua]                           │
└─────────────────────────────────────┘
```

---

## 9.14 Error Boundary + Global Error Handler

**Three layers:**

1. **React Error Boundary** (UI errors) — section 9.8 ErrorBoundary component, wrap root
2. **Global JS error handler** (uncaught promise rejection, native module errors):
   ```typescript
   import { ErrorUtils } from 'react-native';
   ErrorUtils.setGlobalHandler((error, isFatal) => {
     Sentry.Native.captureException(error);
     if (isFatal) {
       // Show full-screen error (same as ErrorBoundary fallback)
       Updates.reloadAsync();  // restart app
     }
   });
   ```
3. **Fetcher 401/5xx handler** (network errors) — handled in `@5bib/sdk/core` Fetcher

---

## 9.15 Logging + Debugging

**Production logging:**
- KHÔNG `console.log` reaches production (eslint rule strip + Sentry breadcrumb)
- Use Sentry breadcrumbs for trace:
  ```typescript
  Sentry.Native.addBreadcrumb({ category: 'auth', message: 'Login attempt', level: 'info' });
  ```

**Dev logging:**
- Reactotron (recommend) cho RN state inspect
- Flipper debug bridge (optional, if EAS Build allows)

**Network log:**
- Axios interceptor log request/response in dev only

---

## 🧪 Test Cases TC-INFRA-XX

### TC-INFRA-01: SDK init failure (no network)
| Setup | Airplane mode at app launch |
| Expected | SDK init success (lazy), first API call returns network error, retry on reconnect |

### TC-INFRA-02: Token expired → force logout
| Setup | Manually set `jwt_token` to expired token, fire any auth API call |
| Expected | Fetcher receives 401 → triggers `onUnauthorized` → eventBus emit AUTH_EXPIRED → app navigates Login + toast |

### TC-INFRA-03: i18n switch locale
| Setup | App in vi, user opens Settings → Ngôn ngữ → tap "English" |
| Expected | All UI text changes to English immediately, AsyncStorage saves `user_locale=en`, restart app retains English |

### TC-INFRA-04: Offline QR ticket show
| Setup | Login, open ticket detail (cache writes), enable airplane mode, kill app, relaunch, open same ticket |
| Expected | QR renders from SQLite cache, offline indicator visible |

### TC-INFRA-05: Push notification permission flow
| Setup | First purchase complete |
| Expected | Bottom sheet "Bật thông báo?" shows; tap "Bật" → OS dialog; grant → POST /devices/register; deny → Settings deep link |

### TC-INFRA-06: Deep link cold start
| Setup | App killed; tap universal link `https://5bib.com/tickets/abc123` |
| Expected | App opens, splash, auth check, navigate `/tickets/abc123` |

### TC-INFRA-07: Deep link cold start without auth
| Setup | App killed, not logged in; tap deep link requiring auth |
| Expected | Splash → save pending deep link AsyncStorage → Login → after login → navigate pending |

### TC-INFRA-08: Analytics event fires
| Setup | Login success |
| Expected | Firebase Analytics receives `login_success { method: 'email' }`; FB SDK receives same |

### TC-INFRA-09: Crash captured by Sentry
| Setup | Force throw error in render |
| Expected | ErrorBoundary catches → Sentry captures with source-mapped stack → user sees FullScreenError → app restarts |

### TC-INFRA-10: EAS Update apply
| Setup | Publish new update via `eas update --branch production` |
| Expected | User opens app → check update → download background → apply on next launch (or immediate reload if forced) |

### TC-INFRA-11: Force update modal
| Setup | Backend min version 3.0.0, app current 2.0.0 |
| Expected | Force Update modal shown, non-dismissable, tap CTA → App Store URL opens |

### TC-INFRA-12: Network state offline banner
| Setup | Airplane mode while app running |
| Expected | Top banner "Đang offline" appears; turn off airplane → banner auto-hides within 2s |

### TC-INFRA-13: Permission camera denied → Settings deep link
| Setup | Open Check-in screen, deny camera permission |
| Expected | In-app explainer screen với "Mở cài đặt" CTA → `Linking.openSettings()` opens iOS/Android settings |

### TC-INFRA-14: Auto rollback on crash spike
| Setup | Simulate crash rate > 1% post-update |
| Expected | CI cron detects via Sentry API → `eas update --republish PREV_ID` → users get prev version on next check |

---

## 🛡️ Security checks

- [ ] All API calls over HTTPS (no HTTP allowed in app.json ATS config)
- [ ] Sentry beforeSend strips Authorization headers
- [ ] No `console.log` in prod bundle (Babel transform strip)
- [ ] Token never in AsyncStorage (only SecureStore)
- [ ] Push token registered backend with auth required
- [ ] WebView restricted to whitelist domains (payment gateway only)
- [ ] Deep link validates scheme + host + path before routing
- [ ] EAS Update signed (default Expo signing)

---

## ⚡ Performance

| Module | Target |
|--------|--------|
| SDK init | < 200ms cold start |
| i18n init | < 100ms (preloaded JSON) |
| Sentry init | < 50ms |
| Firebase init | < 300ms |
| Total bootstrap time (splash → first screen) | < 2s on iPhone 8 / mid Android |
| EAS Update check | async, non-blocking |
| SQLite query (ticket cache) | < 50ms |

---

## 🛑 PAUSE conditions (BA flag)

- [ ] PAUSE-05 (refresh token endpoint backend)
- [ ] PAUSE-07 (device-token endpoint backend)
- [ ] PAUSE-08 (deep link domain `.well-known/*` files)
- [ ] PAUSE-09 (EAS Project ID from Danny)
- [ ] PAUSE-10 (Sentry DSN)
- [ ] PAUSE-11 (Firebase project + config files)
- [ ] PAUSE-12 (Facebook App ID)
- [ ] Decision: anti-enumeration cho `/forgot` (200 always vs 404 reveal) — security trade-off, Danny quyết

---

## ✅ Status

- [x] DRAFT
- [x] READY (rev2 — Wave 1 complete, sẵn sàng Manager re-run /5bib-plan)

---

## 🔗 Next

Wave 1 ĐÃ XONG. 4 file:
- ✅ [01-ba-prd-overview.md](01-ba-prd-overview.md)
- ✅ [01-ba-prd-design-system.md](01-ba-prd-design-system.md)
- ✅ [01-ba-prd-epic-1-auth.md](01-ba-prd-epic-1-auth.md)
- ✅ [01-ba-prd-epic-9-infra.md](01-ba-prd-epic-9-infra.md) ← THIS

**Danny next:**
1. Claude Design consume `design-system.md` + `epic-1-auth.md` → generate TSX UI
2. DevOps mở `epic-9-infra.md` để prep accounts (PAUSE-09/10/11/12) parallel
3. Danny chạy `/5bib-plan FEATURE-003-mobile-app-rn-expo` để Manager review Wave 1
4. APPROVE → BA viết tiếp Wave 2 (EPIC-2 Browsing, EPIC-3 Checkout, EPIC-4 Tickets, EPIC-5 Result)
