# 5BIB Mobile App

> Mobile app cho 5bib.com — booking race + management ticket.
> Stack: React Native + Expo SDK 51 + Expo Router + Tamagui + TypeScript.

## 📁 Repo Structure

```
5bib-mobile/
├── apps/
│   └── mobile/                    # Expo app (React Native)
│       ├── app/                   # Expo Router file-based routes
│       │   ├── _layout.tsx        # Root layout
│       │   ├── (auth)/            # Login, Register, Reset, Welcome
│       │   ├── (tabs)/            # Home, Tickets, Orders, Profile
│       │   ├── events/            # Race browsing
│       │   ├── checkout/          # Checkout flow + Payment WebView
│       │   ├── tickets/[id]/      # Ticket detail + Edit + ChangeCourse + Transfer + RollingBIB
│       │   ├── profile/           # Edit profile, Change avatar
│       │   ├── e-waiver/          # 3-step OTP signing + WebView sign
│       │   ├── orders/            # Order detail
│       │   └── result/            # Result hub (redirect result.5bib.com)
│       ├── src/
│       │   ├── components/        # 25+ UI components (base + domain)
│       │   ├── hooks/             # useOnline, useCountdown, useDebouncedValue, useDraftPersist, usePolling
│       │   ├── stores/            # Zustand: useAuthStore, useCheckoutStore, useChangeCourseStore, useRollingBibStore, useBrowseFilterStore
│       │   ├── adapters/          # secure-storage, async-storage, sqlite-cache, sdk-init, event-bus
│       │   ├── sdk/               # @5bib/sdk skeleton (Fetcher, services, normalize, validations, constants)
│       │   ├── theme/             # Tamagui tokens + config
│       │   └── i18n/              # vi, en, de translations
│       ├── assets/                # icons, splash, brand
│       ├── app.json               # Expo config
│       ├── eas.json               # EAS Build + Update profiles
│       ├── babel.config.js
│       ├── metro.config.js
│       └── package.json
├── assets/                        # Shared brand assets (logos, hero images)
├── docs/                          # PRD specs (Manager + BA artifacts từ FEATURE-003)
│   ├── 00-manager-init.md
│   ├── 01-ba-prd-overview.md
│   ├── 01-ba-prd-design-system.md
│   ├── 01-ba-prd-ux-patterns-reference.md  ← MUST-READ Manager deep audit
│   ├── 01-ba-prd-epic-1-auth.md
│   ├── 01-ba-prd-epic-2-browsing.md
│   ├── 01-ba-prd-epic-3-checkout.md (rev2)
│   ├── 01-ba-prd-epic-4-tickets.md (rev2)
│   ├── 01-ba-prd-epic-5-result.md
│   ├── 01-ba-prd-epic-6-ewaiver.md
│   ├── 01-ba-prd-epic-9-infra.md
│   └── 02-manager-plan.md
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node 20+
- pnpm 8+ (recommend) hoặc yarn/npm
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- iOS Simulator (macOS) + Android Studio
- Xcode 15+ (cho iOS)

### Setup

```bash
# Install dependencies
cd apps/mobile
npm install   # hoặc pnpm install

# Copy env template
cp .env.example .env
# Fill in real values (xem section ENV bên dưới)

