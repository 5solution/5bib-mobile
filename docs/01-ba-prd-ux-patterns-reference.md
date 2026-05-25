# FEATURE-003: UX Patterns Reference (Deep Audit Findings)

**Status:** 🔵 READY (Manager-curated supplementary spec)
**Author:** 5bib-manager (synthesis from 4 Explore agent deep audits 2026-05-25)
**Purpose:** Enrich PRD với **business logic + UX patterns thực tế** extract từ web `selling-web` implementation. PRD wireframe text + states alone KHÔNG đủ cho Claude Design generate UI quality cao. File này là **MUST-READ** companion cho mỗi EPIC.

---

## 🚨 Tại sao file này tồn tại

Danny challenge Manager 2026-05-25: "Claude Design output sơ sài — mày có chắc hiểu hết logic project không?"

Manager admit: 9 PRD files dựa trên spot-check **service layer endpoints** + BA wireframe **generic**. **Chưa đọc** thực tế UI implementations của web (`src/templates/`, `src/components/`, `src/hooks/`, page actual code). Đó là gap.

→ Manager spawn 4 Explore agents song song để deep audit:
1. CHECKOUT flow (8 files, 1950 từ findings)
2. TICKETS management (8 files, 1850 từ findings)
3. AUTH + PROFILE (12 files, 1500 từ findings)
4. RACE DETAIL + BROWSING (9 files, 1800 từ findings)

→ Findings tổng hợp ở file này. Mobile/Claude Design **PHẢI tham khảo file này song song với PRD** để output match thực tế.

---

## 🛒 EPIC-3 CHECKOUT — Patterns thực tế bị PRD MISS

### 1. ✅ DISCRIMINATED UNION VAT FORM — **CONFIRMED KEEP MOBILE (Danny 2026-05-25)**

> **DECISION:** Mobile **PHẢI implement** VAT toggle với 6 conditional company fields. CRITICAL revenue feature (B2B athlete cần invoice). PRD MISS hoàn toàn — cần BA update EPIC-3 round 2.



Web có **VAT toggle** trong checkout cho user có công ty muốn nhận hoá đơn:

```typescript
// src/validations/checkout.validation.ts:7-38
z.discriminatedUnion('vat', [
  z.object({
    vat: z.literal(true),
    company_name: z.string().nonempty(),
    tax: z.string().nonempty(),
    company_address: z.string().nonempty(),
    company_receiver_name: z.string().nonempty(),
    company_phone: z.string().nonempty(),
    company_email: z.string().email(),
  }),
  z.object({
    vat: z.literal(false).default(false),
  }),
])
```

**Action mobile:** EPIC-3 phải thêm:
- Toggle "Lấy hoá đơn VAT" trong checkout step 3
- 6 fields công ty conditional (collapse/expand animation 300ms)
- Form reset behavior khi toggle (keepValues + clear errors) — pattern customer.tsx:26-38

### 2. ⚠️ AGE VALIDATION TẠI NGÀY EVENT (NOT TODAY) — PRD wrong

```typescript
// validation.ts:185-202
export const getAthleteSchema = (eventStartDate) => {
  const currentAge = eventStartDate
    ? dayjs(eventStartDate).diff(dayjs(dob), 'year')
    : dayjs().diff(dayjs(dob), 'year');
  if (currentAge < course?.min_age) → error
};
```

→ Mobile EPIC-3 phải validate dob theo **event date** + check `course.min_age` (per-course minimum age). PRD chỉ nói "dob > 1900" — quá generic.

### 3. ⚠️ ZERO-TOTAL SPECIAL CASE (PRD MISS)

```typescript
// /api/checkout/route.ts:170-174
if (status === 266) { // ORDER_WITH_TOTAL_EQUAL_ZERO
  return { url: `/${locale}/orders/${response.order_id}?redirect_from_checkout=true` };
}
```

→ Mobile EPIC-3 phải handle: nếu tổng = 0đ (free event hoặc discount 100%) → **skip payment gateway**, redirect thẳng order detail. PRD chỉ nói flow chuẩn có gateway.

### 4. ❌ INSURANCE PER-TICKET — **DROPPED MOBILE (Danny 2026-05-25)**

