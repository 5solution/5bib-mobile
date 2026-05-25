# FEATURE-003: EPIC-1 — Auth & Profile

**Status:** 🔵 READY (rev2 2026-05-25 — Manager NEEDS_REVISION fixes)
**Author:** 5bib-po-ba
**Wave:** 1 of 4
**Linked:** [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md)
**Audience:** Claude Design (generate UI) + Coder. File này có đầy đủ wireframe + states + form fields + endpoints + DTOs cho 11 screen Auth + Profile.

---

## 🎯 EPIC-1 Goal

Cho phép user đăng ký, đăng nhập (email/password + Google + Apple), reset mật khẩu, xem và sửa profile, đổi avatar. Auth là **foundation** — mọi feature khác phụ thuộc auth state.

## 📦 Scope EPIC-1

| Screen ID | Screen Name | Route |
|-----------|------------|-------|
| S-AUTH-00 | Splash | (initial — Expo splash) |
| S-AUTH-01 | Welcome (first launch) | `/(auth)/welcome` |
| S-AUTH-02 | Login | `/(auth)/login` |
| S-AUTH-03 | Register | `/(auth)/register` |
| S-AUTH-04 | Forgot Password | `/(auth)/forgot-password` |
| S-AUTH-05 | Reset Password (OTP + new password) | `/(auth)/reset-password` |
| S-AUTH-06 | Google Sign-In (native modal) | (overlay on login) |
| S-AUTH-07 | Apple Sign-In (iOS only, native modal) | (overlay on login) |
| S-AUTH-08 | Logout confirm | (dialog overlay) |
| S-PROFILE-01 | Profile view | `/(tabs)/profile` |
| S-PROFILE-02 | Edit Profile | `/profile/edit` |
| S-PROFILE-03 | Change Avatar bottom sheet | (overlay on edit) |
| S-PROFILE-04 | Settings | `/settings` |

---

## 👤 User Stories

- **US-AUTH-01:** As an **Athlete**, I want to **login bằng email/password** so that I can xem ticket + đặt BIB.
- **US-AUTH-02:** As an **Athlete**, I want to **login bằng Google** so that tôi không phải nhớ password mới.
- **US-AUTH-03:** As an **iOS Athlete**, I want to **login bằng Apple** because Apple bắt buộc nếu app có Google Sign-In.
- **US-AUTH-04:** As a **new Athlete**, I want to **đăng ký tài khoản** so that tôi có thể mua BIB lần đầu.
- **US-AUTH-05:** As an **Athlete quên mật khẩu**, I want to **reset password qua OTP email** so that tôi không mất account.
- **US-AUTH-06:** As an **Athlete**, I want to **xem profile** so that biết info đăng ký giải đang dùng tên gì.
- **US-AUTH-07:** As an **Athlete**, I want to **sửa profile + đổi avatar** so that thông tin đăng ký giải mới đúng.
- **US-AUTH-08:** As an **Athlete**, I want to **logout** so that bảo mật khi dùng máy chung.
- **US-AUTH-09:** As an **Athlete**, I want to **đổi ngôn ngữ vi/en/de** trong Settings so that dùng app thoải mái.

---

## 📜 Business Rules (BR-AUTH-XX)

