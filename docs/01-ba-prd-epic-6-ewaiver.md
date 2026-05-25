# FEATURE-003: EPIC-6 — E-Waiver (FINAL Wave 3)

**Status:** 🔵 READY (Wave 3 final — completes 6 EPIC set)
**Author:** 5bib-po-ba
**Wave:** 3 of 3 (FINAL)
**Linked:** [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md), [epic-1-auth](01-ba-prd-epic-1-auth.md), [epic-4-tickets](01-ba-prd-epic-4-tickets.md), [epic-5-result](01-ba-prd-epic-5-result.md)
**Audience:** Claude Design + Coder

---

## 📌 Pre-flight check

- [x] Wave 1 + Wave 2 đã APPROVED
- [x] Memory `architecture.md` + `known-issues.md` đã đọc (note pattern WebView external từ EPIC-5)
- [x] Spot-check `src/services/e-waiver/index.ts` + `src/app/[locale]/(pub)/e-waiver/page.tsx` + `components/*` để hiểu UX flow

**🔥 SPOT-CHECK FINDINGS QUAN TRỌNG:**

1. **Web E-Waiver là 3-step wizard** (info → OTP → result), **KHÔNG có canvas signature in-app**!
2. Web result step show list tickets với **external URL `sign_path`** — user tap → open external page (có thể Docusign hoặc 5BIB sign tool standalone) để **ký ở đó**
3. `signing-request` POST gửi body `{race_id, email}` → backend gửi OTP qua email
4. `signing-request-result` POST gửi body `{race_id, email, otp}` → backend trả `SigningRequestResultItem[]`
5. Response item có `disclaimer_status: boolean` (đã ký chưa) + `sign_path: string` (URL external để ký)
6. Endpoint `/codes/skip-liability-code` (auth required, từ ticket service) check 1 BIB cụ thể đã ký chưa
7. Endpoint `pub/aggree-skip-liability/{code}` (POST HTML body) là **callback từ external sign page** — mobile KHÔNG direct call

→ **EPIC-6 mobile = 3-step discovery wizard + WebView wrapper cho external sign**. KHÔNG cần `react-native-signature-canvas`.

---

## 🚨 SCOPE REVISION 2026-05-25 (Sau spot-check)

> **Original Manager hand-off:** "S-WAIVER-03: Canvas signature + submit" với `react-native-signature-canvas`
> **Reality (sau spot-check):** Web KHÔNG có canvas signature. Việc ký thực sự xảy ra ở `sign_path` external URL.
> **Revised:** EPIC-6 = 3-step discovery + WebView wrapper external sign URL. **GIẢM scope** thêm 1 lib unused.

**Saving:** không cần `react-native-signature-canvas` dependency (giảm ~500KB bundle + tránh native crash risk).

**Design-system #19 Signature Pad component** → DEFER Phase 2 (nếu sau này backend đổi flow để in-app signing).

---

## 🎯 EPIC-6 Goal

Cho phép Athlete (hoặc người đại diện) **tìm các BIB tickets cần ký E-Waiver** trong app và mở **external sign page** qua WebView in-app để ký. Đây là pre-race compliance step bắt buộc bởi BTC.

## 📦 Scope EPIC-6

| Screen ID | Screen Name | Route | Auth |
|-----------|------------|-------|------|
| S-WAIVER-01 | Step 1: Chọn giải + Nhập email | `/e-waiver` | Optional (anon OK — tìm by email) |
| S-WAIVER-02 | Step 2: Nhập OTP | (same route, step=1) | Optional |
| S-WAIVER-03 | Step 3: Result list + Sign action | (same route, step=2) | Optional |
| S-WAIVER-04 | WebView Sign Wrapper | `/e-waiver/sign?url=X` | Optional |

---

## 👤 User Stories