```typescript
// Web có pattern:
const selectedInsurancePrice = isInsuranceSelected
  ? insurancePricePerTicket * quantity : 0;
```

→ **DECISION:** Mobile **KHÔNG implement insurance checkout**. User mua insurance qua web. Mobile checkout giảm friction.

→ Backend response có thể vẫn trả `insurance_price` field — mobile **IGNORE**. KHÔNG render checkbox.

### 5. ✅ BUY-GROUP DISCOUNT CONDITIONS — **CONFIRMED KEEP MOBILE (Danny 2026-05-25)**

> **DECISION:** Mobile **PHẢI hiển thị** tier discount trong cart breakdown. Note: mặc dù đã drop Group Buy feature riêng, tier-based discount này là khác (race-level config "Mua ≥3 vé giảm 10%" trong checkout đơn giản). Apply cho quantity ≥ N.



```typescript
// cart.tsx:85-111
buy_group_conditions.forEach((condition) => {
  if (condition.min_quantity <= quantity) {
    condition_discount = condition.discount_percent / 100;
  }
});
```

→ Race có thể có condition như "Mua ≥ 3 vé giảm 10%". Mobile EPIC-3 phải hiển thị tier discount trong cart breakdown.

### 6. NAME VALIDATION REGEX (PRD thiếu chi tiết)

```typescript
// validation.ts:50-53
regex: /^[^0-9!@#$%^&*()_+=[\]{};':"\\|,.<>/?]*$/
// Auto UPPERCASE on input
```

→ Mobile name fields phải auto-uppercase + reject số/ký tự đặc biệt. PRD chỉ nói "min 1 max 50 trim".

### 7. POLICY CHECKBOX REQUIRED

```typescript
// customer.tsx:118-121 — CustomErrorMessage
"Bạn cần đồng ý với các điều khoản / You need to agree to the terms"
// Policy link fetch từ race?.race_extenstion?.url (dynamic per race)
```

→ Mobile checkout cần checkbox "Đồng ý điều khoản" với **link động per race** (KHÔNG hardcode `/policy`). 

### 8. ATHLETE FORM SECTIONS

Pattern thực tế (customer.tsx + page.tsx):
- **Section 1 — Customer info:** firstname, lastname, email, phone (2-col grid desktop, 1-col mobile)
- **Section 2 — VAT toggle:** Checkbox kích hoạt → 6 fields công ty
- **Section 3 — Athlete cards:** Accordion per athlete, header sticky "Player N", click edit inline
- **Section 4 — Cart:** Sticky right (desktop) / bottom (mobile) với breakdown

---

## 🎫 EPIC-4 TICKETS — Patterns thực tế bị PRD MISS

### 1. ✅ ROLLING BIB GAMIFICATION — **CONFIRMED KEEP MOBILE (Danny 2026-05-25)**

> **DECISION:** Mobile **PHẢI implement full gamification** (slot machine animation + countdown gold). Đây là delightful UX moment cho user — KHÔNG được simplify. Cần `react-native-reanimated` cho smooth 3s animation + `expo-haptics` cho tactile feedback khi spin.



Web có **slot machine animation** đẹp khi rolling BIB:

```typescript
// rolling-bib.tsx:30-32
DURATION_ROLLING_BIB = 3000ms  // spin
DELAY = 200ms                   // post-anim

// States: NoBIB → RollingBIBModal → ConfirmBIB → Success
```

**4 visual states:**
- **NoBIB:** Purple gradient bg, 5 dấu `?` text-[24px], button "Try it now"
- **RollingBIBModal:** Full screen mobile, SlotMachine image + RollingNumber + SlotCounter library
- **ConfirmBIB:** Gradient bg purple-700 → blue-600, BIB text-[60px], countdown gold #FEC84B, buttons Select again / Confirm
- **Success:** BIBNumber card white bg, primary-600 header, gradient footer

→ Mobile EPIC-4 cần spec animation duration + state machine + countdown styling. PRD hiện tại chỉ nói "show button Đổi BIB nếu available". Quá sơ sài.

### 2. ⚠️ CHANGE COURSE 3-STEP STATE MACHINE (PRD chỉ nói 1 screen)