| ID | Business Rule |
|----|--------------|
| BR-AUTH-01 | Email phải hợp lệ regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`, max 254 chars |
| BR-AUTH-02 | Password tối thiểu 8 chars, phải có ít nhất 1 chữ + 1 số. KHÔNG bắt buộc ký tự đặc biệt (giảm friction) |
| BR-AUTH-03 | Login fail 5 lần liên tiếp trong 15 phút → backend lock account 15 phút, frontend hiển thị message + countdown |
| BR-AUTH-04 | JWT token expire → app auto force logout + redirect Login + toast "Phiên đăng nhập hết hạn" (BR-GLOBAL-03) |
| BR-AUTH-05 | Refresh token (nếu backend support — PAUSE-05) → silent refresh, KHÔNG để user thấy logout |
| BR-AUTH-06 | Google Sign-In trên iOS BẮT BUỘC kèm Apple Sign-In (Apple Guideline 4.8) |
| BR-AUTH-07 | OTP reset password gửi qua email, 6 digit numeric, expire 5 phút, resend allow 1 lần / 60s |
| BR-AUTH-08 | Register: email duplicate → 409 + message "Email đã tồn tại, đăng nhập?" + CTA navigate Login |
| BR-AUTH-09 | Avatar upload: max 5MB, format JPEG/PNG/WebP, auto crop 1:1 square, resize tối đa 1024×1024 trước upload |
| BR-AUTH-10 | Phone field optional, nếu fill phải hợp lệ Việt Nam regex `^(0|\+84)[35789][0-9]{8}$` |
| BR-AUTH-11 | Profile field sửa được: fullName, dob, gender, phone, address, avatar. KHÔNG sửa được: email (cần feature riêng email change với OTP) |
| BR-AUTH-12 | Logout: xoá JWT từ SecureStore + clear Zustand store + clear navigation stack + redirect Login |
| BR-AUTH-13 | First-launch detect (chưa từng login): show Welcome screen với onboarding 3 slides. Sau đó save flag → không show lại. |
| BR-AUTH-14 | Đổi language trong Settings → restart soft app (clear nav stack, re-mount với i18n mới). KHÔNG cần restart hard. |
| BR-AUTH-15 | Token storage: BR-GLOBAL-06 — `expo-secure-store` only |
| BR-AUTH-16 | Reset password: `newPasswordConfirm` MUST equal `newPassword`. Validation client-side trước khi call SDK. KHÔNG để backend reject sau roundtrip. |
| BR-AUTH-17 | Register: `confirmPassword` MUST equal `password`. Same as BR-AUTH-16 client-side. |
| BR-AUTH-18 | `agreeTerms` checkbox là FRONTEND-ONLY validation gate. KHÔNG gửi backend. Phải checked = true mới enable submit register. |

---

## 🖥️ Per-Screen Spec

### S-AUTH-00: Splash

**Route:** initial (Expo built-in splash, then app gate decides next)
**Logic:**
1. App launch → show splash (Expo native splash từ `assets/splash.png`)
2. Check `SecureStore.getItem('jwt_token')`:
   - Có token + chưa expired → navigate `/(tabs)/home`
   - Không có / expired → navigate `/(auth)/welcome` nếu first launch, else `/(auth)/login`
3. Check `min_supported_version` từ backend (timeout 3s, fallback skip nếu offline) → nếu app version < min → show Force Update modal

**Wireframe:** Native splash, no custom UI.

**States:**
- Default: splash image full screen
- Bootstrapping (background API check): no UI change, hide splash sau khi navigate

**Components:** Native (Expo splash)
**Data binding:**
- `SecureStore.getItem('jwt_token')` → check exists
- `SecureStore.getItem('first_launch_done')` → check first launch
- `GET {API}/global-config` → `min_supported_version` (timeout 3s)

**Edge cases:**
- Offline at splash → skip min version check, proceed với token cached
- Corrupt token → catch error → treat as no token → Login

---

### S-AUTH-01: Welcome (first launch onboarding)

**Route:** `/(auth)/welcome`
**Wireframe:**
```
┌─────────────────────────────────────┐
│                                     │
│         [5BIB Logo + tagline]       │
│                                     │
│         ┌─────────────────┐         │
│         │                 │         │
│         │  [Illustration] │         │  ← horizontal swipe carousel
│         │                 │         │     3 slides
│         └─────────────────┘         │
│                                     │
│   Slide title (heading.h2)          │
│   Slide description (body.md)       │
│                                     │
│   ● ○ ○                              │  ← dots indicator
│                                     │
│   [Bắt đầu]                          │
│   [Đăng nhập]                        │  ← text button
│   [Đổi ngôn ngữ vi/en/de]            │  ← link button bottom
└─────────────────────────────────────┘
```

**3 onboarding slides:**
1. **Tìm giải đấu** — illustration runner + map pins; copy: "Khám phá hàng trăm giải chạy khắp Việt Nam"
2. **Mua BIB nhanh chóng** — illustration phone + ticket QR; copy: "Đăng ký 3 bước, thanh toán an toàn"
3. **Theo dõi kết quả** — illustration trophy + chart; copy: "Xem kết quả + tải certificate ngay khi giải kết thúc"

**Components used:**
- Carousel (swipeable, paginated dots) — designer chọn lib hoặc native ScrollView horizontal
- Button primary `lg` "Bắt đầu"
- Button ghost `md` "Đăng nhập"
- Link button bottom "Đổi ngôn ngữ"

**All States:**
| State | Spec |
|-------|------|
| Initial | Slide 1 active, dot 1 filled |
| Mid-swipe | Smooth scroll transition, dots animate |
| Last slide reached | "Bắt đầu" CTA highlighted (primary button as is, no special) |
| Language picker open | Bottom sheet với 3 options vi/en/de + check icon on current |

**Actions:**
| User action | Result |
|-------------|--------|
| Swipe left/right | Change slide |
| Tap "Bắt đầu" | Navigate `/(auth)/register` |
| Tap "Đăng nhập" | Navigate `/(auth)/login` |
| Tap "Đổi ngôn ngữ" | Open bottom sheet language picker |
| Select language | Save preference, reload i18n, dismiss sheet |

**Data binding:** static content, i18n strings từ `@5bib/sdk/i18n` keys `onboarding.slide1.title`, …
**Side effects:** Khi tap "Bắt đầu" hoặc "Đăng nhập" → `SecureStore.setItem('first_launch_done', 'true')`
**Edge cases:**
- App killed mid-onboarding → next launch show lại (flag chưa set)
- User skip onboarding → flag set on `Đăng nhập` tap too

**Accessibility:**
- Swipe gesture có alternative: tap dots to navigate slides
- VoiceOver: announce slide N of 3 + content
- Buttons có accessibilityLabel rõ ràng

---

### S-AUTH-02: Login

**Route:** `/(auth)/login`
**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←                                    │  ← back arrow (only if from Welcome)
├─────────────────────────────────────┤
│                                     │
│      [5BIB Logo 64x64]              │
│                                     │
│      Chào mừng trở lại              │  ← heading.h1
│      Đăng nhập để tiếp tục          │  ← body.md neutral.600
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Email                       │   │  ← input lg
│   │ [📧] you@example.com        │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Mật khẩu                    │   │
│   │ [🔒] ••••••••       [👁]    │   │  ← input password với toggle
│   └─────────────────────────────┘   │
│                                     │
│                  [Quên mật khẩu?]   │  ← link button right
│                                     │
│   [Đăng nhập]                        │  ← primary button lg full
│                                     │
│   ─── hoặc ───                       │  ← divider with text
│                                     │
│   [G  Tiếp tục với Google]           │  ← outline button + Google logo
│   [  Tiếp tục với Apple]             │  ← outline button + Apple logo (iOS only)
│                                     │
│                                     │
│   Chưa có tài khoản? [Đăng ký ngay] │  ← bottom link
└─────────────────────────────────────┘
```

**Form fields:**
| Field | Label VN | Type | Required | Validation | Error message |
|-------|----------|------|----------|------------|---------------|
| `email` | Email | email | ✅ | BR-AUTH-01 (regex + max 254) | "Email không hợp lệ" |
| `password` | Mật khẩu | password | ✅ | min 8 chars | "Mật khẩu tối thiểu 8 ký tự" |

**Buttons:**
| Label | Position | Default | Disabled | Loading | Action | Confirm? |
|-------|----------|---------|----------|---------|--------|----------|
| "Đăng nhập" | Below password | Primary lg full | Khi 2 field empty hoặc invalid | Spinner + "Đang đăng nhập..." | `POST {API}/login` | NO |
| "Quên mật khẩu?" | Right under password | Ghost sm | KHÔNG | N/A | Navigate `/(auth)/forgot-password` | NO |
| "Tiếp tục với Google" | Below divider | Outline lg full + Google G icon | KHÔNG | Spinner inline | Native Google Sign-In flow → `POST {API}/auth/google/login` | NO |
| "Tiếp tục với Apple" (iOS only) | Below Google | Outline lg full + Apple icon (black filled) | KHÔNG | Spinner inline | Native Apple Sign-In flow → `POST {API}/auth/apple/login` | NO |
| "Đăng ký ngay" | Bottom link | Ghost md | KHÔNG | N/A | Navigate `/(auth)/register` | NO |
| Back arrow | Top-left | Default | KHÔNG | N/A | Navigate back to Welcome | NO |

