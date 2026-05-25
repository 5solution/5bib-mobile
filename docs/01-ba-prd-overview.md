# FEATURE-003: PRD Overview — Mobile App 5BIB (RN Expo)

**Status:** 🔵 READY (Wave 1 — v2 after Manager review NEEDS_REVISION fix)
**Last updated:** 2026-05-25 (rev2: added SDK Normalization Strategy, Figma cleanup)
**Author:** 5bib-po-ba
**Linked init:** [`00-manager-init.md`](00-manager-init.md)
**Wave:** 1 of 4 (Overview + Design System + EPIC-1 Auth + EPIC-9 Infra)

---

## 📌 Pre-flight check

- [x] Đã đọc `00-manager-init.md` (decisions: RN Expo + SDK monorepo, full scope minus Group Buy, 4 require no-tester)
- [x] Đã đọc `00-manager-init.md` hand-off note design-oriented (per-screen states, design system, wave delivery)
- [x] Đã đọc `memory/codebase-map.md` (Next.js 14 routes, 22 service domains, 50 endpoints)
- [x] Đã đọc `memory/known-issues.md` (NO TESTER constraint, backend gaps TD-007/008/009)
- [x] Đã đọc `memory/architecture.md` (6 critical flows: Login, Checkout, Result, E-Waiver, Check-in, Group Buy)

---

## 🎯 Title + Goal + Scope

### Title
**5BIB Mobile App** — React Native + Expo, replacement cho app cũ đã mất source.

### Goal
Build mobile app feature-parity với selling-web (minus Group Buy), publish thay thế app cũ trên App Store + Google Play, KEEP bundle ID cũ để user auto-update + giữ rating.

### Scope IN (Full feature mobile — REVISED 2026-05-25)

| Domain | Tính năng | EPIC |
|--------|-----------|------|
| Auth | Login email/password, Google Sign-In, Apple Sign-In (iOS), Register, Reset password OTP | EPIC-1 |
| Profile | View profile, Edit profile, Upload avatar | EPIC-1 |
| Race browsing | Landing, Event list, Event detail, Challenges, Race detail, Course detail | EPIC-2 |
| Checkout | Cart, Discount code, Order create, 4 payment gateway WebView (VNPay/PayX/Payoo/OnePay), QR ticket display | EPIC-3 |
| My tickets | List tickets, Ticket detail, Edit ticket, Change course, Transfer BIB | EPIC-4 |
| My orders | List orders, Order detail | EPIC-4 |
| Result | **REDUCED** — Redirect Hub ra `result.5bib.com` + My Race History (own user) | EPIC-5 |
| E-Waiver | Race dropdown, OTP signing request, Canvas signature, Submit | EPIC-6 |
| Infrastructure | i18n vi/en/de, Offline QR ticket cache, Push notification (FCM+APNs), Deep link, Analytics (Firebase+FB SDK), Crash reporting (Sentry), EAS Update OTA, Force update prompt | EPIC-9 |

### Scope OUT (mobile bỏ — vẫn còn trên web)

- ❌ Group Buy (cá nhân) — `/group-buy/*` routes
- ❌ Enterprise Group Buy — `/enterprise-group-buy/*` routes
- ❌ My Group Buys dashboard
- ❌ Excel export (web có cho admin reports — mobile không cần)
- ❌ Lexical rich text editor (web dùng cho blog admin — mobile chỉ đọc blog)
- ❌ Dark mode (defer Phase 2)
- ❌ Tablet-optimized layout (Phase 1 chỉ phone, tablet vẫn dùng được nhưng không tối ưu)
- ❌ **EPIC-7 Staff Check-in (DROPPED Danny 2026-05-25)** — Staff dùng web admin (`/check-in/[...code]`) thay vì mobile native scan. Lý do: tiết kiệm scope, staff đã có tool trên web đủ dùng.
- ❌ **EPIC-8 Content (DROPPED Danny 2026-05-25)** — Blog/Vexere/Transport KHÔNG có trong mobile. User dùng web cho content. Lý do: không phải core user value cho athlete mobile experience.

---

## 👤 Personas

