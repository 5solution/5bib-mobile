# FEATURE-003: Build Mobile App 5BIB (React Native + Expo)

**Status:** 🟡 INITIATED
**Created:** 2026-05-25
**Owner:** Danny
**Type:** NEW_MODULE
**Parent context:** [FEATURE-001 parent decision log](../FEATURE-001-rebuild-mobile-app-5bib/00-manager-init.md)
**Blocked by:** FEATURE-002 (`@5bib/sdk` extract) — chỉ ở giai đoạn `/5bib-code`. PRD/Plan có thể spec song song.
**Created by:** 5bib-manager

---

## 🎯 Why this feature

5BIB có mobile app đã public trên App Store + Google Play, nhưng **mất source code** → không update được + nhiều issue prod. Cần build lại từ đầu, tính năng y hệt web (minus Group Buy), publish thay thế app cũ.

Danny (owner) còn quyền console → giữ bundle ID cũ → user auto-update, KEEP rating.

---

## 📂 Impact Map

### Module mới tạo (NEW)

```
apps/mobile/                    ← NEW — React Native + Expo
├── app/                         # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── reset-password.tsx
│   ├── (tabs)/                  # Bottom tabs sau login
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── tickets.tsx
│   │   ├── orders.tsx
│   │   └── profile.tsx
│   ├── events/
│   │   ├── index.tsx
│   │   └── [path].tsx
│   ├── result/
│   ├── checkout/
│   ├── e-waiver/
│   ├── check-in/
│   ├── blogs/
│   ├── transport/
│   ├── vexere/
│   └── _layout.tsx              # Root layout
├── src/
│   ├── components/              # Native UI components
│   ├── adapters/                # storage adapter (SecureStore)
│   ├── hooks/                   # Mobile-specific hooks
│   ├── utils/                   # Mobile utilities
│   └── theme/                   # Tamagui/NativeWind theme
├── assets/                      # Icons, splash, fonts
├── app.json                     # Expo config
├── eas.json                     # EAS Build + Update config
└── package.json                 # Import @5bib/sdk
```

### Dependency từ `@5bib/sdk` (sau FEATURE-002 xong)

- `@5bib/sdk/services/*` — tất cả 22 service domain
- `@5bib/sdk/validations/*` — 11 zod schema (form validation)
- `@5bib/sdk/models/*` — types
- `@5bib/sdk/i18n/*` — vi/en/de translations

### Endpoint liên quan

**Cùng backend `https://api.5bib.com`** với web — ~50 endpoints (xem chi tiết tại [codebase-map.md](../../memory/codebase-map.md) section "Services Layer"). Mobile reuse 100% qua `@5bib/sdk`.

**Endpoints MỚI cần backend bổ sung (Manager flag TD-007/008/009):**
- `POST /refresh` — refresh JWT token (nếu chưa có)
- `POST /auth/apple/login` — Apple Sign-In (bắt buộc iOS nếu có Google Sign-In)
- `POST /devices/register` + `DELETE /devices/{token}` — FCM/APNs token management

### Schema/DB

- Mobile local storage (KHÔNG phải DB chính):
  - JWT token + refresh token → `expo-secure-store`
  - User preferences + locale → `AsyncStorage`
  - Offline QR ticket cache → `expo-sqlite` hoặc `AsyncStorage`
  - Draft form (nếu user thoát giữa chừng checkout) → `AsyncStorage`

### External integrations (mobile-specific)

| Service | Library | Lý do |
|---------|---------|-------|
| Push notification | `expo-notifications` (FCM Android + APNs iOS) | Race day alert, order confirm |
| Maps | `react-native-maps` (Google + Apple) | Show race course |
| QR scan | `expo-barcode-scanner` hoặc `react-native-vision-camera` | Staff check-in |
| QR gen | `react-native-qrcode-svg` | Show ticket |
| Signature | `react-native-signature-canvas` | E-waiver signing |
| WebView | `react-native-webview` | Payment gateway redirect (4 gateway VN) |
| Deep link | `expo-linking` | Universal link iOS + App Link Android |
| Analytics | `expo-firebase-analytics` + `react-native-fbsdk-next` | Parity với web (GA + FB Pixel) |
| Crash | `sentry-expo` + `@sentry/react-native` | Crash reporting + source map |
| OTA Update | **EAS Update** | Hot fix bug không qua store review |