- **US-WAIVER-01:** As an **Athlete**, I want to **ký E-Waiver cho BIB của tôi** so that compliance với BTC, được phép tham gia race.
- **US-WAIVER-02:** As an **Athlete đại diện**, I want to **tìm BIB của người tôi đăng ký hộ** và **ký waiver thay cho họ** so that họ không phải có app vẫn race được (vd: ký cho con < 18).
- **US-WAIVER-03:** As an **Athlete**, I want to **xem trạng thái đã ký hay chưa** so that biết còn cần action nào.
- **US-WAIVER-04:** As an **Athlete**, I want to **nhận OTP qua email + autofill** so that input nhanh trên mobile.
- **US-WAIVER-05:** As an **Athlete**, I want to **mở waiver từ email link** so that 1 tap từ email mở app + skip nhập email.
- **US-WAIVER-06:** As an **Athlete**, I want to **ký waiver từ ticket detail** so that không phải lặp nhập email + race.

---

## 📜 Business Rules (BR-WAIVER-XX)

| ID | Business Rule |
|----|--------------|
| BR-WAIVER-01 | E-Waiver flow public (KHÔNG cần login). User authenticate qua email + OTP để chứng minh ownership BIB. |
| BR-WAIVER-02 | OTP 6 digit numeric, gửi qua email. Expire 5 phút. Resend allow 1 lần / 60s (giống BR-AUTH-07). |
| BR-WAIVER-03 | OTP fail 5 lần liên tiếp → backend lock 15 phút theo email. |
| BR-WAIVER-04 | Result step trả `SigningRequestResultItem[]` — tất cả tickets của email đó cho race đó. Có thể nhiều tickets (vd: user đăng ký hộ nhiều người). |
| BR-WAIVER-05 | Mỗi ticket trong result hiển thị `disclaimer_status`: **đã ký** (badge green "Đã ký") hoặc **chưa ký** (button "Ký ngay" mở WebView `sign_path`). |
| BR-WAIVER-06 | WebView sign page restrict navigation: chỉ whitelist domain backend confirm (chưa biết — PAUSE flag). External link tap → block + warning. |
| BR-WAIVER-07 | Sau khi user ký xong ở WebView (external page redirect về 5bib.com domain với success flag) → app close WebView + reload result list để update status. |
| BR-WAIVER-08 | Entry point từ ticket detail (S-TICKETS-02 EPIC-4) → pre-fill race + email từ ticket context, **skip step 1** → đi thẳng OTP step (vì user đã authenticated, biết race và email). |
| BR-WAIVER-09 | Deep link `bib5://e-waiver?code=ABC` → app call `GET /codes/skip-liability-code?code_value=ABC` (auth) → fetch race + email từ ticket → pre-fill + skip step 1. |
| BR-WAIVER-10 | Anonymous deep link (chưa login + có code) → fallback: navigate to S-WAIVER-01 với code prefilled trong URL state, user manual nhập email + race. |
| BR-WAIVER-11 | Race dropdown trong S-WAIVER-01: fetch từ `POST /pub/signing-race-dropdown` — list các race đang mở signing. Default select item đầu tiên. |
| BR-WAIVER-12 | Email validation BR-AUTH-01 (regex + max 254). Trim trước submit. |
| BR-WAIVER-13 | Offline: E-Waiver flow BLOCK với banner "Cần kết nối mạng để ký waiver". Lý do: mọi step đều cần API. |
| BR-WAIVER-14 | After all tickets in result signed → screen show full state "Đã hoàn tất ký waiver cho giải này" + CTA "Về trang chủ". |

---

## 🖥️ Per-Screen Spec

### S-WAIVER-01: Step 1 — Race + Email