```typescript
// change-course/page.tsx
const { step, setStep } = useChangeCourseStore();
// Step 0: Course picker + fee preview
// Step 1: Athlete form (course-specific fields)
// Step 2: Payment (nếu fee > 0)
```

**Real-time fee calc khi chọn course mới:**
```typescript
// lines 241-267
useEffect → getEstimateChangeCourse → 
{ newTicketPrice, amountPaid, distanceChangeFee, isFreeChangeCourseFeeGap }
differenceFee = newTicketPrice > amountPaid ? difference : 0
```

→ Mobile EPIC-4 S-TICKETS-04 phải spec 3-step + fee breakdown chi tiết:
- "Vé mới: {X}đ"
- "Vé cũ (refund): -{Y}đ"
- "isFreeChangeCourseFeeGap" → visual indicator (green badge "Miễn phí nâng cấp")

### 3. ⚠️ TRANSFER REQUIRED FEE CONDITIONAL (PRD MISS)

```typescript
// transfer-ticket-modal.tsx:111-126
if (race.required_transfer_fee === true)
  → TransferRequiredModal.open()  // 2 flow: fee display
else
  → ConfirmModal.open()            // simple confirm
```

→ Mobile EPIC-4 S-TICKETS-05 cần 2 flow dựa `race.required_transfer_fee`:
- Flow A (free transfer): confirm dialog đơn giản
- Flow B (paid transfer): modal hiển thị fee + payment flow

### 4. ⚠️ 8 API ERROR CODES TRANSFER (PRD nói "409 conflict" chung)

```typescript
// API_STATUS_CODE.TRANSFER
OUTSIDE_TRANSFER_PERIOD       → "Đang diễn ra"
RACE_REASSIGN_TIME_INVALID    → "Chưa đến giờ chuyển"
CANNOT_TRANSFER_ZERO_PRICE    → "Không thể chuyển vé miễn phí"
SAME_RECEIVER                 → "Không thể chuyển cho chính mình"
// + 4 codes khác
```

→ Mobile cần map từng error code → message tiếng Việt cụ thể, KHÔNG generic "Có lỗi xảy ra".

### 5. ⚠️ 8 ATHLETE STATUSES (PRD nói 3)

```
NEW, TRANSFERRING, REGISTER, REMIND_CHECK_IN,
CHECKED_IN, RACEKIT_RECEIVED, RACEKIT_NOT_RECEIVED, ...
```

Per status, action buttons thay đổi (page.tsx:60-84):
- `NEW/TRANSFERRING` → AthleteStatusNewOverview (transfer modal + required modal)
- `REGISTER/REMIND_CHECK_IN/CHECKED_IN/RACEKIT_*` → AthleteAfterStatusCheckedIn (full layout với BIB display, share, delegator)

→ Mobile S-TICKETS-02 phải spec conditional rendering chi tiết theo status.

### 6. ⚠️ MULTI-PANEL LAYOUT DESKTOP/MOBILE (athlete-status-checked-in.tsx)

```
Desktop (lg+): 2-column flex row
  Col 1 (2/3): RaceImage + TicketRaceDetail (breadcrumb + race title + badges)
  Col 2 (1/3 sidebar): AthleteLayout (profile + ButtonGroup)

Mobile: stacked
  RaceImage → AthleteLayout overlay (negative margin -mt-8 z-[10])
  → TicketRaceDetail → AthleteInfo
```

→ Mobile EPIC-4 spec layout pattern này (overlay profile card). Modal sizing `90vw` mobile / `md:600px` desktop.

### 7. ⚠️ COUNTDOWN TIMER VISUAL

Rolling BIB countdown style:
- Color: gold `#FEC84B`
- Format: `HH:MM:SS` bold
- useCountDown hook for real-time tick

→ Mobile design tokens cần thêm `accent.countdown: #FEC84B`.

---

## 🔐 EPIC-1 AUTH — Patterns thực tế bị PRD MISS

### 1. ⚠️ PASSWORD REGEX STRICT HƠN PRD

PRD spec: "min 8 + chữ + số"

Code thật:
```typescript
// validation.ts:67-68
regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/
```

Requirements:
- Min 8, max 20
- Ít nhất 1 lowercase
- Ít nhất 1 uppercase
- Ít nhất 1 digit
- Ít nhất 1 special char `@$!%*?&`