---

## ⚠️ Risk Flags

- 🔴 **HIGH — App store transition.**
  - Bundle ID cũ phải match chính xác → version code/build number phải > app cũ +1
  - Sign keystore Android cũ (file `.jks`) phải lấy từ Danny — KHÔNG được tạo keystore mới (Google Play sẽ reject upload với conflict signature)
  - iOS: provisioning profile + cert mới hoặc xin từ Danny

- 🔴 **HIGH — Apple review payment policy.**
  - 4 gateway VN (VNPay/PayX/Payoo/OnePay) qua WebView + deep link return
  - Race ticket = physical event service (Apple Guideline 3.1.5) → được phép out-of-app payment
  - CHUẨN BỊ reject lần 1 → resubmit với video demo + note rõ trong Review Notes

- 🔴 **HIGH — NO TESTER constraint.**
  - 4 require Manager ENFORCE: unit test ≥ 80%, E2E smoke (Detox/Maestro), staged rollout, auto rollback
  - Bug ship → EAS Update push fix trong vài phút (KHÔNG cần store review)

- 🟡 **MED — Offline QR ticket.**
  - Race day không có signal → user vẫn cần show QR cho staff scan
  - Cache QR sau khi load thành công, fallback localStorage khi offline
  - Edge case: refund/cancel → cần invalidate cache

- 🟡 **MED — E-waiver canvas signature trên mobile.**
  - Touch gesture khác hẳn mouse → cần test trên cả iOS + Android device thật
  - Export signature thành image upload qua `@5bib/sdk/services/upload`

- 🟡 **MED — Push notification permission.**
  - iOS: must request permission, user có thể từ chối
  - Android 13+: notification permission cần request
  - Backend cần endpoint để register/unregister device token

- 🟡 **MED — Deep link domain config.**
  - Universal link iOS: `https://5bib.com/.well-known/apple-app-site-association`
  - App Link Android: `https://5bib.com/.well-known/assetlinks.json`
  - Cần web team setup các file này

- 🟢 **LOW — i18n.** Import từ `@5bib/sdk/i18n` qua `i18next` adapter.
- 🟢 **LOW — Form validation.** zod reuse trực tiếp.

---

## 🚧 PAUSE Conditions cần Danny xác nhận khi BA viết PRD

> 6 follow-up questions từ FEATURE-001 đã được carry-over. Danny trả lời được càng sớm càng tốt.

- [ ] **Team RN:** Ai code? In-house đã có React Native skill chưa? (Web team đã có TS/React → onboarding RN ~ 1-2 tuần)
- [ ] **Backend refresh token:** `POST /refresh` đã có chưa? Nếu chưa → cần task backend song song
- [ ] **Backend Apple Sign-In:** `POST /auth/apple/login` đã có chưa?
- [ ] **Android signing keystore cũ:** Danny có giữ file `.jks` + alias + password không? **CRITICAL** — không có = không upload được app mới cùng bundle ID
- [ ] **Backend device-token endpoints:** `POST /devices/register` + `DELETE /devices/{token}` đã có chưa?
- [ ] **Deep link domain:** Có config được `5bib.com/.well-known/*` không?
- [ ] **Design Figma:** Có sẵn cho mobile chưa? Hay design parallel với code?
- [ ] **Internal beta period:** 2-3 tuần internal beta trước production OK chứ?
- [ ] **Order build EPIC:** Manager đề xuất EPIC-1 (Auth) + EPIC-9 (Infra) trước → tiếp các EPIC core (3, 4, 5, 7) → cuối cùng EPIC-6, 8. Danny đồng ý?

---

## 📋 EPIC breakdown — REVISED 2026-05-25 (6 EPICs final)

> Original 9 EPIC scope đã cắt còn 6 EPIC. EPIC-5 reduced scope, EPIC-7 + EPIC-8 dropped.