| Persona | Mô tả | Mobile usage |
|---------|-------|--------------|
| **Athlete (Runner)** | User chính — mua BIB, check kết quả, ký e-waiver | Hàng ngày browse + race day show QR |
| **Race Organizer Staff** | Nhân viên ban tổ chức — check-in tại event | Race day mode (scan QR liên tục) |
| **Race Buyer (B2B Lite)** | Mua hộ người khác | Browse + checkout (KHÔNG có group buy) |
| **Anonymous Visitor** | Chưa login — browse race + tra kết quả | Login gate cho purchase |

---

## 📜 Cross-cutting Business Rules

> Các BR áp dụng toàn app, KHÔNG riêng EPIC nào. EPIC khác sẽ thêm BR domain-specific.

| ID | Business Rule |
|----|--------------|
| BR-GLOBAL-01 | App phải support **i18n đầy đủ vi/en/de**. Default locale = device locale, fallback `vi`. User có thể đổi trong Settings. Strings reuse 100% từ `@5bib/sdk/i18n`. |
| BR-GLOBAL-02 | App **luôn show QR ticket được trong offline mode** (race day signal kém). Cache QR sau lần load đầu tiên thành công. Trigger refresh khi online lại. |
| BR-GLOBAL-03 | Bất kỳ request nào trả **401 Unauthorized** → app force logout + redirect screen Login + show toast "Phiên đăng nhập hết hạn". KHÔNG silent. |
| BR-GLOBAL-04 | Bất kỳ request nào trả **5xx** → app retry tự động 3 lần (delay 1s, 2s, 4s exponential). Nếu vẫn fail → show error state với button "Thử lại". |
| BR-GLOBAL-05 | App phải có **force update prompt** khi backend trả version code app < `min_supported_version` (qua GET `/global-config` hoặc header). Modal không dismiss được, chỉ có nút "Cập nhật" → mở App Store/Play Store. |
| BR-GLOBAL-06 | Token JWT lưu **`expo-secure-store`** (Keychain iOS / Keystore Android), KHÔNG được dùng AsyncStorage hoặc plain file. Refresh token (nếu có) cũng phải secure store. |
| BR-GLOBAL-07 | Khi app crash → Sentry tự động capture với source map. User KHÔNG được thấy raw stack trace, chỉ thấy friendly screen "Có lỗi xảy ra, ứng dụng sẽ khởi động lại" + restart trong 3s. |
| BR-GLOBAL-08 | Mọi screen transition phải có **animation < 300ms**. KHÔNG được flash trắng/đen giữa transitions. |
| BR-GLOBAL-09 | Mọi action gửi network request phải có **loading state** trong vòng 100ms (KHÔNG để user không biết app đang làm gì). |
| BR-GLOBAL-10 | Mọi error message **phải tiếng Việt cụ thể**, có context, KHÔNG technical jargon. Vd: ❌ "Network Error" → ✅ "Không kết nối được, vui lòng kiểm tra mạng". |
| BR-GLOBAL-11 | Mọi destructive action (delete avatar, cancel order, transfer BIB) phải có **confirm dialog** với label nút rõ ràng (KHÔNG "OK/Cancel" mơ hồ — phải "Huỷ đơn / Giữ đơn"). |
| BR-GLOBAL-12 | Mọi screen hiện **list/scroll content** phải có **pull-to-refresh** (RefreshControl native). |
| BR-GLOBAL-13 | Touch target tối thiểu **44pt iOS / 48dp Android** (Apple HIG + Material Design). |
| BR-GLOBAL-14 | Accessibility: mọi interactive element phải có `accessibilityLabel` + `accessibilityRole`. Color contrast WCAG AA. |
| BR-GLOBAL-15 | Analytics event tracking: mỗi screen view + mỗi business action critical (login, register, checkout step, payment success/fail, BIB transfer) → fire Firebase Analytics + FB SDK event với schema chuẩn (xem EPIC-9). |

---

## 🛠️ Cross-cutting Technical Mandates

### Tech stack lock (Manager APPROVED)