**Route:** `/e-waiver`

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ← Ký E-Waiver                       │
├─────────────────────────────────────┤
│ ● Thông tin ─── ○ OTP ─── ○ Kết quả│  ← stepper 3 dots
├─────────────────────────────────────┤
│                                     │
│  Ký waiver cho giải đấu              │  ← heading.h2
│  Nhập email đăng ký BIB để nhận     │  ← body.md
│  mã OTP                              │
│                                     │
│  ── Chọn giải đấu ─────────────── │
│  ┌─────────────────────────────────┐│
│  │ Saigon Marathon 2026   [▾]      ││  ← race dropdown
│  └─────────────────────────────────┘│
│                                     │
│  ── Email đăng ký ──────────────── │
│  ┌─────────────────────────────────┐│
│  │ Email *                          ││
│  │ you@example.com                  ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│  [Gửi mã OTP]                        │  ← primary lg full sticky
└─────────────────────────────────────┘
```

**Form fields:**

| Field | Label | Type | Required | Validation | Error message |
|-------|-------|------|----------|------------|---------------|
| `raceId` | Giải đấu | dropdown (bottom sheet picker) | ✅ | from `fetchSigningRaceDropdown()` result | "Vui lòng chọn giải đấu" |
| `email` | Email | email | ✅ | BR-AUTH-01 + max 254, trim | "Email không hợp lệ" |

**Buttons:**

| Label | Position | Default state | Disabled state | Loading state | Action | Confirm? |
|-------|----------|---------------|----------------|---------------|--------|----------|
| "Gửi mã OTP" | Sticky bottom | Primary lg full | Khi race chưa chọn HOẶC email invalid | Spinner + "Đang gửi mã..." | `POST /pub/signing-request` | NO |
| Back arrow | Header leading | Default | KHÔNG | N/A | Pop screen | NO |
| Race dropdown | Field area | Outline với chevron | Disabled khi loading races | Skeleton trong dropdown | Open bottom sheet picker | NO |

**All States:**

| State | Spec |
|-------|------|
| Initial | Loading races list từ API → show skeleton dropdown |
| Races loaded | Default first race selected, email empty, CTA disabled |
| Race fetch fail | Show error inline trong dropdown area "Không tải được giải, thử lại" + retry button |
| Email typing | KHÔNG validate real-time, validate on blur HOẶC submit |
| Email valid + race selected | CTA enabled |
| Email invalid blur | Field border red + helper "Email không hợp lệ" |
| Submitting | CTA spinner, form disabled |
| OTP sent success | Toast green "Đã gửi mã OTP đến your@email" → navigate step 2 (S-WAIVER-02) |
| Email không có ticket cho race này | Toast error "Email này không có BIB nào trong giải đã chọn" |
| Rate limit (429) | Toast warning "Quá nhiều yêu cầu, thử lại sau N phút" + countdown |
| Network offline | Banner top "Cần kết nối mạng" + CTA disabled |

**Components:** Header, Stepper (3 dots), Heading + Description, Dropdown (bottom sheet race picker), Input email, Sticky CTA, Toast, Banner

**Actions:**

| # | User action | UI behavior | Trigger | Next state |
|---|-------------|-------------|---------|------------|
| 1 | Tap race dropdown | Open bottom sheet với race list | Modal | Picker open |
| 2 | Select race | Update selectedRaceId, dismiss sheet | onSelect | Form has race |
| 3 | Type email | onChange update state | Input | — |
| 4 | Blur email | Validate, show error if invalid | onBlur | Field state |
| 5 | Tap "Gửi mã OTP" | Validate all → `POST /pub/signing-request` → step 2 | API | Loading → Success |
| 6 | Tap back ← | Confirm if any field dirty? No → pop screen | Navigation | Previous screen |

**Data binding:**

| UI Field | Data source |
|----------|------------|
| Race dropdown options | `POST /pub/signing-race-dropdown` body `{pageNo:1, pageSize:100}` |
| Selected race | Local state |
| Email value | Local state |

**Endpoint `POST /pub/signing-race-dropdown`:**

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/pub/signing-race-dropdown` |
| Auth | None (public) |
| Request body | None (params via query) |
| Backend legacy | query `?pageNo=1&pageSize=100`, body `undefined` |
| Response (clean SDK) | `{ items: SigningRace[] }` (normalize từ `response.data.content`) |
| Status codes | 200 / 500 |
| SDK normalize | YES — wrap legacy `{data:{content:[]}, success}` → clean `{items: [...]}` |

```typescript
interface SigningRaceDropdownInput {
  pageNo?: number;       // default 1
  pageSize?: number;     // default 100
}

interface SigningRaceDropdownResponse {
  items: SigningRace[];
}

interface SigningRace {
  raceId: string;        // SDK normalize: legacy `race_id: number` → string
  title: string;
}
```