| EPIC | Title | Endpoints SDK dùng | Status |
|------|-------|-------------------|--------|
| 1 | Auth & Profile | `user/*`, `upload/avatar` | ✅ Wave 1 |
| 2 | Race Browsing | `race/*`, `race-course/*` | ✅ Wave 2 |
| 3 | Checkout & Payment | `order/*`, `priceRule/*`, `bank/*`, `viet-QR/*` | ✅ Wave 2 |
| 4 | My Tickets & Orders | `ticket/*`, `order/*`, `athlete/transfer` | ✅ Wave 2 |
| 5 | Result (REDUCED) | `athlete/result` ONLY + WebView redirect ra `result.5bib.com` | ✅ Wave 2 rev2 |
| 6 | E-Waiver | `e-waiver/*`, `athlete/checkin*` | ⏳ Wave 3 (final) |
| ~~7~~ | ~~Staff Check-in~~ | ~~`athlete/checkin`, `pub/ticket-by-code`~~ | ❌ DROPPED — Staff dùng web admin |
| ~~8~~ | ~~Content (blog/vexere/transport)~~ | ~~`blogs/*`, Vexere/Transport~~ | ❌ DROPPED — Mobile không cần content |
| 9 | Infrastructure | (cross-cutting) | ✅ Wave 1 |

**Build order:** EPIC-1 + EPIC-9 (Wave 1) → EPIC-2, 3, 4, 5 (Wave 2) → EPIC-6 (Wave 3 final).

---

## 🎯 Success criteria (gợi ý cho BA)

**Business:**
- App mới publish thay thế app cũ trong [N] tháng (Danny xác định N)
- ≥ 80% user app cũ migrate sang app mới trong 3 tháng đầu
- Crash-free session ≥ 99.5% trong 30 ngày đầu
- App store rating ≥ 4.2 sau 90 ngày

**Product:**
- Feature parity với web (minus Group Buy)
- Offline QR ticket: 100% case race day vẫn show được QR
- i18n vi/en/de đầy đủ
- Cold start < 3s trên iPhone 8 / Android Snapdragon 660

**Technical:**
- Reuse ≥ 90% logic từ `@5bib/sdk` (verify qua code coverage)
- Bundle size < 25MB (iOS) / 15MB (Android base APK)
- Unit test coverage ≥ 80% cho `apps/mobile/src/`
- E2E smoke test pass cho 5 critical flow (login, browse, checkout, show QR, result lookup)
- EAS Update tested: 1 fake bug → push update → user nhận trong < 10 phút

---

## ✅ Sẵn sàng cho `/5bib-prd`?

- [x] **YES** — có thể bắt đầu PRD song song với FEATURE-002 (refactor SDK). Code chỉ start sau khi FEATURE-002 deploy.
- BA cần trả lời PAUSE conditions trong PRD

---

## 🎨 HAND-OFF NOTE TO BA — PRD FORMAT REQUEST (Manager 2026-05-25)

> **Danny yêu cầu PRD này phải DESIGN-ORIENTED** — output sẽ được designer dùng để vẽ UI ngay. KHÔNG phải PRD kỹ thuật thuần.

**BA bắt buộc output theo format mở rộng:**

### Per-screen spec (thay vì chỉ user story)
Mỗi screen trong mỗi EPIC phải có:

1. **Screen ID + Name** (vd: `S-AUTH-01: Login Screen`)
2. **Route mapping** (vd: Expo Router `/(auth)/login`)
3. **Wireframe description** (textual layout — designer convert sang Figma):
   - Layout zones (header / body / footer / FAB / bottom sheet)
   - Component placement (top → bottom, left → right)
   - Visual hierarchy (primary CTA, secondary actions, helper text)
4. **All UI states** (CRITICAL):
   - Initial / Loading / Empty / Filled / Error / Success / Submitting / Offline
   - Spec từng state riêng — designer cần vẽ tất cả
5. **Components list** dùng trên screen:
   - Native input, button, dialog, bottom sheet, list item, …
   - Note: dùng library nào (Tamagui / Gluestack / Paper)