| Layer | Choice |
|-------|--------|
| Framework | **React Native 0.74+ + Expo SDK 51+** (managed workflow) |
| Language | TypeScript strict mode |
| Routing | **Expo Router** (file-based, parallel route layout) |
| State management | **Zustand** (parity với web) |
| HTTP client | **Axios via `@5bib/sdk/core`** (reuse Fetcher class) |
| Forms | `react-hook-form` + `zod` (reuse `@5bib/sdk/validations`) |
| UI library | **Tamagui** (recommend) HOẶC **Gluestack UI v2** — BA propose Tamagui vì compile-time optimization + best perf, Manager APPROVE trong `/5bib-plan` |
| Styling adjunct | **NativeWind** (Tailwind cho RN — utility classes như web) |
| Secure storage | `expo-secure-store` (token, sensitive) |
| Async storage | `@react-native-async-storage/async-storage` (preferences, draft) |
| SQLite (offline cache) | `expo-sqlite` (QR tickets, race detail cache) |
| Push notification | `expo-notifications` (FCM Android + APNs iOS) |
| Deep linking | `expo-linking` + `expo-router` deep link config |
| Camera/QR scan | `expo-camera` + `expo-barcode-scanner` HOẶC `react-native-vision-camera` (BA recommend vision-camera vì perf + ML kit support) |
| QR generate | `react-native-qrcode-svg` |
| Maps | `react-native-maps` (Google Maps Android + Apple Maps iOS) |
| Signature | `react-native-signature-canvas` |
| WebView (payment) | `react-native-webview` |
| Analytics | `@react-native-firebase/analytics` + `react-native-fbsdk-next` |
| Crash | `sentry-expo` + `@sentry/react-native` (source map upload qua EAS) |
| OTA update | **EAS Update** (CRITICAL — safety net thay tester) |
| Testing | Jest + `@testing-library/react-native` (unit) + Maestro (E2E flow) |
| Linter | ESLint (cùng config web) + Prettier |
| Build | EAS Build (cloud build cho iOS + Android) |

### Code reuse từ `@5bib/sdk` (sau FEATURE-002)

```typescript
// apps/mobile/src/screens/auth/login.tsx
import { user } from '@5bib/sdk/services/user';
import { loginSchema } from '@5bib/sdk/validations/auth.validation';
import { vi, en, de } from '@5bib/sdk/i18n';
import type { LoginResponse } from '@5bib/sdk/models';
```

KHÔNG được copy logic services/validations vào `apps/mobile/`. Mọi business logic phải qua `@5bib/sdk`.

---

## 🔄 SDK Normalization Strategy (Danny chốt Option A 2026-05-25)

> **CRITICAL CONTEXT:** Manager `/5bib-plan` review phát hiện backend hiện tại return response shapes legacy (snake_case, nested role, typo `finalcial_status`). Mobile PRD propose clean DTOs cho UX dev tốt. Danny chốt **Option A**: `@5bib/sdk` (FEATURE-002) đảm nhận role **normalization layer** — chuẩn hoá legacy backend shape → clean camelCase DTOs cho consumer (web + mobile cùng dùng).

### Nguyên tắc

1. **Mọi PRD DTO trong các EPIC đều là CLEAN SHAPE** (post-normalization từ SDK). Đây là contract mà mobile + web consumer thấy.
2. **SDK adapter wrap legacy backend** — convert input client → legacy backend format, convert response legacy → clean shape.
3. **Backend KHÔNG cần thay đổi** (transparent migration). FEATURE-002 lo việc adapter normalize.
4. **Web hiện tại consumer code** sẽ migrate sang clean shape trong FEATURE-002 scope (regression test Cypress bắt buộc, behavior UI/UX KHÔNG đổi).

### Normalization Mapping Table (5 endpoint critical)