**Endpoint `POST /pub/signing-request`:**

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/pub/signing-request` |
| Auth | None |
| Request body (clean SDK) | `{ raceId: string, email: string }` |
| Backend legacy | `{ race_id: number, email: string }` — SDK rename + parseInt |
| Response | `{ success: boolean, message?: string }` |
| Status codes | 200 success / 400 invalid input / 404 email không có ticket / 429 rate limit / 500 |
| SDK normalize | YES — rename request fields |

```typescript
interface SigningRequestInput {
  raceId: string;
  email: string;
}

interface SigningRequestResponse {
  success: boolean;
  message?: string;
}
```

---

### S-WAIVER-02: Step 2 — OTP Input

**Route:** same `/e-waiver` (UI state step=1)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ← Ký E-Waiver                       │
├─────────────────────────────────────┤
│ ● ─── ● OTP ─── ○                  │  ← stepper progress
├─────────────────────────────────────┤
│                                     │
│  Nhập mã OTP                         │  ← heading.h2
│  Mã đã gửi đến you@example.com      │  ← body.sm
│  cho giải Saigon Marathon 2026      │
│                                     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │  ← OTP 6 boxes (xem design-system #3)
│  │  │ │  │ │  │ │  │ │  │ │  │    │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│                                     │
│  Gửi lại mã sau 60s                  │  ← countdown
│                                     │
│  [Quay lại]                          │  ← ghost — back to step 1
│                                     │
├─────────────────────────────────────┤
│  [Xác nhận]                          │  ← primary lg sticky (disabled until 6 digit)
└─────────────────────────────────────┘
```

**Form fields:**

| Field | Label | Type | Required | Validation | Error |
|-------|-------|------|----------|------------|-------|
| `otp` | Mã OTP | OTP 6 segmented boxes (numeric) | ✅ | regex `^[0-9]{6}$` | "Mã OTP phải 6 chữ số" |

**Buttons:**

| Label | Default | Disabled | Loading | Action |
|-------|---------|----------|---------|--------|
| "Xác nhận" | Primary lg sticky | Khi OTP < 6 digit | Spinner + "Đang xác minh..." | `POST /pub/signing-request-result` |
| "Quay lại" | Ghost md inline | KHÔNG | N/A | Step → 0, reset OTP |
| "Gửi lại mã" (link) | Text link disabled countdown | Until countdown = 0 | N/A | Re-call signing-request |

**All States:**

| State | Spec |
|-------|------|
| Initial | OTP boxes empty, countdown 60s, "Gửi lại" disabled, CTA disabled |
| OTP autofill iOS | iOS suggest OTP từ SMS → tap → all 6 boxes filled |
| OTP autofill Android | Android SMS Retriever auto-fill |
| OTP partial (1-5 digit) | CTA disabled |
| OTP all 6 filled | Auto-trigger Xác nhận OR enable CTA (BA preference: auto-submit để giảm tap) |
| Countdown ticking | "Gửi lại mã sau Ns" |
| Countdown = 0 | "Gửi lại mã" enabled, color brand.primary |
| Resend tapped | Call `signing-request` lại + restart countdown + clear OTP boxes + focus first box |
| Submitting | Spinner CTA, OTP boxes disabled |
| Success | Toast green "Xác minh thành công" → navigate step 3 |
| OTP sai | All boxes red border, helper "Mã OTP không đúng" + clear OTP for retry, focus first box |
| OTP hết hạn | Force enable Resend + show "Mã OTP đã hết hạn, vui lòng gửi lại" |
| Rate limit | Toast + disable form |
| Result rỗng | Toast "Email này không có BIB nào trong giải" → back to step 1 |