Error message: "Mật khẩu phải chứa ít nhất một chữ thường, một chữ hoa, một chữ số, một ký tự đặc biệt và có độ dài từ 8-20 ký tự."

→ Mobile EPIC-1 PHẢI update regex + error message này. PRD WRONG.

### 2. ⚠️ RESET PASSWORD 3 STEPS (PRD spec 2-step)

Web thực tế:
1. Enter email → send OTP
2. Enter OTP + new password + confirm
3. Success confirmation

→ Mobile cần thêm S-AUTH-06 Success confirmation screen sau khi reset.

### 3. ⚠️ ERROR CODE MAPPING 9 CODES

```typescript
// reset-password-form.tsx
1103 → "OTP Expired"
20   → "OTP Invalid"
1107 → "Email Not Exist"
1104 → "Account Not Active"
// + 5 codes khác
```

→ Mobile error message phải map từng code chính xác.

### 4. ⚠️ AVATAR UPLOAD CHỈ LÀ STUB

```typescript
// profile/page.client.tsx
// Edit button hiển thị nhưng KHÔNG có upload logic implementation
```

→ Mobile EPIC-1 S-PROFILE-03 Change Avatar bottom sheet — backend endpoint `/upload/avatar` đã có, nhưng UI cần BUILD MỚI từ scratch (web KHÔNG có pattern reference).

### 5. ⚠️ PROFILE EDIT MODE STUB

Web profile chỉ là view-only display, KHÔNG có edit mode functional. Edit buttons tồn tại nhưng non-functional.

→ Mobile EPIC-1 S-PROFILE-02 Edit Profile phải BUILD MỚI hoàn toàn. PRD spec đúng nhưng phải design fresh.

### 6. ⚠️ TERMS LINK CHƯA TRỎ Ở WEB

```typescript
// register-form.tsx — line links to "#"
```

→ Mobile cần backend xác nhận route `/policies/terms` + `/policies/privacy` có tồn tại không. Nếu chưa → flag PAUSE.

### 7. ⚠️ WEB PUSH INTEGRATION EXPERIMENTAL

```typescript
// /api/auth/[...nextauth]/route.ts:20-51
// Custom PUT handler cho QR login + push notifications
```

→ Web có experimental Web Push qua NextAuth callback. Mobile EPIC-9 phải spec push notification riêng (FCM/APNs), KHÔNG dùng pattern này.

### 8. ⚠️ SOCIAL LOGIN POSITION

Pattern web (login-form.tsx:226-247):
- Primary button "Đăng nhập" ở trên
- Divider "Hoặc"
- Google button **BÊN DƯỚI** với border trắng + Google logo

→ Mobile EPIC-1 S-AUTH-02 follow pattern này. Apple Sign-In iOS bên dưới Google (Apple guideline).

### 9. ❌ REMEMBER ME

```typescript
// login-form.tsx:183-199 — COMMENTED OUT entirely
```

→ Mobile defer Phase 2. KHÔNG ship MVP.

---

## 🏃 EPIC-2 RACE BROWSING — Patterns thực tế bị PRD MISS

### 1. ⚠️ HERO CAROUSEL DUAL-MODE LINK (PRD MISS)

```typescript
// banner.tsx:109
href={(item.link_cta ? item.link_cta : getRaceUrl(item)) ?? '/'}
```

→ Mobile Home tab carousel phải support 2 mode:
- `link_cta` filled → navigate external (marketing campaign URL)
- `link_cta` null → fallback navigate race detail

### 2. ⚠️ IMAGE FALLBACK '(NULL)' SENTINEL (PRD MISS)

```typescript
// banner.tsx:118-120
item.image === '(NULL)' ? DEFAULT_IMG : item.image
```

→ Mobile phải handle string `'(NULL)'` (literal) làm sentinel cho image rỗng. Bug backend nhưng frontend phải defensive.

### 3. ⚠️ CACHE BUG PAGINATION (PRD nói cache 30 min — code thật INCONSISTENT)

```typescript
// race/index.ts:27 — Vietnamese comment
"TRÊN LIVE PHẦN SEARCH EVENT KHÔNG CHUYỂN ĐC PAGE DO CACHE"

// 2 functions same endpoint, khác cache strategy:
getListRace()   → revalidate: 1800 (30 min ISR)
getEventList()  → cache: 'no-cache' (live for search)
```