| Endpoint | Legacy backend shape (current production) | Clean SDK shape (consumer dùng) | Direction |
|----------|-------------------------------------------|---------------------------------|-----------|
| **POST /login (request)** | `{email, password}` | `{email, password}` | identical |
| **POST /login (response)** | `{user_id, access_token, role:{id, name, newRolePermissions}, email, username}` | `{token, user: {id, email, fullName, role}}` | `access_token`→`token`, `user_id`→`user.id`, `username`→`user.fullName`, `role.name`→`user.role` (string) |
| **POST /auth/google/login (request)** | query `?token=...` body null | `{idToken: string}` | SDK convert input `idToken` → query param `?token=...` |
| **POST /auth/google/login (response)** | same legacy login response | same clean login response | normalize as above |
| **POST /register (request)** | `{name, email, password, confirmPassword, isRunner?}` | `{fullName, email, password, confirmPassword, isRunner?}` | `fullName`→`name` (SDK rename khi gửi backend); `confirmPassword` REQUIRED; `agreeTerms` là FRONTEND-ONLY (KHÔNG gửi backend); phone KHÔNG có trong register (update sau ở Profile) |
| **POST /forgot (request)** | query `?email=...` body null | `{email: string}` | SDK convert input → query param |
| **POST /reset (request)** | `{otp, email, new_password, new_password_confirm}` | `{otp, email, newPassword, newPasswordConfirm}` | snake_case ↔ camelCase, all 4 fields preserved |
| **All snake_case fields globally** | `user_id`, `internal_status`, `finalcial_status` (typo từ backend), `created_at`, `updated_at` | `userId`, `internalStatus`, `financialStatus` (fix typo), `createdAt`, `updatedAt` | SDK auto-convert mọi field snake_case → camelCase qua transform util |

### Implementation pattern (BA spec, Coder implement chi tiết trong FEATURE-002)

```typescript
// packages/sdk/src/services/user/index.ts
import { network } from '../core';
import type { LoginInput, LoginResponse, LegacyLoginResponse } from '../models/auth';
import { normalizeLoginResponse } from '../normalize/auth';

export const user = {
  login: async (input: LoginInput): Promise<LoginResponse> => {
    const { data: raw } = await network.post<LegacyLoginResponse>('/login', input);
    return normalizeLoginResponse(raw);
  },

  googleLogin: async (input: { idToken: string }): Promise<LoginResponse> => {
    // SDK handles legacy query param pattern internally
    const { data: raw } = await network.post<LegacyLoginResponse>(
      '/auth/google/login',
      null,
      { params: { token: input.idToken } },
    );
    return normalizeLoginResponse(raw);
  },

  forgot: async (input: { email: string }): Promise<void> => {
    await network.post('/forgot', null, { params: { email: input.email } });
  },

  reset: async (input: { otp: string; email: string; newPassword: string; newPasswordConfirm: string }): Promise<void> => {
    // Rename camelCase → snake_case backend
    await network.post('/reset', {
      otp: input.otp,
      email: input.email,
      new_password: input.newPassword,
      new_password_confirm: input.newPasswordConfirm,
    });
  },

  register: async (input: { fullName: string; email: string; password: string; confirmPassword: string; isRunner?: boolean }): Promise<LoginResponse> => {
    // Rename fullName → name cho backend; agreeTerms KHÔNG gửi
    const { data: raw } = await network.post<LegacyLoginResponse>('/register', {
      name: input.fullName,
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
      ...(input.isRunner !== undefined && { isRunner: input.isRunner }),
    });
    return normalizeLoginResponse(raw);
  },
};
```

### Web migration scope (FEATURE-002 task)

Web hiện tại có ~50 consumer site dùng legacy shape. FEATURE-002 phải:
1. Migrate mọi import từ `@/services/*` → `@5bib/sdk/services/*`
2. Update consumer code dùng clean shape (vd: `loginResponse.access_token` → `loginResponse.token`)
3. Cypress E2E regression test toàn bộ critical flow để verify UI/UX behavior unchanged
4. Code mod script (ts-morph) optional cho mass rename

### Implication cho mobile coder

- Mobile coder consume `@5bib/sdk/services/*` → thấy CLEAN SHAPE DTOs
- KHÔNG cần biết legacy backend shape (SDK abstract away)
- TypeScript types từ `@5bib/sdk/models/*` đều là clean shape
- Error handling vẫn nguyên (status code, error message)

---

### File structure mobile