**All States:**
| State | Spec |
|-------|------|
| Initial | Form empty, primary CTA disabled, Google/Apple buttons enabled |
| Typing email | If valid format, no inline check (validate on blur or submit) |
| Email invalid (blur) | Email field border red, helper "Email không hợp lệ" red |
| Password too short (blur) | Password field border red, helper "Mật khẩu tối thiểu 8 ký tự" |
| Both fields valid | Primary CTA enabled (brand.primary) |
| Submitting | CTA spinner + "Đang đăng nhập...", form disabled (inputs read-only) |
| Login success | CTA shows checkmark briefly (200ms) → navigate `/(tabs)/home` |
| Login fail 401 (wrong credentials) | Toast error red "Email hoặc mật khẩu sai", clear password field, focus password |
| Login fail 423 (locked) | Toast warning "Tài khoản tạm khóa, thử lại sau X phút" + countdown timer below CTA |
| Network offline | Banner top "Không có kết nối mạng" sticky, primary CTA disabled, retry on online |
| Google Sign-In flow | Native Google modal overlay, dismiss → back to login |
| Google success | Loading overlay → navigate home |
| Google cancelled by user | No error, just dismiss back to form |
| Google fail | Toast error "Đăng nhập Google thất bại, thử lại" |
| Apple Sign-In iOS | Native Apple modal, similar flow |
| Server 5xx | Toast "Có lỗi xảy ra, thử lại sau" + auto retry once |

**Components used:**
- Input email + password (with eye toggle for password)
- Button primary lg
- Button outline lg (Google, Apple)
- Divider with text "hoặc"
- Link button "Quên mật khẩu?", "Đăng ký ngay"
- Banner (offline state)
- Toast (errors)

**Data binding & Endpoints:**

#### `POST /login` (from `@5bib/sdk/services/user`)

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/login` |
| Auth | None (public) |
| Request body DTO | `LoginInput` (clean shape, SDK passes through) |
| Response DTO | `LoginResponse` (clean shape, SDK normalize từ legacy) |
| Status codes | 200 success / 400 validation / 401 wrong credentials / 423 locked / 429 too many requests / 500 server |
| Side effects | Save `token` to SecureStore, save `user` to Zustand `useAuthStore` |
| SDK normalize | **YES** — xem [overview SDK Normalization Strategy](01-ba-prd-overview.md#-sdk-normalization-strategy-danny-chốt-option-a-2026-05-25) |

**🔄 Normalization mapping (SDK FEATURE-002 implement):**

| Legacy backend response (current prod) | Clean SDK response (consumer dùng) |
|----------------------------------------|-------------------------------------|
| `user_id: number` | `user.id: string` (stringify) |
| `access_token: string` | `token: string` |
| `username: string` | `user.fullName: string` |
| `role: { id, name, newRolePermissions: [] }` | `user.role: string` (extract `role.name`) |
| `email: string \| null` | `user.email: string` |
| (not exists) | `user.avatar: string \| null` ← từ separate `/users/user-info` call lần đầu sau login |
| (not exists) | `user.locale: 'vi' \| 'en' \| 'de'` ← từ separate user-info call hoặc default `'vi'` |

**Lưu ý:** Backend `/login` KHÔNG return `avatar` + `locale`. SDK normalize có 2 options:
- (a) SDK auto-fire `GET /users/user-info` sau `/login` success để fetch full profile rồi merge → trả 1 response clean cho consumer
- (b) Mobile coder consume `LoginResponse` minimal (chỉ có id, email, fullName, role) → tự fire `getUserInfo()` để hydrate avatar + locale sau

**BA recommend Option (a)** — better DX cho mobile, less round-trip orchestration ở consumer. FEATURE-002 SDK detail sẽ confirm.

```typescript
// Clean SDK types (xem @5bib/sdk/models/auth):
interface LoginInput {
  email: string;     // BR-AUTH-01 validation
  password: string;  // BR-AUTH-02 validation
}

interface LoginResponse {
  token: string;
  refreshToken?: string;  // PAUSE-05 backend confirm có hay không
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;                 // vd: 'ROLE_NORMAL_USER', 'ROLE_ADMIN'
    avatar: string | null;        // hydrated từ /users/user-info nếu Option (a)
    locale: 'vi' | 'en' | 'de';   // hydrated từ /users/user-info nếu Option (a), default 'vi'
  };
}
```

#### `POST /auth/google/login`

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/auth/google/login` |
| Auth | None |
| Request (clean SDK input) | `{ idToken: string }` (from Google Sign-In SDK) |
| Backend legacy format | **query param** `?token=<idToken>`, body null — SDK adapter convert internally |
| Response | same `LoginResponse` (clean shape, normalized) |
| SDK normalize | YES — convert clean `{idToken}` → query `?token=...`; normalize response same as `/login` |

#### `POST /auth/apple/login` ⚠️ TD-008 NEW endpoint

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/auth/apple/login` |
| Auth | None |
| Request (clean SDK input) | `{ identityToken: string, fullName?: string }` (from Apple Sign-In SDK) |
| Backend format | TBD — Backend xây mới, BA recommend body JSON (cleaner than legacy query pattern) |
| Response | same `LoginResponse` (clean shape) |
| 🛑 PAUSE | Backend cần build endpoint này (TD-008 + PAUSE-06) — BA recommend backend dùng body JSON pattern thay vì query để consistent với industry standard |

#### `POST /forgot` — Request OTP

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/forgot` |
| Auth | None |
| Request (clean SDK input) | `{ email: string }` |
| Backend legacy format | **query param** `?email=<email>`, body null — SDK adapter convert internally |
| Response | 200 success (no body) |
| SDK normalize | YES — convert clean `{email}` → query `?email=...` |
| Status codes | 200 success / 400 validation / 404 email không tồn tại (cân nhắc anti-enumeration → 200 always) / 429 too many requests |