6. **Interaction & micro-animation**:
   - Press feedback, transition giữa state, swipe gesture
   - Loading skeleton vs spinner
7. **Data binding** — mỗi field map endpoint nào trong `@5bib/sdk`
8. **Edge cases UX**:
   - Network offline → hiển thị gì?
   - Long text overflow → ellipsis / wrap?
   - i18n string dài (de tiếng Đức dài hơn vi) → layout không break?
9. **Accessibility**:
   - VoiceOver/TalkBack labels
   - Color contrast WCAG AA
   - Touch target ≥ 44pt iOS / 48dp Android

### Per-EPIC design system requirements
Mỗi EPIC nêu rõ:
- Color tokens dùng (primary, secondary, semantic — error/success/warning)
- Typography scale dùng (heading 1/2/3, body, caption)
- Spacing scale dùng
- Icon set dùng (vd: Feather Icons, SF Symbols mapping)
- Shadow / elevation level

### Cross-screen design system (BA spec ở EPIC-9 Infrastructure)
- App-wide color palette + dark mode support roadmap
- Typography system (font family iOS vs Android — SF Pro vs Roboto)
- Spacing scale (4/8/12/16/24/32)
- Icon library quyết định
- Bottom tab navigation pattern
- Header pattern (back button, title, action)
- Empty state pattern (illustration + message + CTA)
- Error state pattern (toast vs banner vs dialog — quy ước khi nào dùng cái nào)
- Loading state pattern (skeleton vs spinner vs progress bar — quy ước)
- Form pattern (label position, error display, success affirmation)

### Output structure đề xuất cho BA

Vì PRD design-oriented sẽ rất dài, BA chia file:
```
features/FEATURE-003-mobile-app-rn-expo/
├── 00-manager-init.md           (existing)
├── 01-ba-prd-overview.md        ← BA: PRD overview + tech mandate + cross-cutting
├── 01-ba-prd-design-system.md   ← BA: design system spec (cho designer pickup ngay)
├── 01-ba-prd-epic-1-auth.md     ← BA: Wave 1
├── 01-ba-prd-epic-9-infra.md    ← BA: Wave 1
├── 01-ba-prd-epic-2-browsing.md ← BA: Wave 2
├── 01-ba-prd-epic-3-checkout.md
├── 01-ba-prd-epic-4-tickets.md
├── 01-ba-prd-epic-5-result.md
├── 01-ba-prd-epic-6-ewaiver.md  ← BA: Wave 3
├── 01-ba-prd-epic-7-checkin.md  ← BA: Wave 3
└── 01-ba-prd-epic-8-content.md  ← BA: Wave 4
```

**BA write theo wave:**
- **Wave 1 FIRST** (overview + design-system + EPIC-1 + EPIC-9): designer có thể bắt đầu vẽ ngay
- **Wave 2-4** parallel sau Wave 1 reviewed

### Reference cho BA

BA bắt buộc đọc và REFERENCE từ web hiện tại để hiểu UX flow:
- Routes: `apps/web/src/app/[locale]/` — xem screen mapping
- Components: `apps/web/src/components/` — hiểu UI behavior hiện tại trên web
- Validations: `apps/web/src/validations/*.validation.ts` — copy form rules
- i18n: `apps/web/i18n/` — copy string list
- Existing user flows: 6 flows đã spec trong [architecture.md](../../memory/architecture.md)

→ Mobile KHÔNG copy 1-1 web UI. BA decide từng screen: **mobile-native pattern** (bottom sheet thay modal, bottom tab thay sidebar, swipe gesture thay click, …)

---

## 🔗 Next step

1. Danny review file này (note design hand-off đã thêm ở trên)
2. Danny chạy: `/5bib-prd FEATURE-003-mobile-app-rn-expo` HOẶC invoke `5bib-po-ba` skill
3. BA viết PRD theo Wave + format design-oriented đã spec
4. Designer có thể bắt đầu vẽ Figma ngay sau khi BA xong Wave 1 (overview + design-system + EPIC-1 + EPIC-9)
5. Manager review từng wave → APPROVE → song song /5bib-code (chỉ start sau FEATURE-002 deploy)