# Run dev server
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android
```

### ENV variables (`.env`)

| Variable | Purpose | Source |
|----------|---------|--------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://api.5bib.com` (prod) / `https://dapi.5bib.com` (staging) |
| `EXPO_PUBLIC_RESULT_URL` | Result site redirect | `https://result.5bib.com` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry error tracking | Danny tạo Sentry project, cấp DSN |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Analytics + Crashlytics + Messaging | Danny tạo Firebase project |
| `EXPO_PUBLIC_FB_APP_ID` | Facebook SDK app ID | Danny tạo FB Developer app |
| `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Google Sign-In | Google Cloud Console |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | EAS Update channel | `eas init` |

### Firebase config files (gitignored)

⚠️ Place locally, KHÔNG commit:
- `apps/mobile/google-services.json` (Android — từ Firebase Console)
- `apps/mobile/GoogleService-Info.plist` (iOS — từ Firebase Console)

## 🏗️ Architecture

- **Routing:** Expo Router (file-based)
- **State:** Zustand (5 stores) + React Hook Form (per-form local)
- **API:** `@5bib/sdk` (axios Fetcher + service modules + normalize layer)
  - **Note:** `@5bib/sdk` package chưa publish; hiện tại có skeleton tại `src/sdk/`. Khi `selling-web` extract FEATURE-002 SDK monorepo xong → replace local skeleton với npm package.
- **i18n:** react-i18next (vi default, en, de)
- **Storage:** `expo-secure-store` (token), AsyncStorage (preferences + draft), `expo-sqlite` (offline QR cache)
- **Push:** Firebase Cloud Messaging (Android) + APNs (iOS) qua `@react-native-firebase/messaging`
- **Analytics:** Firebase Analytics + Facebook SDK
- **Crash:** Sentry + Firebase Crashlytics
- **OTA:** EAS Update (safety net thay tester — bug fix push không qua store review)
- **UI:** Tamagui + custom design tokens + Lucide icons

## 📜 Scope

**6 EPIC implemented (~39 screens):**
- EPIC-1 Auth & Profile
- EPIC-2 Race Browsing
- EPIC-3 Checkout & Payment (4 gateway VN + VAT + Buy-group discount)
- EPIC-4 My Tickets & Orders (Rolling BIB gamification, 8 athlete statuses, 3-step change course, 2-flow transfer)
- EPIC-5 Result (redirect ra `result.5bib.com` + own user history)
- EPIC-6 E-Waiver (3-step OTP wizard)
- EPIC-9 Infrastructure (cross-cutting)

**OUT of scope (Phase 2 hoặc web-only):**
- ❌ Group Buy (personal + enterprise)
- ❌ Insurance per-ticket checkout
- ❌ Staff Check-in (web admin có sẵn)
- ❌ Content (blog/vexere/transport — web only)
- ❌ Dark mode (Phase 2)
- ❌ Biometric login (Phase 2)

## 🧪 Testing

```bash
npm run typecheck    # TypeScript strict
npm run lint         # ESLint
npm run test         # Jest unit tests

# E2E (Maestro — setup pending)
maestro test .maestro/flow-01-login.yaml
```

**Manager 4 require (NO TESTER team — bắt buộc):**
1. Unit test ≥ 80% coverage
2. E2E smoke 5 critical flows (Maestro)
3. Staged rollout: TestFlight Internal → Play 5% → 20% → 50% → 100%
4. Auto rollback nếu crash rate > 1% trong 24h đầu (EAS Update revert)

## 🚢 Deploy

```bash
# Build dev client
eas build --profile development --platform all

# TestFlight + Play Internal Testing
eas build --profile preview --platform all
eas submit --profile preview --platform ios

# Production
eas build --profile production --platform all
eas submit --profile production --platform all

# OTA update (sau khi build production đã có trên store)
eas update --branch production --message "Fix XX"
```

## 📋 PRD-Driven Development

Mọi screen + business logic dựa trên PRD trong `docs/`. Workflow:

1. Đọc `docs/01-ba-prd-overview.md` (context + NFR + SDK normalization)
2. Đọc `docs/01-ba-prd-design-system.md` (tokens + components)
3. Đọc `docs/01-ba-prd-ux-patterns-reference.md` (Manager deep audit — quan trọng nhất)
4. Đọc EPIC file tương ứng feature đang code
5. Reference BR-XX và TC-XX khi viết code + unit test

**Critical pattern references:**
- VAT discriminated union: BR-CHECKOUT-21/22/23
- Rolling BIB 4-state: BR-TICKETS-15/16/17
- 8 athlete statuses matrix: BR-TICKETS-01b
- 8 transfer error codes: BR-TICKETS-20
- Age validation event-date: BR-CHECKOUT-26
- Zero-total special case: BR-CHECKOUT-25
- Password regex strict: BR-AUTH-02

## 🛑 Critical PAUSE conditions (chưa resolve)

Phải có trước khi code start:
- [ ] Bundle ID iOS + Android cũ (Toàn confirm)
- [ ] Android keystore `.jks` cũ (Toàn cấp)
- [ ] Apple Developer account access (Toàn invite)
- [ ] Google Play Console access (Toàn invite)
- [ ] Backend `POST /refresh` endpoint
- [ ] Backend `POST /auth/apple/login` endpoint (Apple Guideline 4.8)
- [ ] Backend `POST /devices/register` (FCM/APNs token)
- [ ] Deep link domain `5bib.com/.well-known/apple-app-site-association` + `assetlinks.json`
- [ ] EAS Project ID (`eas init`)
- [ ] Sentry DSN
- [ ] Firebase project + config files
- [ ] Facebook App ID
- [ ] `@5bib/sdk` package publish (depends on `selling-web` FEATURE-002)

## 🔗 Related repos

- **`selling-web`** — Next.js web frontend (source of truth cho business logic, API contracts)
- **`5bib-sdk`** — Future SDK package (TBD — extract từ selling-web FEATURE-002)

## 👥 Team

- **Owner:** Danny Nguyen (`@dannynguyen`)
- **PM:** Toàn (App Store + Play Console rights)
- **Mobile dev:** TBD

## 📄 License

Proprietary © 5BIB 2026.