**Edge cases UX:**
- User paste password có space → trim trước validate
- User dùng password manager → KHÔNG block (iOS autofill, Android Smart Lock support)
- Email autofill từ keyboard suggestion → support
- Password show/hide toggle → eye icon click toggle visibility 5s rồi auto-hide (security)
- Keyboard cover form → scroll to focused field, keyboard avoiding view

**Accessibility:**
- Email input `accessibilityLabel="Email đăng nhập"`, `accessibilityHint="Nhập email đã đăng ký"`
- Password input `accessibilityLabel="Mật khẩu"`, eye toggle `accessibilityLabel="Hiện mật khẩu" / "Ẩn mật khẩu"`
- Login button announces loading state to screen reader
- Apple/Google buttons follow platform a11y guidelines (system handles)

---

### S-AUTH-03: Register

**Route:** `/(auth)/register`
**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Đăng ký                          │  ← header với back
├─────────────────────────────────────┤
│                                     │
│   Tạo tài khoản 5BIB                 │  ← heading.h2
│   Chỉ mất 30 giây                    │  ← body.md neutral.600
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Họ và tên *                 │   │
│   │ Nguyễn Văn A                │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Email *                     │   │
│   │ you@example.com             │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Số điện thoại (tuỳ chọn)    │   │
│   │ [+84] 9xx xxx xxx           │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Mật khẩu *                  │   │
│   │ ••••••••           [👁]     │   │
│   └─────────────────────────────┘   │
│   ▓▓▓▓░░░░ Trung bình                │  ← password strength meter
│                                     │
│   ☐ Tôi đồng ý với [Điều khoản]      │  ← checkbox
│     và [Chính sách bảo mật]         │     links inline
│                                     │
│   [Đăng ký]                          │  ← primary button lg
│                                     │
│   ─── hoặc ───                       │
│                                     │
│   [G  Đăng ký với Google]            │
│   [  Đăng ký với Apple] (iOS only)  │
│                                     │
│   Đã có tài khoản? [Đăng nhập]       │
└─────────────────────────────────────┘
```

**Form fields:**
| Field | Label | Type | Required | Validation | Error message | Default | Sent to backend? |
|-------|-------|------|----------|------------|---------------|---------|------------------|
| `fullName` | Họ và tên | text | ✅ | min 2, max 100, trim | "Vui lòng nhập họ tên (tối thiểu 2 ký tự)" | "" | ✅ SDK rename `fullName` → `name` cho backend |
| `email` | Email | email | ✅ | BR-AUTH-01 | "Email không hợp lệ" | "" | ✅ as-is |
| `password` | Mật khẩu | password | ✅ | BR-AUTH-02 | "Mật khẩu tối thiểu 8 ký tự, có chữ và số" | "" | ✅ as-is |
| `confirmPassword` | Nhập lại mật khẩu | password | ✅ | must equal `password` | "Mật khẩu nhập lại không khớp" | "" | ✅ as-is (backend require) |
| `agreeTerms` | Đồng ý điều khoản | checkbox | ✅ | must true | "Vui lòng đồng ý điều khoản" | false | ❌ **FRONTEND-ONLY** — KHÔNG gửi backend (chỉ gate UX) |

> **Note Phone field:** Backend `/register` endpoint KHÔNG có field phone. User update phone sau ở Edit Profile screen (S-PROFILE-02) qua `PUT /users/{id}`. Lý do: register flow keep tối thiểu friction (3 field bắt buộc + confirm + terms).

> **Note `isRunner` field:** Backend support optional `isRunner: boolean` flag — nếu cần expose toggle "Đăng ký như VĐV" trong UI → BA flag với Danny (Phase 2). MVP register: KHÔNG show, default backend behavior.

**Password strength meter (visual indicator):**
| Score | Label | Color |
|-------|-------|-------|
| 0-30% | "Yếu" | red |
| 30-60% | "Trung bình" | amber |
| 60-100% | "Mạnh" | green |

Tính score: length × 5 + (có chữ × 15) + (có số × 15) + (có ký tự đặc biệt × 20). Max 100.

**Buttons:**
| Label | Default | Disabled | Loading | Action |
|-------|---------|----------|---------|--------|
| "Đăng ký" | Primary lg full | Khi any required field invalid HOẶC agreeTerms false | Spinner + "Đang đăng ký..." | `POST {API}/register` |
| "Đăng nhập" link bottom | Ghost | KHÔNG | N/A | Navigate `/(auth)/login` (replace, not push) |
| "Điều khoản" link inline | Ghost xs | KHÔNG | N/A | Open WebView `5bib.com/terms` |
| "Chính sách bảo mật" link inline | Ghost xs | KHÔNG | N/A | Open WebView `5bib.com/privacy` |

**All States:**
| State | Spec |
|-------|------|
| Initial | Form empty, primary CTA disabled, checkbox unchecked |
| Field validation realtime on blur | Field border red + helper red if invalid |
| All fields valid + checkbox checked | Primary CTA enabled |
| Submitting | CTA spinner + form disabled |
| Success 201 | Toast green "Đăng ký thành công! Đang đăng nhập..." → auto login → navigate `/(tabs)/home` |
| Email duplicate 409 | Toast error "Email đã tồn tại" + show banner with CTA "Đăng nhập với email này?" → tap navigate Login with email pre-filled |
| Phone duplicate 409 | Toast "Số điện thoại đã được dùng" |
| Validation 400 backend | Map field errors → show inline below each field |
| Network offline | Same as Login |
| Google Sign-In | Same as Login (Google flow creates account auto if new) |

**Endpoint `POST /register` (from `@5bib/sdk/services/user`):**

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/register` |
| Auth | None |
| Request (clean SDK input) | `RegisterInput` (xem code block dưới) |
| Backend legacy format | `{ name: <fullName>, email, password, confirmPassword, isRunner? }` — SDK rename `fullName` → `name` |
| Response | `LoginResponse` (clean, normalized — auto-login flow) |
| Status codes | 201 success / 400 validation / 409 duplicate email |
| SDK normalize | YES — rename request fields + normalize response |
| Side effect | Save token + user to SecureStore + Zustand |