**Endpoint `POST /pub/signing-request-result`:**

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/pub/signing-request-result` |
| Auth | None |
| Request body (clean SDK) | `{ raceId: string, email: string, otp: string }` |
| Backend legacy | `{ race_id: number, email, otp }` |
| Response (clean SDK) | `{ items: SigningTicket[] }` (normalize từ `response.data: [...]`) |
| Status codes | 200 success / 400 OTP sai / 410 OTP expired / 500 |
| SDK normalize | YES |

```typescript
interface SigningRequestResultInput {
  raceId: string;
  email: string;
  otp: string;
}

interface SigningRequestResultResponse {
  items: SigningTicket[];
}

interface SigningTicket {
  id: string;                  // legacy number → string
  name?: string;
  email?: string;
  codeValue?: string;          // BIB secret code
  signPath?: string;           // external URL to sign — open in WebView
  disclaimerStatus: boolean;   // đã ký?
  athleteSubInfo?: {
    contactPhone?: string;
    dob?: string;
    disclaimerStatus?: boolean; // duplicate signal
  };
  courseInfo?: {
    raceName?: string;
    courseName?: string;
    ticketImage?: string;       // optional thumbnail URL
  };
}
```

---

### S-WAIVER-03: Step 3 — Result List + Sign Action

**Route:** same `/e-waiver` (UI state step=2)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ← Ký E-Waiver                       │
├─────────────────────────────────────┤
│ ● ─── ● ─── ● Kết quả              │
├─────────────────────────────────────┤
│ Saigon Marathon 2026                │  ← race title
│ 3 BIB tìm thấy                       │  ← count summary
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │  ← ticket card
│ │ [thumb 80×60] Saigon Marathon   │ │
│ │ Nguyễn Văn A - 5km              │ │
│ │ 📞 0912... · 🎂 01/01/1990      │ │
│ │ [⚠ Chưa ký]                      │ │
│ │ [Ký ngay →]                      │ │  ← primary button
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [thumb] Saigon Marathon         │ │
│ │ Trần Văn B - 10km                │ │
│ │ 📞 0987... · 🎂 02/02/1985      │ │
│ │ [✓ Đã ký]                        │ │  ← green badge
│ │ [Xem thông tin →]                │ │  ← outline button (đã ký)
│ └─────────────────────────────────┘ │
│                                     │
│ [Làm lại với email khác]            │  ← ghost bottom
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Loading (vào step 3) | Skeleton 2-3 ticket cards |
| Filled — chưa ký | Cards với "Chưa ký" badge + "Ký ngay" primary button |
| Filled — đã ký | Cards với "Đã ký" green badge + "Xem thông tin" outline button |
| Mixed (some signed, some not) | Mix above patterns |
| All signed | Full state: "🎉 Đã ký waiver đầy đủ" + CTA "Về trang chủ" |
| Empty list | "Không tìm thấy BIB nào" → tap "Làm lại với email khác" → back step 1 |
| Error fetch | Toast + retry button |
| Refresh after sign | Pull-to-refresh → re-call `signing-request-result` với cached OTP+email |
| Sign WebView opened | Loading WebView overlay |
| Sign success returned | Toast "Ký thành công" + refresh list → status update |

**Components:** Header, Stepper, Summary count, Ticket Card (custom với thumbnail + meta + badge + action button), Status Badge (success/warning), Pull-to-refresh, Empty State, Toast

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Tap "Ký ngay →" trên ticket chưa ký | Navigate S-WAIVER-04 với url = ticket.signPath |
| 2 | Tap "Xem thông tin →" trên ticket đã ký | Navigate S-WAIVER-04 với url = ticket.signPath (view-only mode handled by external page) |
| 3 | Tap ticket card body (non-button) | (no-op) hoặc highlight card |
| 4 | Pull-to-refresh | Re-fetch result với cached OTP+email + reset UI |
| 5 | Tap "Làm lại với email khác" | Reset step → 0, clear all state |
| 6 | Tap back ← | Confirm dialog "Thoát ký waiver?" → back |

**Data binding:**

| UI Field | Data source |
|----------|------------|
| Race title | From step 1 selectedRace.title |
| Count summary | `items.length` |
| Card thumbnail | `ticket.courseInfo.ticketImage` |
| Athlete name | `ticket.name` hoặc fallback "—" |
| Course name | `ticket.courseInfo.courseName` |
| Phone | `ticket.athleteSubInfo.contactPhone` |
| DOB | `ticket.athleteSubInfo.dob` |
| Status badge | `ticket.disclaimerStatus` (true=signed) |
| Sign URL | `ticket.signPath` |

**Edge cases UX:**
- `signPath` empty/null → button disabled với label "Liên hệ BTC" + helper text giải thích
- `ticketImage` URL fail load → placeholder gray
- User return from WebView nhưng external page chưa redirect chuẩn → manual pull-to-refresh để update status

---

### S-WAIVER-04: WebView Sign Wrapper

**Route:** `/e-waiver/sign?url=X&ticketId=Y`

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ✕   sign.5bib.com              [🔄]│  ← close + refresh (no share)
├─────────────────────────────────────┤
│ ▓▓▓▓░░░░░░░░░░░░ (loading bar)      │
├─────────────────────────────────────┤
│                                     │
│       [WebView full content]        │
│       (external sign page)          │
│                                     │
└─────────────────────────────────────┘
```