→ Mobile EPIC-2 cần explicit SWR strategy: cache 30 min cho list mặc định, NO cache cho search filtered.

### 4. ⚠️ RICH TEXT BITWISE FORMAT (PRD MISS — race description rendering)

```typescript
// render-node.tsx:139-158 — 16+ node types via switch
// Bitwise format flags:
bit 0 (1)   → bold
bit 1 (2)   → italic
bit 2 (4)   → strikethrough
bit 3 (8)   → underline
bit 4 (16)  → code
bit 5 (32)  → subscript
bit 6 (64)  → superscript

// Plus: tables (tablerow/tablecell), YouTube iframe, images
```

→ Mobile EPIC-2 race detail description cần custom renderer cho Lexical format. PRD nói "HTML stripped to plain text" — wrong, sẽ mất formatting.

**Mobile recommend:** Dùng `@lexical/react-native` HOẶC simplified renderer support 7 format bits + table + image.

### 5. ⚠️ ACCORDION DEFAULT OPEN LOGIC

```typescript
// race-detail.tsx:105
defaultOpen={!race.brand?.length && index === 0}
// First description opens chỉ khi không có sponsors
```

→ Mobile EPIC-2 race detail section open behavior copy logic này.

### 6. ⚠️ STATUS BADGE MISSING IN WEB (mobile FIX this gap)

Web hiện tại KHÔNG có badges cho COMING_SOON, CLOSED, OPEN_FOR_SALE. Chỉ "Đã kết thúc" cho FINISHED.

→ Mobile **TỐT HƠN WEB**: implement đầy đủ 4 badge với color:
- `OPEN_FOR_SALE` → green badge "Đang mở"
- `COMING_SOON` → yellow badge "Sắp mở"
- `CLOSED` → gray badge "Đã đóng"
- `FINISHED` → dark gray badge "Đã kết thúc"

### 7. ⚠️ HIGHLIGHT BADGE chưa có trong web (mobile implement)

PRD BR-BROWSE-03 spec "⭐ Nổi bật" badge nhưng web KHÔNG có. Mobile implement đúng PRD.

### 8. ⚠️ BIB_SET_UP CONDITIONAL BUTTON chưa có trong web

PRD BR-BROWSE-04 spec button thay đổi theo `bib_set_up`. Web hiện tại chưa implement. Mobile build đúng PRD.

### 9. CARD DESIGN DETAILS

```typescript
// card-event.tsx
- Image ratio: 13:5
- Active price color: #DB3069 (red)
- Finished badge: bg gray #F2F4F7, text #475467 "Đã kết thúc"
- Location truncate: split(',')[0] (city only)
- Tracking: 'event_card_click' event with race_title
```

→ Mobile design system thêm:
- `color.price.active = #DB3069`
- `color.badge.finished.bg = #F2F4F7`
- `color.badge.finished.text = #475467`
- Image aspect ratio race card: `13/5` (KHÔNG `16/9` như tao thường default)

### 10. LOCATION NULL GUARD MISSING

```typescript
// card-event.tsx active variant KHÔNG có null check location
location.split(',')[0]  // crash nếu null
```

→ Mobile defensive code BẮT BUỘC.

---

## 🌐 i18n CONVENTION (cross-cutting)

### Naming convention
Pattern: `{Namespace}.{key}` snake_case
- `ModalLogin.login`, `ModalLogin.register`, `ModalLogin.forgot`
- `CheckoutPage.cart`, `CheckoutPage.total_cost`, `CheckoutPage.insurance_per_ticket`
- `TicketDetailPage.code_value`
- `Ticket_Transfer.email_required`
- `Roll_BIB.try_now`
- `EventDetail.description`
- `AddMemberPage.athlete_info`

### Bilingual fallback inline (anti-pattern!)
```typescript
'Email không được để trống/ Please enter your email'
'Mật khẩu phải chứa ít nhất một chữ thường...'
```

⚠️ Web sometimes hardcode bilingual trong code. Mobile **KHÔNG copy pattern này** — strict i18n via `i18next` resource files.