```typescript
// Clean SDK input (consumer dùng):
interface RegisterInput {
  fullName: string;        // SDK rename → backend `name`
  email: string;
  password: string;
  confirmPassword: string; // Backend REQUIRES this field
  isRunner?: boolean;      // Optional — defer Phase 2 UI toggle
  // `agreeTerms` KHÔNG có trong input — frontend chỉ dùng gate UX, KHÔNG gửi backend
}

// Mobile coder side (apps/mobile):
const onSubmit = async (form: { fullName, email, password, confirmPassword, agreeTerms }) => {
  if (!form.agreeTerms) {
    toast.error('Vui lòng đồng ý điều khoản');
    return;
  }
  // KHÔNG gửi agreeTerms vào SDK call
  const result = await sdk.user.register({
    fullName: form.fullName,
    email: form.email,
    password: form.password,
    confirmPassword: form.confirmPassword,
  });
  // result là LoginResponse (clean shape, normalized)
};
```

**Validation rules (zod schema `@5bib/sdk/validations/auth`):**
- `fullName`: min 2, max 100, trim
- `email`: BR-AUTH-01 regex + max 254
- `password`: BR-AUTH-02 (min 8 + ít nhất 1 chữ + 1 số)
- `confirmPassword`: must equal `password` (zod refine rule)
- `isRunner?`: optional boolean (Phase 2)

**Note phone:** Backend `/register` KHÔNG có field phone. Mobile sẽ update phone sau ở screen S-PROFILE-02 (Edit Profile) qua `PUT /users/{id}`. Vì vậy 409 duplicate response chỉ là duplicate email (KHÔNG duplicate phone).

**Edge cases UX:**
- User scroll lên check Terms after fill form → keyboard dismiss tự động
- Auto-fill suggest từ iCloud Keychain (iOS) / Google Smart Lock — KHÔNG block
- User tap Terms link mid-form → navigate WebView → back → form state preserved

---

### S-AUTH-04: Forgot Password

**Route:** `/(auth)/forgot-password`
**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Quên mật khẩu                    │
├─────────────────────────────────────┤
│                                     │
│      [Email illustration icon.2xl]  │
│                                     │
│   Khôi phục mật khẩu                 │  ← heading.h2
│   Nhập email, chúng tôi sẽ gửi      │  ← body.md
│   mã OTP để đặt lại mật khẩu        │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Email                       │   │
│   │ you@example.com             │   │
│   └─────────────────────────────┘   │
│                                     │
│   [Gửi mã OTP]                       │  ← primary lg full
│                                     │
│   [Quay lại đăng nhập]               │  ← ghost md
│                                     │
└─────────────────────────────────────┘
```

**Form fields:**
| Field | Validation | Error |
|-------|------------|-------|
| `email` | BR-AUTH-01 | "Email không hợp lệ" |

**States:**
| State | Spec |
|-------|------|
| Initial | Form empty, CTA disabled |
| Email valid | CTA enabled |
| Submitting | Spinner + "Đang gửi mã..." |
| Success 200 | Toast green "Đã gửi mã OTP đến your@email" → navigate `/(auth)/reset-password?email=...` |
| Email không tồn tại 404 | Toast "Email chưa đăng ký" (KHÔNG leak xem có account hay không nếu Danny muốn anti-enumeration → đổi sang generic "Đã gửi mã nếu email tồn tại") |
| 429 too many requests | Toast warning "Quá nhiều yêu cầu, thử lại sau N phút" + countdown |

**Endpoint `POST /forgot` (from `@5bib/sdk/services/user`):**
```typescript
class ForgotDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}
// Response: 200 always (anti-enumeration recommend) hoặc 404 nếu reveal
```

---

### S-AUTH-05: Reset Password (OTP + new password)

**Route:** `/(auth)/reset-password?email=...`
**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Đặt lại mật khẩu                 │
├─────────────────────────────────────┤
│                                     │
│   Nhập mã OTP                        │  ← heading.h2
│   Mã OTP đã gửi đến your@email      │  ← body.sm
│                                     │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │  ← OTP 6 boxes
│   │  │ │  │ │  │ │  │ │  │ │  │    │
│   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│                                     │
│   Gửi lại mã sau 60s                 │  ← countdown
│                                     │
│   ─────────────────────────────────  │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Mật khẩu mới                │   │
│   │ ••••••••           [👁]     │   │
│   └─────────────────────────────┘   │
│   ▓▓▓▓░░░░ Trung bình                │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Nhập lại mật khẩu           │   │
│   │ ••••••••           [👁]     │   │
│   └─────────────────────────────┘   │
│                                     │
│   [Đặt lại mật khẩu]                 │  ← primary lg full
│                                     │
└─────────────────────────────────────┘
```

**Form fields:**
| Field | Type | Validation | Error |
|-------|------|------------|-------|
| `otp` | OTP 6 digit | numeric, exactly 6 | "Mã OTP phải 6 chữ số" |
| `newPassword` | password | BR-AUTH-02 | "Mật khẩu tối thiểu 8 ký tự, có chữ và số" |
| `confirmPassword` | password | must equal `newPassword` | "Mật khẩu nhập lại không khớp" |

**States:**
| State | Spec |
|-------|------|
| Initial | OTP empty, password empty, countdown 60s active, "Gửi lại" disabled |
| OTP autofill SMS | iOS suggests OTP from SMS, tap to auto-fill all 6 boxes |
| OTP all 6 filled | Auto move focus to new password field |
| Countdown reach 0 | "Gửi lại mã" enabled (color brand.primary, clickable) |
| Resend tapped | `POST {API}/forgot` again, restart countdown |
| All valid | Primary CTA enabled |
| Submitting | Spinner + "Đang đặt lại..." |
| Success 200 | Toast green "Đặt lại mật khẩu thành công!" → navigate `/(auth)/login` với email pre-filled |
| OTP sai 400 | OTP boxes border red, helper "Mã OTP không đúng", clear OTP for retry |
| OTP expired | "Mã OTP đã hết hạn, vui lòng gửi lại" + force enable Resend |