```
apps/mobile/
├── app/                              # Expo Router (file-based routing)
│   ├── _layout.tsx                   # Root layout (theme, i18n, auth gate)
│   ├── (auth)/                       # Group: chưa login
│   │   ├── _layout.tsx               # Auth stack layout
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   ├── (tabs)/                       # Group: sau login — bottom tabs
│   │   ├── _layout.tsx               # Bottom tab navigator
│   │   ├── home.tsx                  # Tab Home (race feed)
│   │   ├── tickets.tsx               # Tab My Tickets
│   │   ├── orders.tsx                # Tab My Orders
│   │   └── profile.tsx               # Tab Profile
│   ├── events/
│   │   ├── index.tsx                 # All events
│   │   └── [path].tsx                # Event detail
│   ├── result/
│   │   ├── index.tsx
│   │   ├── [id].tsx                  # Event leaderboard
│   │   └── [id]/[bib].tsx            # Personal result
│   ├── checkout/
│   │   ├── index.tsx                 # Checkout form
│   │   └── payment-webview.tsx       # Gateway WebView
│   ├── tickets/
│   │   ├── [id].tsx
│   │   ├── [id]/edit.tsx
│   │   └── [id]/change-course.tsx
│   ├── e-waiver/
│   │   ├── index.tsx                 # Race dropdown + OTP
│   │   └── sign.tsx                  # Canvas signature
│   ├── check-in/
│   │   └── [code].tsx                # Staff QR scan
│   ├── blogs/
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── transport.tsx
│   ├── vexere.tsx
│   ├── settings.tsx                  # Language, notifications, about
│   └── +not-found.tsx
├── src/
│   ├── components/                   # Reusable components (Button, Input, Card, …)
│   ├── adapters/                     # SDK adapter (storage, token)
│   │   ├── secure-storage.ts         # expo-secure-store wrapper
│   │   ├── async-storage.ts          # AsyncStorage wrapper
│   │   └── sdk-init.ts               # Initialize @5bib/sdk with mobile adapters
│   ├── hooks/                        # Mobile hooks (useAuth, useOnline, …)
│   ├── stores/                       # Zustand stores
│   ├── theme/                        # Tamagui theme config
│   ├── utils/
│   └── constants/
├── assets/
│   ├── icons/
│   ├── splash/
│   └── fonts/
├── app.json                          # Expo config (bundle ID, permissions)
├── eas.json                          # EAS Build + Update profiles
├── babel.config.js
├── tsconfig.json
└── package.json
```

### App config (app.json key fields)

```json
{
  "expo": {
    "name": "5BIB",
    "slug": "5bib-mobile",
    "scheme": "bib5",
    "version": "2.0.0",
    "orientation": "portrait",
    "icon": "./assets/icons/icon.png",
    "userInterfaceStyle": "light",
    "splash": { "image": "./assets/splash/splash.png", "resizeMode": "contain", "backgroundColor": "#FFFFFF" },
    "ios": {
      "bundleIdentifier": "com.5bib.???",  // 🛑 PAUSE — Danny confirm bundle ID app cũ
      "buildNumber": "1",  // 🛑 PAUSE — phải > app cũ + 1
      "supportsTablet": false,
      "infoPlist": {
        "NSCameraUsageDescription": "5BIB cần quyền truy cập camera để quét mã QR vé...",
        "NSPhotoLibraryUsageDescription": "5BIB cần lưu hình ảnh kết quả của bạn...",
        "NSFaceIDUsageDescription": "Sử dụng Face ID để đăng nhập nhanh (tuỳ chọn)",
        "NSLocationWhenInUseUsageDescription": "5BIB hiển thị bản đồ đường chạy gần bạn (tuỳ chọn)"
      },
      "associatedDomains": ["applinks:5bib.com"]
    },
    "android": {
      "package": "com.5bib.???",  // 🛑 PAUSE — Danny confirm
      "versionCode": 1,  // 🛑 PAUSE — phải > app cũ + 1
      "permissions": ["CAMERA", "POST_NOTIFICATIONS", "ACCESS_FINE_LOCATION"],
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "5bib.com" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-notifications",
      "@react-native-firebase/app",
      "sentry-expo",
      ["expo-camera", { "cameraPermission": "5BIB cần camera để quét QR..." }]
    ],
    "updates": { "url": "https://u.expo.dev/<EAS_PROJECT_ID>" },
    "runtimeVersion": { "policy": "appVersion" }
  }
}
```

---

## ⚡ Non-Functional Requirements (NFR)