**Behavior:**

1. Mount với `url` từ query (= ticket.signPath)
2. **Whitelist enforce:** chỉ allow navigation trong:
   - Domain `signPath` extracted (host)
   - `5bib.com` + subdomain (cho redirect return)
   - 🛑 **PAUSE-EPIC6-01:** Backend confirm exact domain của sign page (chưa biết có phải Docusign, HelloSign, hay self-hosted)
3. **Detect sign success:** listen URL changes — nếu redirect về `5bib.com/e-waiver-success?ticketId=X` hoặc `bib5://e-waiver-success?ticketId=X` → close WebView + emit event SIGN_SUCCESS
4. **Detect cancel:** user tap ✕ → confirm dialog "Huỷ ký waiver?" → if confirm → close
5. **Timeout:** 30 phút idle → auto close + toast "Phiên ký hết hạn"
6. **Back button Android:** WebView goBack nếu có history; else confirm close
7. **Loading bar:** progress 0→100% top

**States:**
- Loading initial: progress bar + skeleton
- Loaded: full WebView
- Network error: full screen error + "Thử lại"
- Sign success detected: brief flash success → close + emit event
- User cancel: confirm dialog

**SDK / no API:** purely WebView. No mobile API call here.

---

## 🔀 Entry point variations

### A. Direct entry (anonymous user)
- Tap "Ký E-Waiver" từ menu / search → S-WAIVER-01 fresh

### B. From ticket detail (authenticated, EPIC-4 S-TICKETS-02)
- Tap "Ký E-Waiver" button → navigate `/e-waiver?prefill_race={raceId}&prefill_email={userEmail}&skip_step1=true`
- App: skip S-WAIVER-01 → directly to S-WAIVER-02 OTP (call `signing-request` automatically with prefilled values)
- Show breadcrumb-like "Ký waiver cho {raceName}"

### C. Deep link từ email (anonymous OR authenticated)
- User tap email link `https://5bib.com/e-waiver?code=ABC` (universal link → app opens) OR `bib5://e-waiver?code=ABC`
- App detect param `code`:
  - Nếu authenticated → call `GET /codes/skip-liability-code?code_value=ABC` (auth) → backend trả race + email → pre-fill + skip to OTP step
  - Nếu anonymous → fallback to S-WAIVER-01 với race + email empty (user nhập manual). Show banner "Đang ký waiver cho BIB {ABC}"

### D. Delegator scenario
- User đăng ký hộ cho người khác (vd: con < 18) — email trên ticket có thể là email user (parent) chứ không phải child
- Flow giống bình thường: user nhập email của parent → OTP đến email parent → ký
- BR-WAIVER-15 (NEW): nếu backend support flag `is_delegator: true` trong result → mobile hiển thị helper text "Bạn đang ký thay cho {child name}". Hiện tại web KHÔNG có signal này — assume bình thường.

---

## 🧪 Test Cases TC-WAIVER-XX