**Endpoint `POST /reset` (from `@5bib/sdk/services/user`):**

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/reset` |
| Auth | None |
| Request (clean SDK input) | `ResetInput` (xem code block) |
| Backend legacy format | `{ otp, email, new_password, new_password_confirm }` — SDK rename camelCase → snake_case |
| Response | 200 success (no body) |
| Status codes | 200 / 400 (validation or wrong OTP) / 410 (OTP expired) |
| SDK normalize | YES — rename `newPassword` → `new_password`, `newPasswordConfirm` → `new_password_confirm` |

```typescript
// Clean SDK input (consumer dùng):
interface ResetInput {
  email: string;                // BR-AUTH-01 regex
  otp: string;                  // exactly 6 digits
  newPassword: string;          // BR-AUTH-02 (min 8 + chữ + số)
  newPasswordConfirm: string;   // must equal newPassword (BR-AUTH-16, validation client-side trước khi call SDK)
}

// SDK normalize internally:
// → backend gets: { otp, email, new_password: input.newPassword, new_password_confirm: input.newPasswordConfirm }
```

**BR-AUTH-16 (NEW):** `newPasswordConfirm` MUST equal `newPassword` — validation client-side. Nếu mismatch → block submit, KHÔNG call SDK. Error message: "Mật khẩu nhập lại không khớp".

**Form field ResetForm (mobile S-AUTH-05):**

| Field | Label | Type | Required | Validation | Error message |
|-------|-------|------|----------|------------|---------------|
| `otp` | Mã OTP | numeric segmented 6 boxes | ✅ | regex `^[0-9]{6}$` | "Mã OTP phải 6 chữ số" |
| `newPassword` | Mật khẩu mới | password | ✅ | BR-AUTH-02 | "Mật khẩu tối thiểu 8 ký tự, có chữ và số" |
| `newPasswordConfirm` | Nhập lại mật khẩu mới | password | ✅ | must equal `newPassword` (BR-AUTH-16) | "Mật khẩu nhập lại không khớp" |

---

### S-AUTH-08: Logout confirm (dialog)

Triggered from S-PROFILE-01 "Đăng xuất" tap.

**Wireframe:** Native alert dialog
```
┌─────────────────────────────────────┐
│       Đăng xuất khỏi 5BIB?           │
│                                     │
│   Bạn sẽ cần đăng nhập lại để       │
│   xem ticket và đặt giải mới        │
│                                     │
│   [Huỷ]              [Đăng xuất]    │  ← red destructive
└─────────────────────────────────────┘
```

**Actions:**
| Tap | Result |
|-----|--------|
| Huỷ | Dismiss dialog, no change |
| Đăng xuất | `POST {API}/logout` (best effort, don't block on error) → clear SecureStore + Zustand → navigate `/(auth)/login` + clear nav stack |

---

### S-PROFILE-01: Profile view

**Route:** `/(tabs)/profile` (bottom tab)
**Wireframe:**
```
┌─────────────────────────────────────┐
│ Hồ sơ                                │  ← title large
├─────────────────────────────────────┤
│                                     │
│        ┌───────┐                     │
│        │ Avatar│  (96×96, circle)    │
│        └───────┘                     │
│                                     │
│      Nguyễn Văn A                   │  ← heading.h2 center
│      a@example.com                  │  ← body.md neutral.600
│      +84 912 345 678                │  ← body.md
│                                     │
│      [Chỉnh sửa hồ sơ]               │  ← outline md
│                                     │
│   ─────────────────────────────────  │
│                                     │
│   Cài đặt                            │  ← section header
│                                     │
│   🌐 Ngôn ngữ           Tiếng Việt > │  ← list item
│   🔔 Thông báo                    > │
│   🔒 Quyền riêng tư               > │
│   ℹ️ Về 5BIB                       > │
│   ⭐ Đánh giá ứng dụng              > │
│                                     │
│   ─────────────────────────────────  │
│                                     │
│   [Đăng xuất]                        │  ← outline lg red full
│                                     │
│   v2.0.0 (build 1)                   │  ← caption neutral.400
└─────────────────────────────────────┘
```

**Components:**
- Avatar circle 96 with edit pencil overlay (small, bottom-right)
- List items với leading icon + label + trailing chevron + optional value text
- Destructive outline button (logout)
- Version footer (caption)

**All States:**
| State | Spec |
|-------|------|
| Loading (first mount) | Skeleton avatar + skeleton text lines, list section skeleton too |
| Loaded data | Render all fields |
| Empty avatar | Default placeholder avatar (initials "NA" from fullName trên neutral.200 background) |
| Refresh (pull-to-refresh) | Native refresh indicator brand.primary |
| Error fetch profile | Use cached data (Zustand persist) + small banner top "Không thể cập nhật, dùng dữ liệu cũ" |
| Offline | Banner "Đang offline" + show cached |

**Data binding:**
- `GET {API}/users/user-info` → fill all fields
- Display fields: avatar URL, fullName, email, phone (if exists)

**Actions:**
| Tap | Result |
|-----|--------|
| Avatar | Open S-PROFILE-03 (avatar change bottom sheet) |
| "Chỉnh sửa hồ sơ" | Navigate `/profile/edit` |
| "Ngôn ngữ" | Open bottom sheet với 3 options vi/en/de + check current |
| "Thông báo" | Navigate `/settings/notifications` |
| "Quyền riêng tư" | Open WebView privacy page |
| "Về 5BIB" | Open about screen với version + credits |
| "Đánh giá ứng dụng" | Open native rate prompt (StoreReview API) |
| "Đăng xuất" | Show S-AUTH-08 confirm dialog |

---

### S-PROFILE-02: Edit Profile

**Route:** `/profile/edit`
**Wireframe:**
```
┌─────────────────────────────────────┐
│ ✕  Chỉnh sửa hồ sơ        [Lưu]    │  ← close + save trailing
├─────────────────────────────────────┤
│                                     │
│        ┌───────┐                     │
│        │ Avatar│  + edit icon       │
│        └───────┘                     │
│                                     │
│   Email                              │  ← readonly section
│   a@example.com (không thể đổi)     │
│                                     │
│   ─────────────────────────────────  │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Họ và tên *                 │   │
│   │ Nguyễn Văn A                │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Số điện thoại                │   │
│   │ [+84] 912 345 678           │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Ngày sinh                    │   │
│   │ 01/01/1990            [📅]   │   │  ← tap opens date picker
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Giới tính                    │   │
│   │ ◯ Nam  ◯ Nữ  ◯ Khác        │   │  ← radio group inline
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Địa chỉ                      │   │
│   │ [textarea 3 lines]           │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Form fields:**
| Field | Label | Type | Required | Validation |
|-------|-------|------|----------|------------|
| `email` | Email | readonly | — | — (BR-AUTH-11) |
| `fullName` | Họ và tên | text | ✅ | min 2, max 100 |
| `phone` | Số điện thoại | phone | ⚪ | BR-AUTH-10 |
| `dob` | Ngày sinh | date | ⚪ | < today, > 1900-01-01 |
| `gender` | Giới tính | radio | ⚪ | enum [male, female, other] |
| `address` | Địa chỉ | textarea | ⚪ | max 500 |