### Performance

| Metric | Target | Measure |
|--------|--------|---------|
| Cold start | < 3s | iPhone 8 / Android Snapdragon 660 baseline |
| Warm start | < 1s | Returning to app từ background |
| Time-to-interactive (Home screen) | < 4s sau cold start | RUM via Firebase Performance |
| Bundle size (iOS) | < 25MB | Initial download |
| Bundle size (Android base APK) | < 15MB | Initial download |
| API response handle | render trong < 100ms sau response | UI thread |
| Memory peak | < 200MB | Avoid OOM trên low-end Android |

### Reliability

| Metric | Target |
|--------|--------|
| Crash-free session | ≥ 99.5% (30 day) |
| Crash-free user | ≥ 99.7% (30 day) |
| ANR rate (Android) | < 0.5% |
| Network retry success | ≥ 95% sau 3 retry |

### Accessibility

| Requirement | Standard |
|-------------|----------|
| Touch target | ≥ 44pt iOS / 48dp Android |
| Color contrast | WCAG AA (4.5:1 normal text, 3:1 large) |
| Screen reader | VoiceOver iOS + TalkBack Android — mọi interactive element có label |
| Dynamic Type | Support iOS Dynamic Type scale (Small → XL); Android font scale 0.85 → 1.3 |
| Reduce motion | Respect iOS Reduce Motion + Android animator settings |

### Security

| Requirement | Detail |
|-------------|--------|
| Token storage | `expo-secure-store` ONLY (Keychain/Keystore) |
| HTTPS only | KHÔNG cho HTTP request (App Transport Security iOS, network_security_config Android) |
| Certificate pinning | Phase 2 (optional, defer) |
| Biometric auth | Optional cho re-open app (FaceID/TouchID/Fingerprint) — defer Phase 2 |
| Jailbreak/Root detection | Phase 2 (optional) |
| WebView | Restrict navigation tới whitelist domain (payment gateway only) |
| Deep link | Validate scheme + host trước khi route |

### Internationalization

- 3 locales: `vi` (default), `en`, `de`
- Strings 100% từ `@5bib/sdk/i18n` (không hardcode trong app)
- Date/time: `date-fns` + locale-aware format
- Number: `Intl.NumberFormat` (currency VND, EUR fallback)
- RTL: KHÔNG support (de/en/vi đều LTR)

### Offline behavior

| Screen / Action | Offline behavior |
|-----------------|------------------|
| Show ticket QR | ✅ MUST — cache QR + ticket data từ lần load cuối |
| View profile | ✅ Show cached profile data |
| View last viewed race | ✅ Show cached |
| Browse events list | ❌ Show error state "Không có kết nối" + cached list nếu có |
| Login | ❌ Block với message "Cần kết nối để đăng nhập" |
| Checkout | ❌ Block — payment cần online |
| Submit e-waiver | ❌ Block |
| Staff check-in | ⚠️ Queue offline → sync khi online (Phase 2 enhancement, MVP block với warning) |

### Analytics events (cross-cutting)

Schema: `{ event_name: snake_case, params: { ... } }`

| Event | Khi fire | Params |
|-------|----------|--------|
| `screen_view` | Mọi screen mount | `{ screen_name, screen_class }` |
| `app_open` | App foreground | `{ source: 'cold_start' \| 'background' \| 'deep_link' \| 'push_notification' }` |
| `login_success` | Login thành công | `{ method: 'email' \| 'google' \| 'apple' }` |
| `login_failure` | Login fail | `{ method, error_code }` |
| `register_success` | Register | `{ method }` |
| `view_race` | View race detail | `{ race_id, race_slug }` |
| `add_to_cart` | Thêm course vào checkout | `{ race_id, course_id, qty, price }` |
| `begin_checkout` | Bắt đầu checkout | `{ value, currency: 'VND' }` |
| `payment_method_selected` | Chọn gateway | `{ method: 'vnpay' \| 'payx' \| 'payoo' \| 'onepay' }` |
| `purchase` | Thanh toán thành công | `{ order_id, value, currency, items: [...] }` |
| `payment_failed` | Payment fail | `{ order_id, method, error_code }` |
| `view_qr_ticket` | Show QR | `{ ticket_id, race_id }` |
| `bib_transfer_start` | Bắt đầu transfer | `{ ticket_id }` |
| `change_course_start` | Đổi course | `{ ticket_id }` |
| `result_search` | Tra kết quả | `{ query_type: 'event' \| 'bib' }` |
| `share_certificate` | Share kết quả | `{ ticket_id, share_method }` |
| `checkin_scan` | Staff scan QR | `{ scan_result: 'success' \| 'invalid' \| 'duplicate' }` |
| `app_crash` | Auto from Sentry | (auto) |
| `app_update_prompt_shown` | Force update modal show | `{ current_version, min_version }` |