### TC-WAIVER-01: Fetch race dropdown happy path
| Method | POST `/pub/signing-race-dropdown?pageNo=1&pageSize=100` body undefined |
| Expected status | 200 |
| Expected body | `{items: SigningRace[]}` (clean shape) |
| MUST NOT leak | Internal `merchant_id`, `created_by`, raw `_id` |

### TC-WAIVER-02: Race dropdown empty (no race signing)
| Expected | 200 + `{items: []}` |
| UI | Dropdown disabled với placeholder "Không có giải nào đang ký waiver" |

### TC-WAIVER-03: Send OTP happy path
| Method | POST `/pub/signing-request` body `{raceId:"R1", email:"a@b.com"}` |
| Expected status | 200 + `{success: true, message: "..."}` |
| UI | Toast success + navigate step 2 |
| Side effect | Backend send OTP email |

### TC-WAIVER-04: Send OTP email không có ticket
| Body | `{raceId, email}` cho email không có BIB trong race |
| Expected | 200 + `{success: false, message: "Email này không có BIB"}` HOẶC 404 |
| UI | Toast error |

### TC-WAIVER-05: Send OTP invalid email format (client-side block)
| Behavior | Frontend validate before submit → CTA disabled |
| Expected | No API call fired |

### TC-WAIVER-06: Send OTP rate limit
| Setup | Send 5+ requests trong 15 phút |
| Expected | 429 + retry-after header |
| UI | Toast warning + countdown |

### TC-WAIVER-07: Verify OTP happy path
| Method | POST `/pub/signing-request-result` body `{raceId, email, otp: "123456"}` |
| Expected status | 200 + `{items: SigningTicket[]}` |
| UI | Toast success + navigate step 3 |

### TC-WAIVER-08: Verify OTP wrong code
| Body | `{otp: "000000"}` |
| Expected status | 400 + `{success: false, message: "OTP không đúng"}` |
| UI | OTP boxes red + clear for retry |

### TC-WAIVER-09: Verify OTP expired
| Setup | OTP > 5 min old |
| Expected status | 410 hoặc 400 với message expired |
| UI | "Mã OTP hết hạn" + force enable Resend |

### TC-WAIVER-10: Verify OTP returns empty (no tickets after success)
| Expected | 200 + `{items: []}` |
| UI | Toast "Email này không có BIB nào" + back to step 1 |

### TC-WAIVER-11: Result item disclaimer_status=true (đã ký)
| Verify UI | Badge "Đã ký" green + button "Xem thông tin" outline |

### TC-WAIVER-12: Result item disclaimer_status=false (chưa ký)
| Verify UI | Badge "Chưa ký" warning + button "Ký ngay" primary |

### TC-WAIVER-13: Sign WebView open + load
| Action | Tap "Ký ngay" |
| Expected | Navigate `/e-waiver/sign?url=<signPath>&ticketId=X` → WebView load `signPath` |

### TC-WAIVER-14: Sign WebView whitelist enforce
| Setup | External page link to `https://malicious.com` |
| Expected | Navigation blocked + warning toast |

### TC-WAIVER-15: Sign WebView success redirect detect
| Setup | External page redirect to `https://5bib.com/e-waiver-success?ticketId=X` |
| Expected | WebView closes + parent screen reload result + toast "Ký thành công" + ticket status update to "Đã ký" |

### TC-WAIVER-16: Sign WebView user cancel
| Action | Tap ✕ |
| Expected | Confirm dialog → if confirm → close |

### TC-WAIVER-17: Deep link cold start
| Setup | App killed + tap `https://5bib.com/e-waiver?code=ABC` |
| Expected | App opens → splash → auth check → call `getSkipLiabilityCode(ABC)` if authed → pre-fill + navigate step 2 |

### TC-WAIVER-18: Entry from ticket detail
| Setup | Authed user, on S-TICKETS-02, tap "Ký E-Waiver" |
| Expected | Navigate `/e-waiver?prefill_race=X&prefill_email=Y&skip_step1=true` → auto-fire signing-request → navigate step 2 |

