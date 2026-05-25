# 5BIB Mobile — Generated UI Codebase

Generated for **FEATURE-003 Wave 1–3** (auth + browsing + checkout + tickets + result + e-waiver).

## Stack

- Expo SDK 51 + Expo Router (file-based)
- React Native 0.74
- TypeScript strict
- Tamagui (theme + primitives)
- react-i18next (vi/en/de)
- Zustand (stores)
- `@gorhom/bottom-sheet`, `react-native-webview`, `react-native-qrcode-svg`, `expo-camera`

## Structure

```
apps/mobile/
├── app/                              # Expo Router screens (24 screens)
│   ├── _layout.tsx                   # Root providers (Tamagui, Toast, BottomSheet, i18n)
│   ├── index.tsx                     # Splash + auth gate
│   ├── +not-found.tsx
│   ├── (auth)/                       # Unauthenticated stack
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx               # S-AUTH-01
│   │   ├── login.tsx                 # S-AUTH-02
│   │   ├── register.tsx              # S-AUTH-03
│   │   ├── forgot-password.tsx       # S-AUTH-04
│   │   └── reset-password.tsx        # S-AUTH-05
│   ├── (tabs)/                       # Bottom tabs (auth required)
│   │   ├── _layout.tsx
│   │   ├── home.tsx                  # S-BROWSE-01
│   │   ├── tickets.tsx               # S-TICKETS-01
│   │   ├── orders.tsx                # S-ORDERS-01
│   │   └── profile.tsx               # S-PROFILE-01
│   ├── events/
│   │   ├── index.tsx                 # S-BROWSE-02
│   │   └── [path].tsx                # S-BROWSE-03 (event detail)
│   ├── checkout/
│   │   ├── index.tsx                 # S-CHECKOUT-01/02/03 wizard
│   │   ├── payment-webview.tsx       # S-CHECKOUT-05
│   │   └── result.tsx                # S-CHECKOUT-06 (success/pending/failed)
│   ├── tickets/
│   │   ├── [id].tsx                  # S-TICKETS-02
│   │   └── [id]/
│   │       ├── edit.tsx              # S-TICKETS-03
│   │       ├── change-course.tsx     # S-TICKETS-04
│   │       └── transfer.tsx          # S-TICKETS-05
│   ├── orders/
│   │   └── [id].tsx                  # S-ORDERS-02
│   ├── result/
│   │   ├── index.tsx                 # S-RESULT-01 (hub)
│   │   ├── webview.tsx               # S-RESULT-01b
│   │   └── race-history.tsx          # S-RESULT-05
│   └── e-waiver/
│       ├── index.tsx                 # S-WAIVER-01/02/03 wizard
│       └── sign.tsx                  # S-WAIVER-04 (webview)
└── src/
    ├── theme/
    │   ├── tokens.ts                 # Design tokens (color, space, radius, font, elevation, motion)
    │   └── tamagui.config.ts         # Tamagui theme registration
    ├── i18n/
    │   ├── index.ts                  # react-i18next setup
    │   └── locales/{vi,en,de}.json
    ├── components/                   # 20 reusable components + 7 domain
    │   ├── index.ts                  # barrel export
    │   ├── Button.tsx, Input.tsx, OTPInput.tsx, Card.tsx, Badge.tsx
    │   ├── BottomSheet.tsx, Modal.tsx, Toast.tsx (+ provider)
    │   ├── EmptyState.tsx, Skeleton.tsx (+ Spinner + FullScreenLoading)
    │   ├── ErrorState.tsx (FullScreenError + Banner)
    │   ├── TabBar.tsx, Header.tsx, ListItem.tsx, FormLayout.tsx
    │   ├── QRDisplayCard.tsx         # brightness boost + keep-awake
    │   ├── PaymentMethodPicker.tsx, QRScannerView.tsx, WebViewWrapper.tsx
    │   └── domain/
    │       ├── RaceCard.tsx, TicketCard.tsx, OrderCard.tsx, CourseCard.tsx
    │       └── Stepper.tsx, SegmentedTabs.tsx, FilterChip.tsx
    ├── hooks/index.ts                # useOnline, useCountdown, useDebouncedValue, useDraftPersist, usePolling, passwordStrength
    └── sdk/models.ts                 # Clean DTO types matching @5bib/sdk normalization
```

## UI states covered

Every screen handles the 8 canonical states:

| State | Where shown |
|-------|-------------|
| Initial | Default render with empty/seeded form |
| Loading | Skeleton placeholders matching final shape |
| Empty | `EmptyState` with icon + title + optional CTA |
| Filled | Real data render |
| Error | `Toast` + `Banner` + inline field errors + `FullScreenError` for fatal |
| Success | Toast + auto-navigate, sometimes a dedicated success view (`/checkout/result`) |
| Submitting | Spinner inside CTA, disabled form |
| Offline | Top `Banner` via `useOnline()`, CTAs disabled on flows that require network |

## Cross-cutting compliance

- **i18n:** every visible string flows through `t('key')`. No hardcoded copy in components.
- **Theme tokens:** zero hardcoded colors/spacing. All from `tokens.*` or theme.
- **Accessibility:** every interactive element has `accessibilityRole` + `accessibilityLabel`. Touch targets ≥ 44pt iOS / 48dp Android (BR-GLOBAL-13).
- **Safe area:** `SafeAreaProvider` at root, `useSafeAreaInsets` for chrome offsets.
- **Offline:** `useOnline` banner at top of network-dependent screens.
- **Draft persistence:** `useDraftPersist` for checkout form (BR-CHECKOUT-16, TTL 24h).
- **Polling:** `usePolling` for pending payment status (10s interval, 15 min cap — BR-CHECKOUT-19).
- **Brightness boost + keep-awake:** `QRDisplayCard` (BR-GLOBAL-02, race-day reliability).
- **WebView whitelist:** `WebViewWrapper` enforces allowed-domain list per gateway (BR-CHECKOUT-12, BR-WAIVER-06).
- **Deep link return:** `WebViewWrapper.returnUrlPrefix` for `bib5://payment-return`.

## What still needs wiring

These items are stubbed for the UI layer; the `// TODO:` style comments mark them in source:

1. **`@5bib/sdk` adapter** — every screen has a `// await sdk.X.Y(...)` line where a mock `setTimeout` currently lives.
2. **SecureStore token persistence** — login screen has the call commented.
3. **Zustand auth store** — `useAuthStore.setUser(user)` after login.
4. **Native Google / Apple sign-in handlers** (TD-008 backend).
5. **Push notification registration** (FCM + APNs, EPIC-9).
6. **Sentry init + EAS Update bootstrap.**
7. **Real device-specific assets** — logo PNGs (1x/2x/3x), payment-gateway SVGs (VNPay/PayX/Payoo/OnePay) — see PAUSE-brand.
8. **PAUSE-EPIC6-01** — exact whitelist domain for `signPath` (Docusign / HelloSign / self-hosted).

## Verifying

```bash
cd apps/mobile
pnpm install
pnpm start
# scan QR with Expo Go
```

The codebase compiles with `pnpm typecheck` once all dependencies are installed.