---

## 🛑 PAUSE Conditions (carry-over từ Manager init + BA add)

> Cần Danny / Danny / Backend team trả lời TRƯỚC khi `/5bib-code`.

### Critical (BLOCK code start)

- [ ] **PAUSE-01:** Bundle ID iOS + Android app cũ — Danny confirm chính xác string
- [ ] **PAUSE-02:** Android keystore cũ (`.jks` + alias + password) — Danny cấp cho mobile team
- [ ] **PAUSE-03:** Apple Developer account access — Danny add mobile team với role Developer/Admin
- [ ] **PAUSE-04:** Google Play Console access — Danny add mobile team với role Admin
- [ ] **PAUSE-05:** Backend endpoint `POST /refresh` — Backend confirm có hay phải build mới (TD-007)
- [ ] **PAUSE-06:** Backend endpoint `POST /auth/apple/login` — Backend cần build (TD-008)
- [ ] **PAUSE-07:** Backend endpoints `POST /devices/register` + `DELETE /devices/{token}` — Backend cần build (TD-009)
- [ ] **PAUSE-08:** Deep link domain config — Web team setup `5bib.com/.well-known/apple-app-site-association` + `assetlinks.json`
- [ ] **PAUSE-09:** EAS Project ID — Danny tạo Expo organization + project, cấp ID
- [ ] **PAUSE-10:** Sentry DSN — Danny tạo Sentry project + cấp DSN
- [ ] **PAUSE-11:** Firebase project — Danny tạo (Analytics + Crashlytics + Cloud Messaging) + download `google-services.json` (Android) + `GoogleService-Info.plist` (iOS)
- [ ] **PAUSE-12:** Facebook App ID — Danny tạo FB Developer app + cấp App ID

### Important (BLOCK production release)

- [ ] **PAUSE-13:** Apple Sign-In review prep — Backend xác nhận flow + iOS app review preparation
- [ ] **PAUSE-14:** Payment review prep — Danny confirm app cũ đã pass Apple review với gateway VN nào, có video demo lưu lại không?
- [ ] **PAUSE-15:** Privacy policy URL + Terms URL cho App Store/Play Store submission
- [ ] **PAUSE-16:** App Store screenshots (6.5" iPhone, 5.5" iPhone, iPad nếu support) + Play Store screenshots → designer chuẩn bị
- [ ] **PAUSE-17:** App description vi/en/de cho 2 store

### Defer to Phase 2

- [ ] Biometric login (FaceID/TouchID)
- [ ] Certificate pinning
- [ ] Dark mode
- [ ] Tablet layout
- [ ] Offline check-in queue sync

---

## 🧪 Cross-cutting Testing Strategy

> 4 Manager require vì NO TESTER:

### 1. Unit test ≥ 80% coverage
- Jest + `@testing-library/react-native`
- Mock `@5bib/sdk` (đã test riêng ở web)
- Focus: Zustand stores, custom hooks, utility functions, screen logic (không phải snapshot)

### 2. E2E smoke critical paths (Maestro)

| Flow | Step |
|------|------|
| `flow-01-login` | App fresh install → Login email/password → reach Home tab |
| `flow-02-browse-purchase` | Login → browse Events → tap race → tap course → checkout → mock payment success → see QR ticket |
| `flow-03-show-ticket-offline` | Login → My Tickets → tap ticket → toggle airplane mode → QR vẫn render |
| `flow-04-result-lookup` | (No auth) → Result tab → search BIB → see personal result |
| `flow-05-staff-checkin` | Login as staff → Check-in mode → scan mock QR → confirm |