### TC-WAIVER-19: Offline E-Waiver flow
| Setup | Airplane mode |
| Expected | All screens show banner "Cần kết nối mạng" + CTAs disabled |

### TC-WAIVER-20: All tickets signed state
| Setup | Result list, all `disclaimerStatus: true` |
| Expected | Full screen state "🎉 Đã ký waiver đầy đủ" + CTA "Về trang chủ" |

---

## 🛡️ Security checks

- [ ] OTP single-use (backend invalidate after 1 successful verify)
- [ ] OTP attempt counter (backend max 5 per OTP)
- [ ] Email enumeration: backend response phải consistent giữa "email có ticket" vs "email không có ticket" (anti-enumeration recommend) — defer Danny decide
- [ ] WebView restrict whitelist (BR-WAIVER-06)
- [ ] Deep link validate scheme + host before route
- [ ] `getSkipLiabilityCode` (auth) — IDOR check: user A KHÔNG fetch code của user B (PAUSE-EPIC6-02)
- [ ] Response KHÔNG leak: raw `_id`, internal merchant info

---

## ⚡ Performance SLA

| Metric | Target |
|--------|--------|
| Race dropdown fetch | < 1.5s p95 |
| Send OTP response | < 2s p95 (includes email send) |
| Verify OTP response | < 1.5s p95 |
| Step transition animation | < 300ms |
| WebView sign page load | < 4s p95 (depends external) |
| Pull-to-refresh result | < 1.5s p95 |

---

## 🛑 PAUSE Conditions

- [ ] **PAUSE-EPIC6-01:** Backend confirm domain của external sign page (`signPath`) — là Docusign? HelloSign? Self-hosted? Để whitelist WebView navigation.
- [ ] **PAUSE-EPIC6-02:** Backend confirm `signPath` redirect URL sau khi sign success — format `5bib.com/e-waiver-success?...` hay deep link `bib5://...` để detect close WebView?
- [ ] **PAUSE-EPIC6-03:** `getSkipLiabilityCode(code, accessToken)` response shape — confirm trả về race_id + email để pre-fill được? Verify khi SDK extract.
- [ ] **PAUSE-EPIC6-04:** Anti-enumeration cho `signing-request` — backend trả 200 always (security) hay differentiate 404 cho email không có ticket (UX)?
- [ ] **PAUSE-EPIC6-05:** OTP delivery channel — chỉ email hay có cả SMS? Web flow chỉ email. Mobile cần SMS không?
- [ ] **PAUSE-EPIC6-06:** Delegator scenario UX — backend có signal `is_delegator` trong result item không? Nếu có → mobile show helper text. Nếu không → assume bình thường.

## ✅ Status

- [x] DRAFT
- [x] READY (Wave 3 FINAL — completes 6 EPIC set)

---

## 🎯 EPIC-6 Summary

| Metric | Value |
|--------|-------|
| Screens | 4 (3 wizard steps + 1 WebView wrapper) |
| BR | 14 |
| TC | 20 |
| Endpoints | 3 (`signing-race-dropdown`, `signing-request`, `signing-request-result`) + 1 helper (`/codes/skip-liability-code`) |
| New dependencies | None (KHÔNG cần `react-native-signature-canvas`) |
| Coder effort estimate | ~2 ngày (3-step wizard + WebView wrapper) |
| PAUSE conditions raised | 6 (mostly backend clarify) |

---

## 🎉 PRD COMPLETE — 6 EPIC FINAL

| Wave | Files | Status |
|------|-------|--------|
| 1 | overview + design-system + epic-1-auth + epic-9-infra | ✅ APPROVED rev2 |
| 2 | epic-2-browsing + epic-3-checkout + epic-4-tickets + epic-5-result | ✅ READY |
| 3 | epic-6-ewaiver (THIS) | ✅ READY |

**Total scope mobile:** ~39 screens / 6 EPIC / ~115 BR / ~120 TC.

**DROPPED scope:** EPIC-7 Staff Check-in (3 screens) + EPIC-8 Content (5 screens) = 8 screens saved.