### Rich text interpolation
```typescript
t('insurance_label_with_quantity', { count: quantity })
// Plus Link component placeholder cho policy URLs
```

→ Mobile dùng `Trans` component cho rich text (i18next pattern).

### Sample strings critical (mobile reuse)

**Auth:**
- `Đăng nhập` / `Đăng ký` / `Quên mật khẩu`
- `Mật khẩu` / `Xác nhận mật khẩu` / `Mật khẩu mới`
- `Đăng nhập với Google` / `Đăng nhập với Apple`
- `Nhận mã OTP` / `Nhập mã OTP`
- `Trở về đăng nhập`
- `Tôi đồng ý với các điều khoản sử dụng và bảo mật dữ liệu`

**Checkout:**
- `Giỏ hàng` / `Tổng thanh toán`
- `Thông tin vận động viên` / `Player 1, Player 2, ...`
- `Lấy hoá đơn VAT` / `Thông tin công ty`
- `Mua bảo hiểm tai nạn` / `{N}đ / người`
- `Áp dụng mã giảm giá`
- `Bạn cần đồng ý với các điều khoản`

**Tickets:**
- `Vé của tôi` / `Đơn hàng của tôi`
- `Sắp diễn ra` / `Đã check-in` / `Đã chuyển/huỷ`
- `Ký E-Waiver` / `Đã ký` / `Chưa ký`
- `Đổi cự ly` / `Chuyển BIB cho người khác`
- `Đổi BIB number` / `Try it now`
- `Vẫn còn {N} giờ để chuyển BIB`
- `Không thể chuyển vé miễn phí`
- `Không thể chuyển cho chính mình`

**Race:**
- `Giải sắp diễn ra` / `Giải đã kết thúc`
- `Đang mở đăng ký` / `Chưa mở đăng ký` / `Đã đóng đăng ký`
- `Đăng ký ngay` / `Xem kết quả`
- `Còn N slot` / `Hết vé`
- `Miễn phí`
- `Ngày diễn ra` / `Địa điểm`

---

## 🎨 DESIGN TOKEN ADDITIONS (chưa có trong design-system.md)

### Color additions

| Token | Hex | Usage | Source web |
|-------|-----|-------|------------|
| `color.price.active` | `#DB3069` | Price text trên race card active | card-event.tsx |
| `color.badge.finished.bg` | `#F2F4F7` | Background "Đã kết thúc" badge | card-event.tsx:120 |
| `color.badge.finished.text` | `#475467` | Text "Đã kết thúc" | card-event.tsx:120 |
| `color.countdown.text` | `#FEC84B` | Gold cho countdown timer (rolling BIB) | rolling-bib.tsx |
| `color.gamification.gradient.purple` | `#6B21A8` → `#1D4ED8` | Rolling BIB ConfirmBIB bg | rolling-bib.tsx |

### Animation tokens (chưa có trong design-system.md)

| Token | Duration | Usage |
|-------|----------|-------|
| `ANIMATION.SHORT` | 200ms | Carousel navigation debounce, page transition |
| `ANIMATION.MEDIUM` | 300ms | Form field collapse/expand (VAT toggle) |
| `ANIMATION.LONG` | 1500ms | State transitions, modal slides |
| `ANIMATION.GAMIFICATION` | 3000ms | Rolling BIB slot machine spin |
| `ANIMATION.SLOT_DELAY` | 200ms | Post-animation delay show result |

### Image aspect ratio tokens

| Token | Ratio | Usage |
|-------|-------|-------|
| `ASPECT.race.card` | `13:5` | Race card cover image |
| `ASPECT.hero` | `16:9` | Hero carousel |
| `ASPECT.bib.qr` | `1:1` | QR code display |
| `ASPECT.story` | `9:16` | Story image (cert vertical) |

### Modal sizing tokens (cross-platform spec)

| Token | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| `modal.small` | `90vw` | `400px` | `400px` |
| `modal.medium` | `90vw` | `500px` | `500px` |
| `modal.large` | `90vw` | `600px` | `600px` |
| `bottomsheet.snap` | `[40%, 90%]` | `[40%, 80%]` | N/A (modal thay thế) |

---

## 🧩 PATTERN BIBLE (cross-EPIC)