### 3. Staged rollout

| Stage | Audience | Duration | Pass criteria → next |
|-------|----------|----------|---------------------|
| Internal beta | EAS internal distribution (10 user) | 1 tuần | 0 crash, all flows pass manual |
| TestFlight + Closed track | 50 external user | 1 tuần | Crash-free > 99%, no P0 bug |
| Production 5% | App Store + Play Store 5% rollout | 24h | Crash-free > 99.5% |
| Production 20% | | 24h | Same |
| Production 50% | | 24h | Same |
| Production 100% | | | |

### 4. Auto rollback
- CI watch Sentry crash rate via API
- Nếu crash rate > 1% trong window 24h đầu → **EAS Update revert** sang version trước
- Manual override Danny

---

## 📂 Wave structure (BA delivery — REVISED 2026-05-25)

| Wave | Files | Mục đích | Status |
|------|-------|---------|--------|
| **1** | overview + design-system + epic-1-auth + epic-9-infra | Foundation | ✅ APPROVED rev2 |
| **2** | epic-2-browsing + epic-3-checkout + epic-4-tickets + epic-5-result | Core user value | ✅ READY |
| **3** (FINAL — reduced) | epic-6-ewaiver only | E-Waiver flow | ⏳ in-flight |
| ~~4~~ | ~~epic-8-content~~ | ~~Content~~ | ❌ DROPPED (Danny 2026-05-25) |
| ~~EPIC-7~~ | ~~epic-7-checkin~~ | ~~Staff scan~~ | ❌ DROPPED (Danny 2026-05-25) |

**Total scope mobile:** ~39 screens (cắt từ 47 ban đầu).

Sau Wave 1 → Danny chạy `/5bib-plan` để Manager review. APPROVE → BA viết tiếp Wave 2.

---

## 📌 Answers to Manager's PAUSE conditions (từ file 00)

> Manager init đã hỏi 9 PAUSE conditions. BA trả lời những phần BA có thẩm quyền, defer còn lại cho Danny:

| Question | Answer |
|----------|--------|
| Team RN — in-house hay hire | **DEFER Danny** — BA không có thông tin team. Note: nếu hire ngoài, timeline +4 tuần ramp-up |
| Backend `POST /refresh` | **DEFER Backend confirm** — PAUSE-05 |
| Backend `POST /auth/apple/login` | **DEFER Backend** — BA spec contract trong EPIC-1 |
| Android keystore cũ từ Danny | **DEFER Danny+Danny** — PAUSE-02 critical |
| Backend device-token endpoints | **DEFER Backend** — BA spec contract trong EPIC-9 |
| Deep link domain config | **DEFER Web team** — BA spec file content cần serve trong EPIC-9 |
| ~~Figma có sẵn chưa~~ **REVISED 2026-05-25** — Danny dùng **Claude Design** AI agent generate UI code trực tiếp từ PRD. KHÔNG cần Figma + human designer. | Wireframe text + states + components spec trong PRD đã đủ cho Claude Design consume → output TSX components. |
| Internal beta period | **BA propose 2-3 tuần** — đã ghi trong staged rollout |
| Build order EPIC | **BA APPROVE Manager order:** Wave 1 (1+9) → Wave 2 (2,3,4,5) → Wave 3 (6,7) → Wave 4 (8) |

---

## ✅ Status

- [x] DRAFT — đang viết Wave 1
- [ ] READY — sẽ flip khi cả 4 file Wave 1 xong + reviewed

---

## 🔗 Next step

1. **Claude Design** consume `01-ba-prd-design-system.md` → generate TSX component library (Button, Input, Card, Modal, …)
2. **Claude Design + Coder** consume `01-ba-prd-epic-1-auth.md` → generate 11 screen UI (Login/Register/Profile/…)
3. **Coder + DevOps** mở `01-ba-prd-epic-9-infra.md` để setup EAS + Sentry + Firebase parallel
4. Danny review Wave 1 → chạy `/5bib-plan FEATURE-003-mobile-app-rn-expo` để Manager gate
5. Manager APPROVE → BA bắt đầu Wave 2 (EPIC-2, 3, 4, 5)