**Buttons:**
| Label | Position | State | Action |
|-------|----------|-------|--------|
| "Lưu" | Header trailing | Disabled until form dirty + valid; enabled brand.primary | `PUT {API}/users/{userId}` |
| "✕" close | Header leading | Always enabled | If dirty → confirm dialog "Bỏ thay đổi?"; if clean → back |

**All States:**
| State | Spec |
|-------|------|
| Initial (loaded) | Fill form từ user info, "Lưu" disabled (clean) |
| Form dirty | "Lưu" enabled |
| Field invalid (blur) | Field error inline + "Lưu" disabled cho field đó |
| Submitting | "Lưu" spinner + form disabled |
| Save success | Toast green "Cập nhật thành công" → back to S-PROFILE-01 + refetch |
| Save fail validation 400 | Map error to field |
| Save fail network | Toast + form remain dirty, allow retry |
| Date picker open | Native date picker (iOS spinner sheet / Android dialog), respect locale format |

---

### S-PROFILE-03: Change Avatar (Bottom Sheet)

Triggered from avatar tap in S-PROFILE-01 hoặc S-PROFILE-02.

**Wireframe:**
```
┌─────────────────────────────────────┐
│             ━━━━                    │
│  Đổi ảnh đại diện                    │  ← heading.h3
│  ─────────────────────────────────  │
│                                     │
│   [📷 Chụp ảnh mới]                  │  ← list item lg
│   [🖼  Chọn từ thư viện]             │
│   [🗑  Xoá ảnh hiện tại]            │  ← only show if avatar exists, red
│                                     │
│   [Huỷ]                              │  ← ghost button bottom
└─────────────────────────────────────┘
```

**Actions:**
| Tap | Result |
|-----|--------|
| Chụp ảnh mới | Request camera permission → open camera (`expo-image-picker.launchCameraAsync`) → after capture → crop 1:1 square → upload |
| Chọn từ thư viện | Request media library permission → open picker (`launchImageLibraryAsync`) → crop 1:1 → upload |
| Xoá ảnh | Confirm dialog "Xoá ảnh đại diện?" → `PUT {API}/users/{userId}` với `avatar: null` |
| Huỷ | Dismiss bottom sheet |

**Upload flow:**
1. After image selected + cropped
2. Resize max 1024×1024 (`expo-image-manipulator`) + compress 80% quality JPEG
3. Show upload progress overlay (spinner + "Đang tải lên... 45%")
4. `POST {API}/upload/avatar` multipart → returns avatar URL
5. `PUT {API}/users/{userId}` với `avatar: url`
6. Success: toast + refetch profile + dismiss sheet
7. Fail: toast "Tải ảnh thất bại, thử lại"

**Permission denied state:**
- Modal "5BIB cần quyền camera để chụp ảnh" + CTA "Mở cài đặt" (`Linking.openSettings()`)

---

### S-PROFILE-04: Settings (drill-down từ Profile)

**Sub-screens:**
- `/settings/language` — list 3 options vi/en/de
- `/settings/notifications` — toggle các loại push notification
- `/settings/about` — version, build, credits, links to legal pages

(Detail wireframe defer khi designer cần — pattern giống list items đã spec)

---

## 🧪 Test Cases TC-AUTH-XX

### TC-AUTH-01: Login Happy Path
| Element | Value |
|---------|-------|
| Method | POST |
| URL | `/login` |
| Headers | `Content-Type: application/json` |
| Body | `{"email":"valid@test.com","password":"Test1234"}` |
| Expected status | 200 |
| Expected body | `{"token":"<jwt>","user":{"id":"...","email":"valid@test.com","fullName":"...","avatar":null,"locale":"vi"}}` |
| Side effect | SecureStore.setItem('jwt_token', token); Zustand useAuthStore.setUser(user) |

### TC-AUTH-02: Login wrong password
| Element | Value |
|---------|-------|
| Method | POST URL `/login` |
| Body | `{"email":"valid@test.com","password":"WrongPass1"}` |
| Expected status | 401 |
| Expected body | `{"code":"INVALID_CREDENTIALS","message":"Email hoặc mật khẩu sai"}` |
| Side effect | Toast error, password field cleared, focus password |

### TC-AUTH-03: Login locked account (5 fail)
| Element | Value |
|---------|-------|
| Setup | Fail login 5 lần trong 15p |
| Body | `{"email":"valid@test.com","password":"correct"}` |
| Expected status | 423 |
| Expected body | `{"code":"ACCOUNT_LOCKED","retryAfterSeconds":900}` |
| UI | Toast + countdown timer 15:00 → 14:59 → ... |

### TC-AUTH-04: Login validation fail email
| Body | `{"email":"not-email","password":"Test1234"}` |
| Expected status | 400 |
| UI | Inline error "Email không hợp lệ", CTA disabled |

### TC-AUTH-05: Login network offline
| Setup | Airplane mode |
| UI | Banner top "Không có kết nối mạng", CTA disabled. On reconnect → auto enable CTA |