### Pattern P1: Conditional Field Group (VAT, Guardian, Delegator)

```
Trigger: checkbox/toggle/dropdown change
Behavior:
1. Update schema (discriminated union OR superRefine)
2. Animate group height 300ms (auto → content height)
3. Reset form keepValues=true, keepErrors=true (clear invalid state for new schema)
4. Re-validate
5. Scroll-to-first-new-field on expand
```

→ Apply: VAT (checkout), Guardian (age < 18 checkout), Delegator (represent mode checkout + e-waiver)

### Pattern P2: Real-time Fee Calculation

```
Trigger: dropdown/picker selection change
Behavior:
1. Show "Đang tính..." inline loader (text-only, no spinner)
2. Fire API estimate
3. Render fee breakdown progressive:
   - Vé mới: {X}đ (bold)
   - Vé cũ (refund): -{Y}đ (red if negative)
   - Phí chênh lệch: {Z}đ (primary-500 bold)
   - Special badge nếu free upgrade
4. Enable CTA only after estimate completed
```

→ Apply: Change course (EPIC-4), Discount code apply (EPIC-3), Insurance toggle (EPIC-3)

### Pattern P3: Multi-step Wizard with Sticky CTA

```
Layout:
- Header: back button + title + step indicator (e.g., "Bước 2/3")
- Body: scrollable content
- Footer: sticky bottom với 2 buttons (Quay lại + Tiếp tục)

Behavior:
- Tap "Quay lại" → if dirty form → confirm dialog "Lưu draft và quay lại?"
- Tap "Tiếp tục" → validate all → API call → navigate next step
- Step indicator: 3 dots với progress fill (line connecting)
```

→ Apply: Checkout (EPIC-3), Change course (EPIC-4), E-Waiver (EPIC-6), Reset password (EPIC-1)

### Pattern P4: Status Conditional Action Buttons

```
Behavior:
- Action button set thay đổi theo entity status
- Disabled buttons có tooltip giải thích lý do
- Hidden buttons thay vì grayed-out cho action KHÔNG applicable
```

Per status mapping (athlete_status):
| Status | Buttons enabled |
|--------|-----------------|
| `NEW` | Transfer, RegisterAthleteForm |
| `TRANSFERRING` | TransferStatusBanner (no actions) |
| `REGISTER` | EditInfo, ChangeCourse, Transfer, EWaiver, RollingBIB (if available) |
| `REMIND_CHECK_IN` | EditInfo, EWaiver, ShareBIB |
| `CHECKED_IN` | ShareBIB, ViewResult (after race) |
| `RACEKIT_RECEIVED` | ShareBIB, ViewResult |

→ Apply: Ticket detail (EPIC-4), Order detail (EPIC-4)

### Pattern P5: Modal vs Bottom Sheet decision

```
Use MODAL when:
- Full screen takeover needed (signature, camera, WebView)
- User must focus deep task (e.g., sign waiver)
- Need browser-like navigation (back/forward inside)

Use BOTTOM SHEET when:
- Quick action choice (payment method, share, filter, picker)
- Optional dismiss (drag down)
- Maintain context of underlying screen
- Snap points cho list dài

Use ALERT DIALOG when:
- Destructive confirmation (delete, cancel, transfer)
- KHÔNG có complex content, chỉ message + 2 buttons
```

### Pattern P6: Image with Defensive Fallback

```
For mọi network image:
1. Check NULL/undefined → fallback to DEFAULT_IMG
2. Check '(NULL)' string sentinel → fallback (legacy bug)
3. Show placeholder skeleton while loading (shimmer)
4. onError → fallback DEFAULT_IMG + log warning
5. Lazy load with IntersectionObserver equivalent (`expo-image` built-in)
```

### Pattern P7: Form Reset on Schema Change

```typescript
// React Hook Form pattern khi conditional schema thay đổi
useEffect(() => {
  if (triggerValue !== prevValue.current) {
    methods.reset(undefined, {
      keepValues: true,       // KHÔNG xoá data đã nhập
      keepSubmitCount: false,
      keepErrors: true,        // Giữ errors cũ
      keepDirtyValues: true,
      keepTouched: true,
      keepIsValid: false,      // FORCE re-validate với schema mới
    });
    prevValue.current = triggerValue;
  }
}, [triggerValue, methods]);
```

→ Apply: VAT toggle, mode self/represent, age < 18 trigger guardian

---

## 📋 GAPS FRESH LIST (Mobile design phải fix vs PRD)

### EPIC-1 (Auth) — gaps detected
- [ ] Password regex update strict (lowercase + uppercase + digit + special)
- [ ] Reset password 3-step (PRD có 2, web có 3)
- [ ] Avatar upload UI build fresh (web stub)
- [ ] Profile edit mode build fresh (web stub)
- [ ] 9 error codes mapping cho reset
- [ ] Mobile dùng password strength meter visual (web không có) — optional Phase 2

### EPIC-2 (Browsing) — gaps detected
- [ ] Dual-mode hero link (link_cta vs raceUrl)
- [ ] Image '(NULL)' sentinel handling
- [ ] Cache strategy explicit per query type
- [ ] Lexical rich text renderer (web có, PRD nói strip — wrong)
- [ ] 4 status badge implement (web missing, mobile improve)
- [ ] Highlight badge ⭐
- [ ] bib_set_up conditional button
- [ ] Card image ratio 13:5
- [ ] Location null guard defensive
- [ ] Color tokens: price red #DB3069, badge gray pair

### EPIC-3 (Checkout) — gaps detected
- [ ] VAT toggle + 6 company fields (CRITICAL — PRD miss hoàn toàn)
- [ ] Age validation tại event date (not today)
- [ ] Zero-total special case (status 266 → skip gateway)
- [ ] Insurance per-ticket pricing
- [ ] Buy-group discount conditions
- [ ] Name regex UPPERCASE + letter-only
- [ ] Policy link dynamic per race
- [ ] Athlete accordion per athlete

### EPIC-4 (Tickets) — gaps detected
- [ ] Rolling BIB gamification (slot machine + countdown gold)
- [ ] Change course 3-step state machine
- [ ] Transfer required fee 2-flow (free vs paid)
- [ ] 8 transfer error codes mapping
- [ ] 8 athlete statuses + conditional actions
- [ ] Multi-panel layout desktop/mobile (overlay profile card)
- [ ] Modal sizing tokens

### EPIC-5 (Result — REDUCED) — nothing major (web redirect pattern)

### EPIC-6 (E-Waiver) — already deep audited trong PRD
- [ ] Web KHÔNG có canvas signature inline — confirmed BA spec đúng

---

## 🚦 Mobile Implementation Priority

Khi Coder bắt đầu (sau Claude Design output), priority order:

1. **P0 — CRITICAL business logic** (gây bug financial/auth nếu sai):
   - VAT discriminated union (EPIC-3)
   - Age validation event-date (EPIC-3)
   - Zero-total skip gateway (EPIC-3)
   - Password regex strict (EPIC-1)
   - Transfer error codes mapping (EPIC-4)

2. **P1 — User-facing UX quality** (visible to user):
   - Rolling BIB gamification (EPIC-4)
   - Change course 3-step UI (EPIC-4)
   - Status badges (EPIC-2)
   - Lexical rich text renderer (EPIC-2)
   - VAT toggle UI (EPIC-3)

3. **P2 — Nice-to-have polish**:
   - Avatar upload UI fresh (EPIC-1)
   - Profile edit mode fresh (EPIC-1)
   - Animation tokens enforce
   - Defensive image fallbacks

---

## ✅ Status

- [x] Manager-curated synthesis từ 4 deep audits
- [x] Findings paste cụ thể line refs cho Coder verify
- [x] Design tokens addition
- [x] 7 cross-EPIC patterns
- [x] Priority ranking cho implementation

## 🔗 Next

1. **Danny review** file này — confirm patterns critical (vd: VAT có thực sự là yêu cầu mobile không, hay chỉ web?)
2. **Manager update 5 EPIC PRD files** (1/2/3/4/6) với references về sections của file này
3. **Re-feed Claude Design** với:
   - design-system.md (existing)
   - **ux-patterns-reference.md (THIS — must read)**
   - EPIC files 1-6
4. Expectation: Claude Design output sẽ chi tiết hơn, capture được 80%+ patterns thực tế của web