### TC-AUTH-06: Google Sign-In success
| Setup | Mock Google SDK returns idToken |
| API call | `POST /auth/google/login {idToken}` → 200 |
| Expected | Same flow as login success |

### TC-AUTH-07: Google Sign-In user cancel
| Setup | User dismiss Google modal |
| Expected | No API call, no error, back to login form |

### TC-AUTH-08: Apple Sign-In iOS (PAUSE-06 backend ready)
| Setup | Mock Apple SDK returns identityToken |
| API call | `POST /auth/apple/login {identityToken,fullName?}` → 200 |
| Expected | Login flow success |

### TC-AUTH-09: Register happy path
| Body | `{"fullName":"Nguyễn Văn A","email":"new@test.com","phone":"0912345678","password":"Test1234","agreeTerms":true}` |
| Expected status | 201 |
| Expected body | `LoginResponseDto` (auto-login) |

### TC-AUTH-10: Register duplicate email
| Body | `{...email:"existing@test.com"...}` |
| Expected status | 409 |
| Expected body | `{"code":"EMAIL_EXISTS","message":"Email đã tồn tại"}` |
| UI | Toast + banner with CTA "Đăng nhập với email này?" |

### TC-AUTH-11: Forgot password — email exists
| Body | `{"email":"exists@test.com"}` |
| Expected status | 200 |
| Side effect | Backend sends OTP email |

### TC-AUTH-12: Reset password — wrong OTP
| Body | `{"email":"exists@test.com","otp":"000000","newPassword":"NewPass123"}` |
| Expected status | 400 |
| Expected body | `{"code":"INVALID_OTP"}` |
| UI | OTP boxes red, clear for retry |

### TC-AUTH-13: Reset password — OTP expired
| Setup | OTP > 5 min old |
| Expected status | 410 |
| UI | "Mã OTP hết hạn" + force enable Resend |

### TC-AUTH-14: Edit profile happy path
| Method | PUT `/users/{userId}` |
| Headers | `Authorization: Bearer <token>` |
| Body | `{"fullName":"Updated Name","phone":"0987654321","dob":"1990-01-01","gender":"male","address":"..."}` |
| Expected status | 200 |
| Side effect | Refetch user info, update Zustand store |

### TC-AUTH-15: Edit profile — IDOR attempt
| Setup | User A token, PUT `/users/{userBId}` |
| Expected status | 403 |
| Expected body | `{"code":"FORBIDDEN"}` |

### TC-AUTH-16: Avatar upload happy path
| Method | POST `/upload/avatar` |
| Headers | `Authorization: Bearer <token>`, `Content-Type: multipart/form-data` |
| Body | FormData with file field, image 800×800 JPEG 250KB |
| Expected status | 200 |
| Expected body | `{"url":"https://cdn.5bib.com/avatars/xxx.jpg"}` |

### TC-AUTH-17: Avatar upload — file too large
| Body | FormData with 10MB image |
| Expected | Frontend reject before upload với toast "Ảnh tối đa 5MB" |

### TC-AUTH-18: Logout
| Method | POST `/logout` |
| Headers | `Authorization: Bearer <token>` |
| Expected | 200 OR 401 (token already invalid) — both treat as success client-side |
| Side effect | Clear SecureStore, clear Zustand, navigate Login |

### TC-AUTH-19: JWT expired → auto force logout
| Setup | Token expired, app fires any authenticated request |
| Expected | Any 401 → Fetcher intercepts → force logout + toast "Phiên đăng nhập hết hạn" |
| Verify | All Zustand state cleared, nav stack reset to Login |

### TC-AUTH-20: First launch flow
| Setup | Fresh install, SecureStore empty |
| Expected | Splash → Welcome (onboarding 3 slides) → after "Bắt đầu" → Register |
| Side effect | After tap "Bắt đầu", SecureStore.setItem('first_launch_done', 'true') |

---

## 🛡️ Security checks

- [ ] Login endpoint rate limit (BR-AUTH-03 backend enforce)
- [ ] Token NEVER logged to console / Sentry breadcrumb
- [ ] Password field never logged
- [ ] OTP attempt counter (backend max 5 per OTP)
- [ ] Password reset OTP single-use (consume after success)
- [ ] HTTPS only — block HTTP in app.json `NSAppTransportSecurity`
- [ ] Avatar upload size check both frontend (5MB) and backend (10MB hard limit)
- [ ] PUT `/users/{userId}` enforce `userId == jwt.userId` HOẶC admin (IDOR)

---

## ⚡ Performance

| Action | Target |
|--------|--------|
| Login API → navigate Home | < 2s total |
| Profile fetch → render | < 800ms |
| Avatar upload (250KB) | < 5s on 4G |
| OTP input auto-fill SMS | iOS native |
| Splash → first screen | < 2s (cold start) |

---

## 🛑 PAUSE conditions (BA flag cho /5bib-plan)

- [ ] **PAUSE-05** (backend refresh token endpoint)
- [ ] **PAUSE-06** (backend Apple Sign-In endpoint)
- [ ] **PAUSE-13** (Apple review prep cho Apple Sign-In)
- [ ] **Asset SVG (Claude Design generate hoặc Coder source từ Lucide):**
  - 6 SVG avatar default placeholder (per gender + neutral) — initials fallback OK trong MVP
  - Illustration cho 3 Welcome slides + Forgot Password screen — có thể dùng undraw.co miễn phí
  - App logo 64×64 cho Login/Register headers — Danny cấp logo chính thức (PAUSE-brand)
- [ ] **PAUSE-brand:** Danny cấp brand asset: logo SVG/PNG (1x, 2x, 3x), exact `brand.primary` color hex từ logo, brand secondary color

---

## ✅ Status

- [x] DRAFT
- [x] READY (rev2 — fix 4 critical contract findings + Figma cleanup, Option A locked)

---

## 🔗 Next

- **Claude Design** consume file này → generate 11 screen TSX UI từ wireframe + states matrix
- **Coder** parallel prep SDK adapter + auth store + secure storage wrapper (sau khi FEATURE-002 deploy)
- **BA** đã xong Wave 1 — chờ Manager re-run `/5bib-plan` APPROVE → viết Wave 2 (EPIC-2/3/4/5)
