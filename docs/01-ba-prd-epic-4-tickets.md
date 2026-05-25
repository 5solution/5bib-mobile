# FEATURE-003: EPIC-4 — My Tickets & Orders

**Status:** 🔵 READY rev2 (2026-05-25) — Updated per Manager deep audit: +S-TICKETS-06 Rolling BIB gamification full, +8 athlete statuses matrix, +Change course 3-step state machine, +Transfer 2-flow (free vs paid) + 8 error codes
**Author:** 5bib-po-ba
**Wave:** 2 of 4
**Linked:** [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md), [epic-3-checkout](01-ba-prd-epic-3-checkout.md)
**Audience:** Claude Design + Coder

---

## 📌 Pre-flight check

- [x] Wave 1 + EPIC-2/5/3 đã READY
- [x] Spot-check `src/services/ticket/index.ts`, `src/services/athlete/index.ts` (register/transfer), `src/services/order/index.ts` (getMyOrder)

**🔥 Critical findings:**
- Ticket = "Code" entity. Endpoints `/codes/*` (KHÔNG `/tickets/*`)
- `getUserTicket(athleteStatus, pageNo, code_statuses)` — 3 filter params
- `getEstimateChangeCourse(code_value, to_course_id)` — preview fee TRƯỚC khi commit
- `changeCourse(code_value, to_course_id, payload)` PUT (KHÔNG POST)
- `transferTicket(code_value, receipt_email, message)` — POST với params query + body `{message}`
- Athlete register cho ticket: `POST /athlete/register?code_value=X` (khác với register user account)
- `simpleEditAthlete(athlete_id, payload)` PUT `/athlete/simple-edit?athlete_id=X` — basic edit
- `mapFormDataToPayload()` ở athlete service convert UI form → snake_case backend

---

## 🎯 EPIC-4 Goal

Cho phép Athlete **quản lý BIB tickets đã mua** và **xem lịch sử orders**: list, detail, edit athlete info, change course, transfer BIB cho người khác. Đây là retention loop core — user vào app sau khi mua để check ticket, edit info, hoặc transfer khi không tham gia được.

## 📦 Scope EPIC-4

| Screen ID | Screen Name | Route | Auth |
|-----------|------------|-------|------|
| S-TICKETS-01 | My Tickets list tab | `/(tabs)/tickets` | Required |
| S-TICKETS-02 | Ticket detail | `/tickets/[id]` | Required |
| S-TICKETS-03 | Edit ticket (athlete info) | `/tickets/[id]/edit` | Required |
| S-TICKETS-04 | Change course (with estimate) | `/tickets/[id]/change-course` | Required |
| S-TICKETS-05 | Transfer BIB | `/tickets/[id]/transfer` | Required |
| S-ORDERS-01 | My Orders list tab | `/(tabs)/orders` | Required |
| S-ORDERS-02 | Order detail | `/orders/[id]` | Required |

---

## 👤 User Stories

- **US-TICKETS-01:** As an **Athlete**, I want to **xem tất cả BIB tickets đã mua** so that biết giải nào sắp diễn ra.
- **US-TICKETS-02:** As an **Athlete**, I want to **filter tickets theo status** so that focus vào active.
- **US-TICKETS-03:** As an **Athlete**, I want to **show QR ticket nhanh** từ list so that scan check-in mượt.
- **US-TICKETS-04:** As an **Athlete**, I want to **edit thông tin VĐV trên BIB** so that sửa typo hoặc cập nhật info trước race.
- **US-TICKETS-05:** As an **Athlete**, I want to **đổi cự ly** so that adjust theo training (vd: train không đủ cho 21km → đổi 10km).
- **US-TICKETS-06:** As an **Athlete**, I want to **xem trước chi phí đổi cự ly** so that quyết định có đổi hay không.
- **US-TICKETS-07:** As an **Athlete**, I want to **chuyển BIB cho bạn bè** khi không tham gia được so that không lãng phí.
- **US-TICKETS-08:** As an **Athlete**, I want to **xem lịch sử orders** so that track chi tiêu + tải invoice (Phase 2).

---

## 📜 Business Rules (BR-TICKETS-XX)

| ID | Business Rule |
|----|--------------|
| BR-TICKETS-01 (rev2) | **8 athlete statuses enum** (per web reality): `NEW`, `TRANSFERRING`, `REGISTER`, `REMIND_CHECK_IN`, `CHECKED_IN`, `RACEKIT_RECEIVED`, `RACEKIT_NOT_RECEIVED`, `CANCELLED`. Mobile list filter 3 nhóm grouping: "Sắp diễn ra" (REGISTER + REMIND_CHECK_IN + NEW), "Đã check-in" (CHECKED_IN + RACEKIT_*), "Đã chuyển/Huỷ" (TRANSFERRING + CANCELLED). Per-status action buttons matrix → xem BR-TICKETS-01b. |
| **BR-TICKETS-01b (NEW rev2)** | **Per-status action button matrix** (S-TICKETS-02 conditional buttons): <br>• `NEW` → [Transfer, RegisterForm] <br>• `TRANSFERRING` → [StatusBanner only, KHÔNG actions] <br>• `REGISTER` → [EditInfo, ChangeCourse, Transfer, EWaiver, RollingBIB (if available)] <br>• `REMIND_CHECK_IN` → [EditInfo, EWaiver, ShareBIB] <br>• `CHECKED_IN` → [ShareBIB, ViewResult] <br>• `RACEKIT_RECEIVED` → [ShareBIB, ViewResult] <br>• `RACEKIT_NOT_RECEIVED` → [ShareBIB, ContactSupport] <br>• `CANCELLED` → [ViewOrder, KHÔNG actions khác] |
| BR-TICKETS-02 | List pagination 10 tickets/page, infinite scroll. Default sort: `created_on DESC`. |
| BR-TICKETS-03 | Ticket có flag `available_to_change_course: boolean` — control button "Đổi cự ly" enable/disable. |
| BR-TICKETS-04 | Đổi cự ly: bắt buộc gọi `GET /codes/estimate/change-course` TRƯỚC khi commit `PUT /codes/change-course`. Hiển thị rõ fee chênh lệch (có thể + hoặc -). |
| BR-TICKETS-05 | Change course fee: nếu course mới rẻ hơn → refund delta (cần BTC approve, hiển thị "Sẽ hoàn lại X đ trong 5-7 ngày"). Nếu đắt hơn → user trả thêm qua payment gateway (reuse EPIC-3 flow). |
| BR-TICKETS-06 | Transfer BIB: input email người nhận → backend validate email tồn tại trong system. Nếu chưa có account → backend gửi invite. |
| BR-TICKETS-07 | Transfer requires confirm dialog "Chuyển BIB cho {email}? Hành động không thể hoàn tác." |
| BR-TICKETS-08 | Sau transfer success → ticket trong list mất khỏi "Sắp diễn ra", chuyển sang "Đã chuyển" + locked (KHÔNG edit/change được nữa). |
| BR-TICKETS-09 | Edit athlete info: chỉ allow trước cutoff date BTC quy định. Sau cutoff → fields read-only + banner "Đã đóng chỉnh sửa". |
| BR-TICKETS-10 | Order list show `financial_status` + `internal_status`. Mobile MVP filter theo `financial_status`: "Đã thanh toán" / "Chờ thanh toán" / "Đã huỷ". |
| BR-TICKETS-11 | Order detail hiển thị invoice (Phase 2: download PDF). MVP show breakdown items + total. |
| BR-TICKETS-12 | Pull-to-refresh trên cả 2 list (tickets + orders). |
| BR-TICKETS-13 | Tickets cached SQLite (BR-GLOBAL-02) — list view available offline. Detail edit/change/transfer cần online. |
| BR-TICKETS-14 (rev2) | Rolling BIB: nếu `basic_info.available_to_roll === true` → show button "Đổi BIB number" trên S-TICKETS-02. Tap → navigate S-TICKETS-06 Rolling BIB gamification (xem screen spec đầy đủ). |
| **BR-TICKETS-15 (NEW rev2)** | **Rolling BIB gamification 4-state machine:** NoBIB → RollingBIBModal (spin 3s) → ConfirmBIB (preview với countdown gold) → Success (final BIB card). Cancel ở bất kỳ state nào → back về NoBIB hoặc S-TICKETS-02. |
| **BR-TICKETS-16 (NEW rev2)** | **Rolling BIB animation specs:** Spin duration = 3000ms (`ANIMATION.GAMIFICATION`), post-spin delay = 200ms (`ANIMATION.SLOT_DELAY`). Haptic feedback (`expo-haptics` impact light) every 100ms tick during spin. Respect `prefersReducedMotion` → skip animation, jump direct to ConfirmBIB. |
| **BR-TICKETS-17 (NEW rev2)** | **Rolling BIB countdown:** ConfirmBIB state hiển thị countdown `rolling_bib_valid_until - now()` format `HH:MM:SS` bold gold `#FEC84B`. Tick every 1s. Countdown reach 0 → auto navigate back S-TICKETS-02 + toast "Hết thời gian xác nhận BIB". |
| **BR-TICKETS-18 (NEW rev2)** | **Change course 3-step state machine:** Step 0 (course picker + estimate fee), Step 1 (athlete form update với course-specific fields), Step 2 (payment nếu fee > 0 — reuse EPIC-3 payment flow). Zustand store `useChangeCourseStore` manage state. Pattern P2 + P3 trong ux-patterns-reference.md. |
| **BR-TICKETS-19 (NEW rev2)** | **Transfer 2-flow conditional:** Dựa `race.required_transfer_fee` boolean. Nếu `false` → flow A: confirm dialog đơn giản → POST transfer. Nếu `true` → flow B: TransferRequiredModal hiển thị fee + payment flow (reuse EPIC-3 payment) → after pay success → POST transfer với payment ref. |
| **BR-TICKETS-20 (NEW rev2)** | **Transfer 8 error codes mapping:** Backend trả `error_code` trong response 4xx. Mobile map error code → tiếng Việt cụ thể:<br>• `OUTSIDE_TRANSFER_PERIOD` → "Ngoài thời gian chuyển nhượng"<br>• `RACE_REASSIGN_TIME_INVALID` → "Chưa đến giờ chuyển BIB"<br>• `CANNOT_TRANSFER_ZERO_PRICE` → "Không thể chuyển vé miễn phí"<br>• `SAME_RECEIVER` → "Không thể chuyển cho chính mình"<br>• `EMAIL_NOT_EXIST` → "Email người nhận chưa có tài khoản"<br>• `TICKET_ALREADY_TRANSFERRED` → "Vé đã được chuyển trước đó"<br>• `RACE_FINISHED` → "Race đã kết thúc, không thể chuyển"<br>• `EXCEED_MAX_TRANSFER_COUNT` → "Vé đã đạt giới hạn số lần chuyển" |

---

## 🖥️ Per-Screen Spec

### S-TICKETS-01: My Tickets List (Tab)

**Route:** `/(tabs)/tickets` (bottom tab)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ 🎫 Vé của tôi                       │  ← header title
├─────────────────────────────────────┤
│ [Sắp diễn ra · 3] [Đã check-in · 5] │  ← tabs (segmented)
│ [Đã chuyển/huỷ · 2]                 │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [QR thumb 60×60]                 │ │  ← ticket card
│ │ Saigon Marathon 2026             │ │
│ │ 5 km · 15/03/2026                │ │
│ │ BIB: A1234                       │ │
│ │ [Trạng thái: Sẵn sàng]           │ │
│ │                          [→]      │ │  ← tap entire card
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ... more tickets                 │ │
│ └─────────────────────────────────┘ │
│ ⏳ Đang tải thêm...                  │
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Loading | Skeleton 5 ticket cards |
| Filled | List cards |
| Empty (`Sắp diễn ra` tab) | Empty state: 🏃 icon + "Bạn chưa có vé sắp tới" + CTA "Tìm giải đấu" → navigate Events |
| Empty (`Đã check-in`) | "Chưa có race nào đã hoàn thành" |
| Empty (`Đã chuyển/huỷ`) | "Chưa có vé nào đã chuyển hoặc huỷ" |
| Error fetch | Toast + retry on empty area |
| Offline | Banner top + cached list |
| Pull-to-refresh | Native refresh indicator |

**Components:** Header, Segmented Tabs (with count badge), Ticket Card (custom with QR thumb), Empty State, Footer loader

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Tap tab | Switch filter, re-fetch list |
| 2 | Tap ticket card | Navigate `/tickets/[id]` |
| 3 | Long-press ticket card | Quick action menu: "Xem QR", "Chia sẻ", "Đổi cự ly" (if available) |
| 4 | Pull-to-refresh | Re-fetch + update SQLite cache |
| 5 | Scroll 80% | Load next page |

**Data:**
- `GET /codes/fetch-by-user?athleteStatus=ALL&pageNo=X&code_statuses=ACTIVE`
- Tab "Sắp diễn ra": `code_statuses=ACTIVE` + filter client-side race date >= today
- Tab "Đã check-in": `athleteStatus=CHECKED_IN`
- Tab "Đã chuyển/huỷ": `code_statuses=TRANSFERRED,CANCELLED`

```typescript
interface MyTicketsInput {
  athleteStatus?: 'ALL' | 'ACTIVE' | 'CHECKED_IN' | 'NOT_REGISTERED';
  pageNo?: number;             // default 1
  pageSize?: number;           // default 10 (backend default)
  codeStatuses?: string;       // CSV: 'ACTIVE,TRANSFERRED,CANCELLED'
}

interface MyTicketsResponse {
  items: Ticket[];
  pagination: {...};
}

interface Ticket {
  id: string;
  value: string;                      // secret code for QR
  status: 'ACTIVE' | 'TRANSFERRED' | 'CANCELLED';
  athleteStatus: 'ACTIVE' | 'CHECKED_IN' | 'NOT_REGISTERED';
  bib?: string;
  raceCourseDistance: string;
  raceCourseName: string;
  athleteName: string;
  receiptEmail: string;
  orderId: string;
  ticketType: TicketType;
  createdOn: string;                  // ISO
  modifiedOn: string;
  availableToChangeCourse: boolean;
  race: Race;                         // nested race detail
  basicInfo: {
    value: string;
    courseId: string;
    courseName: string;
    raceName: string;
    closeForSaleDateTime: string;
    openForSaleDateTime: string;
    courseType: string;
    courseDistance: string;
    bib: string;
    rollingBibLastTime?: string;
    rollingBibValidUntil?: string;
    availableToRoll: boolean;
  };
  athleteBasicInfo: {
    athleteRepresent?: AthleteRepresent;
    athleteSubInfo?: AthleteSubInfo;
    codeAthleteStatus?: string;
    bib?: string;
  };
}
```

**Endpoint:**

| Element | Spec |
|---------|------|
| Method | GET |
| Path | `/codes/fetch-by-user` |
| Auth | Bearer Required |
| Request (clean SDK) | `MyTicketsInput` |
| Backend legacy | `?sortDirection=DESC&pageNo=N&code_statuses=ACTIVE&athlete_status=X` |
| Response (clean SDK) | `MyTicketsResponse` (normalized) |
| Status | 200 / 401 / 500 |
| SDK normalize | YES |

---

### S-TICKETS-02: Ticket Detail

**Route:** `/tickets/[id]` — `id` là ticket ID

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Chi tiết vé              [⤴]    │
├─────────────────────────────────────┤
│                                     │
│   [QR Card — xem design-system #16] │  ← prominent at top
│                                     │
│  ── Thông tin VĐV ──────────────── │
│  Tên: Nguyễn Văn A                  │
│  Email: a@example.com               │
│  SĐT: 0912345678                    │
│  Giới tính: Nam                      │
│  Ngày sinh: 01/01/1990              │
│  Size áo: M                          │
│  Racekit: Tiêu chuẩn                 │
│                                     │
│  [Chỉnh sửa thông tin]              │  ← outline (disabled if cutoff past)
│                                     │
│  ── Chi tiết giải ───────────────── │
│  Saigon Marathon 2026               │
│  5 km · 15/03/2026                  │
│  📍 TP.HCM                          │
│  [Xem chi tiết giải →]              │  ← link to event detail
│                                     │
│  ── Hành động ────────────────────  │
│  [Đổi cự ly]                         │  ← outline (disabled if !available)
│  [Đổi BIB number]                    │  ← only if rolling available
│  [Chuyển BIB cho người khác]         │  ← outline
│  [Ký E-Waiver]                       │  ← outline (if not signed)
│  [Tải hoá đơn]                       │  ← ghost (Phase 2)
│                                     │
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Loading | Skeleton |
| Filled | Full content |
| Edit cutoff past | "Chỉnh sửa thông tin" disabled với label "Đã đóng chỉnh sửa từ {date}" |
| Available to change course | "Đổi cự ly" enabled |
| Already transferred | All action buttons disabled với banner "Vé đã chuyển — không thể thực hiện hành động" |
| Race finished | Action buttons disabled; show CTA "Xem kết quả" → open WebView `result.5bib.com/event/{raceId}/bib/{bib}` (xem EPIC-5 rev2) |
| Offline | Show cached + offline indicator |
| E-Waiver signed | Hide "Ký E-Waiver" button hoặc show "✓ Đã ký" disabled |
| Rolling BIB available | "Đổi BIB" enabled với countdown "Còn {N} giờ" |

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Tap QR card | Optionally enlarge (modal full screen QR) |
| 2 | Tap "Chỉnh sửa thông tin" | Navigate S-TICKETS-03 |
| 3 | Tap "Đổi cự ly" | Navigate S-TICKETS-04 |
| 4 | Tap "Đổi BIB number" | Confirm dialog → `PUT /athlete/rolling-bib` |
| 5 | Tap "Chuyển BIB" | Navigate S-TICKETS-05 |
| 6 | Tap "Ký E-Waiver" | Navigate `/e-waiver?code=<value>` (EPIC-6) |
| 7 | Tap "Tải hoá đơn" | Phase 2 — MVP toast "Tính năng sắp ra mắt" |
| 8 | Tap "Xem chi tiết giải" | Navigate event detail |
| 9 | Tap ⤴ share | Share intent với ticket value or link |

**Endpoint:** `GET /codes/get/{ticketId}` (auth Bearer) → returns same `Ticket` clean shape

---

### S-TICKETS-03: Edit Ticket (Athlete Info)

**Route:** `/tickets/[id]/edit`

**Reuse:** form structure giống S-CHECKOUT-02 nhưng pre-fill từ ticket data + readonly cho fields không edit được.

**Editable fields (theo backend `simpleEditAthlete` + `register`):**
- `first_name`, `last_name`, `dob`, `gender`
- `email`, `contact_phone`
- `tshirt_size`, `racekit`
- `name_on_bib` (max 15)
- `emergency_contact_name`, `emergency_contact_phone`
- `blood_type`, `medical_information`, `current_medication`
- `address`, `club`

**Read-only:** `id_number`, `nationality` (verify cần backend allow hay không)

**Wireframe:** Similar to S-CHECKOUT-02 (xem epic-3) but:
- Header "Chỉnh sửa thông tin" + save icon
- KHÔNG có mode toggle (đã set khi mua)
- KHÔNG có guardian section (đã set khi mua, KHÔNG đổi)
- CTA bottom: "Lưu thay đổi" (disabled until dirty + valid)

**States:** like Edit Profile S-PROFILE-02 in EPIC-1 — dirty/clean/submitting/success/error

**Endpoint:**

| Element | Spec |
|---------|------|
| Method | POST hoặc PUT (tùy backend) |
| Path | `/athlete/register?code_value={value}` (full register) HOẶC `/athlete/simple-edit?athlete_id={id}` (basic edit) |
| Auth | Bearer Required |
| Request (clean SDK) | `EditAthleteInput` (camelCase) |
| Backend legacy | snake_case payload từ `mapFormDataToPayload` |
| Response | 200 + updated ticket |
| SDK normalize | YES — camelCase → snake_case |

**PAUSE-EPIC4-01:** Backend confirm — `POST /athlete/register` (full) vs `PUT /athlete/simple-edit` (basic) — khi nào dùng cái nào? BA recommend: simple edit cho update info đơn giản (name, phone, size); full register cho first-time register (chưa có athlete profile gắn ticket).

---

### S-TICKETS-04: Change Course (REWRITE rev2 — 3-step state machine)

**Route:** `/tickets/[id]/change-course`

**State management:** Zustand store `useChangeCourseStore` với:
```typescript
{
  step: 0 | 1 | 2;
  selectedCourseId: string | null;
  estimateData: EstimateChangeResponse | null;
  paymentMethod: PaymentMethod | null;
  paymentConfirm: { txnId: string } | null;
}
```

**3-Step Flow Overview:**

```
Step 0: Course Picker + Fee Preview
  │
  ▼ (user select new course + view fee)
Step 1: Athlete Form (update fields per course-specific requirements)
  │
  ▼ (form valid)
Step 2: Payment (ONLY if fee > 0 — reuse EPIC-3 S-CHECKOUT-04/05)
  │
  ▼ (payment success OR fee=0 OR refund)
Commit → PUT /codes/change-course → back to S-TICKETS-02 refreshed
```

#### Step 0 — Course Picker + Fee Preview

**Wireframe:** (giữ wireframe rev1 hiện tại, add stepper indicator top)

```
┌─────────────────────────────────────┐
│ ←  Đổi cự ly                        │
├─────────────────────────────────────┤
│ ● ─── ○ ─── ○                       │  ← stepper 3 dots (Step 1/3 active)
├─────────────────────────────────────┤
│ Vé hiện tại:                         │
│ ┌─────────────────────────────────┐ │
│ │ Saigon Marathon · 5 km           │ │
│ │ BIB A1234                        │ │
│ │ 200.000đ (đã thanh toán)         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ── Chọn cự ly mới ──────────────── │
│ [course radios — exclude current]   │
│                                     │
│ ── Chi tiết chi phí ─────────────── │
│ (Pattern P2 fee preview — show "Đang tính..." khi loading,
│  show breakdown khi loaded)         │
│                                     │
├─────────────────────────────────────┤
│  [Tiếp tục]                          │  ← step 0 → step 1
└─────────────────────────────────────┘
```

**Step 0 actions:**
- Tap course radio → trigger `getEstimateChangeCourse` API → update store `estimateData` + show breakdown
- Tap "Tiếp tục" (CTA enabled khi `estimateData !== null`) → go step 1

#### Step 1 — Athlete Form Update

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Đổi cự ly                        │
├─────────────────────────────────────┤
│ ● ─── ● ─── ○                       │  ← Step 2/3 active
├─────────────────────────────────────┤
│ ── Thông tin VĐV (cập nhật) ────── │
│                                     │
│ ℹ️ Course mới có yêu cầu khác:      │  ← banner info if course-specific
│   "21km yêu cầu giấy khám SK"       │
│                                     │
│ [form reuse từ S-CHECKOUT-02       │
│  athlete form pattern, with        │
│  course.min_age + course-specific  │
│  required fields enforce]           │
│                                     │
├─────────────────────────────────────┤
│  [Quay lại]    [Tiếp tục]           │
└─────────────────────────────────────┘
```

**Step 1 logic:**
- Pre-fill form với current athlete data
- Conditionally show new fields based on `to_course.required_fields[]` (vd: 21km có thể cần `medical_cert_url`)
- Age validation re-check với `course.min_age` của course mới (BR-CHECKOUT-26)
- Submit → validate all → update store → go step 2 nếu fee > 0, hoặc commit directly nếu fee ≤ 0

#### Step 2 — Payment (Conditional)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Đổi cự ly                        │
├─────────────────────────────────────┤
│ ● ─── ● ─── ●                       │  ← Step 3/3 active
├─────────────────────────────────────┤
│ ── Thanh toán chênh lệch ─────── │
│ Phí chênh lệch: 300.000đ            │
│                                     │
│ ── Chọn phương thức ──────────── │
│ [reuse EPIC-3 S-CHECKOUT-04        │
│  payment method picker]             │
│                                     │
├─────────────────────────────────────┤
│  [Thanh toán 300k]                  │  ← reuse EPIC-3 WebView flow
└─────────────────────────────────────┘
```

**Step 2 flow:**
- Nếu `estimateData.changeCourseFee > 0` → render step 2 (payment)
- Nếu `estimateData.changeCourseFee <= 0` (free hoặc refund) → SKIP step 2, commit directly với confirm dialog
- Payment success → store `paymentConfirm.txnId` → commit `PUT /codes/change-course` với confirm payload
- Reuse EPIC-3 S-CHECKOUT-05 Payment WebView + S-CHECKOUT-06 Result screens (KHÔNG duplicate)

#### Step navigation UI

| Step | Header back behavior | "Quay lại" CTA |
|------|---------------------|----------------|
| 0 | Pop screen → S-TICKETS-02 | N/A (only "Tiếp tục") |
| 1 | Back to step 0 | Tap → step 0 |
| 2 | Back to step 1 với confirm dialog "Huỷ thanh toán?" | Tap → step 1 |

**TC-TICKETS-30 (NEW rev2):** 3-step flow happy path — fee > 0:
- Step 0: select course mới → estimate API → show fee 300k → tap Tiếp tục
- Step 1: form pre-fill, update if needed → tap Tiếp tục
- Step 2: select payment method → tap Thanh toán → WebView gateway → success
- Commit `PUT /codes/change-course` với payment ref → back S-TICKETS-02 refreshed

**TC-TICKETS-31 (NEW rev2):** 3-step flow fee ≤ 0 (refund):
- Step 0 → Step 1 → SKIP Step 2 (fee = -50k refund)
- Confirm dialog "Xác nhận đổi (hoàn 50.000đ)" → commit directly → success

---


### S-TICKETS-05: Transfer BIB (REWRITE rev2 — 2-flow conditional)

**Route:** `/tickets/[id]/transfer`

**Conditional flow:** Dựa `race.required_transfer_fee: boolean` (từ ticket.race data):
- `false` → **Flow A: Simple Free Transfer** (single screen + confirm dialog)
- `true` → **Flow B: Paid Transfer** (2-screen wizard: recipient info → payment)

#### Flow A: Free Transfer (race.required_transfer_fee === false)

**Wireframe:** (giống rev1)
```
┌─────────────────────────────────────┐
│ ←  Chuyển BIB                       │
├─────────────────────────────────────┤
│ Vé: Saigon Marathon · BIB A1234     │
│                                     │
│ ⚠️ Chuyển BIB không thể hoàn tác.  │  ← warning amber banner
│                                     │
│ ── Người nhận ──────────────────── │
│ [Email người nhận *]                │
│                                     │
│ ── Lời nhắn (tuỳ chọn) ────────── │
│ [textarea max 200]                  │
│                                     │
├─────────────────────────────────────┤
│  [Chuyển BIB]                        │  ← destructive primary
└─────────────────────────────────────┘
```

**Form fields:**

| Field | Label | Type | Required | Validation | Error |
|-------|-------|------|----------|------------|-------|
| `receipt_email` | Email người nhận | email | ✅ | BR-AUTH-01 + khác email user hiện tại + getUserByEmail check exists | "Email không hợp lệ" / "Không thể chuyển cho chính mình" / "Email chưa có tài khoản" |
| `message` | Lời nhắn | textarea | ⚪ | max 200, trim | "Tối đa 200 ký tự" |

**Flow A behavior:**
- User fill email + tap CTA → frontend validate (regex + getUserByEmail)
- Confirm dialog destructive: "Chuyển BIB A1234 cho {email}? Hành động không thể hoàn tác."
- Confirm → POST `/athlete/transfer` body `{message}` query `code_value + receipt_email`
- Success → toast "Đã chuyển BIB thành công" + back to ticket list (refetch, ticket → "Đã chuyển" tab)
- Error → toast với message mapped từ error code (xem BR-TICKETS-20)

#### Flow B: Paid Transfer (race.required_transfer_fee === true)

**Screen 1 — Recipient Info + Fee Preview:**

```
┌─────────────────────────────────────┐
│ ←  Chuyển BIB                       │
├─────────────────────────────────────┤
│ ● ─── ○                              │  ← stepper 2 dots, step 1/2
├─────────────────────────────────────┤
│ Vé: Saigon Marathon · BIB A1234     │
│                                     │
│ ⚠️ Race này yêu cầu phí chuyển BIB │  ← banner warning amber
│                                     │
│ ── Phí chuyển ───────────────────  │
│ Phí: 50.000đ                         │  ← từ race.transfer_fee
│ Phí thanh toán khi xác nhận          │
│                                     │
│ ── Người nhận ──────────────────── │
│ [Email người nhận *]                │
│                                     │
│ ── Lời nhắn (tuỳ chọn) ────────── │
│ [textarea max 200]                  │
│                                     │
├─────────────────────────────────────┤
│  [Tiếp tục thanh toán]               │
└─────────────────────────────────────┘
```

**Screen 2 — Payment:**

```
┌─────────────────────────────────────┐
│ ←  Chuyển BIB                       │
├─────────────────────────────────────┤
│ ● ─── ●                              │  ← Step 2/2
├─────────────────────────────────────┤
│ Người nhận: b@example.com           │
│ Phí: 50.000đ                         │
│                                     │
│ ── Phương thức thanh toán ──────── │
│ [reuse EPIC-3 S-CHECKOUT-04        │
│  payment method picker bottom sheet]│
│                                     │
├─────────────────────────────────────┤
│  [Thanh toán & chuyển 50k]          │
└─────────────────────────────────────┘
```

**Flow B behavior:**
1. Screen 1: user fill email + message + tap "Tiếp tục thanh toán"
2. Validate email (regex + getUserByEmail) + lock fields
3. Navigate Screen 2
4. User select payment method + tap "Thanh toán & chuyển"
5. WebView gateway (reuse EPIC-3 S-CHECKOUT-05) → payment success
6. POST `/athlete/transfer` với payment ref + recipient email + message
7. Success → toast "Đã chuyển BIB thành công + đã trừ phí 50.000đ" + back to ticket list
8. Cancel mid-payment Screen 2 → confirm dialog → back to Screen 1 (preserve email/message values)

**All States cho cả 2 flow:**

| State | Spec |
|-------|------|
| Initial | Form empty, CTA disabled |
| Email typing | Debounce 500ms → getUserByEmail validate exists |
| Email valid + exists | CTA enabled |
| Email invalid format | Inline error red |
| Email = self | Inline error "Không thể chuyển cho chính mình" |
| Email không exist (backend) | Inline error red + suggestion text "Email chưa có tài khoản. [Mời đăng ký →]" |
| Flow A submit confirm | Dialog destructive 2 buttons |
| Flow A submitting | CTA spinner |
| Flow B step 1 → 2 | Navigation, preserve form state via Zustand |
| Flow B payment WebView | Reuse EPIC-3 flow |
| Success (both flows) | Toast green + back to list refetch |
| Error (mapped from 8 codes) | Toast với specific message tiếng Việt (BR-TICKETS-20) |

#### Error code mapping (BR-TICKETS-20 — 8 codes)

```typescript
const TRANSFER_ERROR_MESSAGES: Record<string, string> = {
  'OUTSIDE_TRANSFER_PERIOD': 'Ngoài thời gian chuyển nhượng',
  'RACE_REASSIGN_TIME_INVALID': 'Chưa đến giờ chuyển BIB',
  'CANNOT_TRANSFER_ZERO_PRICE': 'Không thể chuyển vé miễn phí',
  'SAME_RECEIVER': 'Không thể chuyển cho chính mình',
  'EMAIL_NOT_EXIST': 'Email người nhận chưa có tài khoản',
  'TICKET_ALREADY_TRANSFERRED': 'Vé đã được chuyển trước đó',
  'RACE_FINISHED': 'Race đã kết thúc, không thể chuyển',
  'EXCEED_MAX_TRANSFER_COUNT': 'Vé đã đạt giới hạn số lần chuyển',
};

const errorMessage = TRANSFER_ERROR_MESSAGES[response.error_code] || 'Không thể chuyển BIB. Vui lòng thử lại sau.';
toast.error(errorMessage);
```

**UI behavior per error type:**
- `SAME_RECEIVER` / `EMAIL_NOT_EXIST` → inline red on email field (KHÔNG toast)
- Other 6 codes → toast top dismissable + Sentry breadcrumb log
- KHÔNG show alert dialog (less intrusive)

#### Endpoint (KHÔNG đổi):

| Element | Spec |
|---------|------|
| Method | POST |
| Path | `/athlete/transfer` |
| Auth | Bearer Required |
| Request (clean SDK Flow A) | `{ codeValue, receiptEmail, message? }` |
| Request (clean SDK Flow B) | `{ codeValue, receiptEmail, message?, paymentRef: { txnId, amount } }` |
| Backend legacy | query params `?code_value=X&receipt_email=Y` + body `{message, payment_ref?}` |
| Response success | `200 + { transferId, transferredAt }` |
| Response error | `4xx + { error_code, message }` |
| SDK normalize | YES — split input clean → query + body legacy |

#### Test cases TC-TICKETS-XX rev2 transfer:

- `TC-TICKETS-32 (NEW)`: Flow A happy — `required_transfer_fee=false`, email valid + exists → confirm → POST → success
- `TC-TICKETS-33 (NEW)`: Flow B happy — `required_transfer_fee=true`, complete payment → POST với paymentRef → success
- `TC-TICKETS-34 (NEW)`: Flow B cancel mid-payment screen 2 → confirm dialog → back screen 1 với preserved values
- `TC-TICKETS-35 (NEW)`: Error `SAME_RECEIVER` → email field inline red, KHÔNG toast
- `TC-TICKETS-36 (NEW)`: Error `EMAIL_NOT_EXIST` → email field red + invite link suggestion
- `TC-TICKETS-37 (NEW)`: Error `OUTSIDE_TRANSFER_PERIOD` → toast top + Sentry log
- `TC-TICKETS-38 (NEW)`: Edge case `required_transfer_fee=true` nhưng `transfer_fee=0` → treat as Flow A (no payment screen)
- `TC-TICKETS-39 (NEW)`: Email debounce — type "ab@" 100ms → "ab@c.c" 200ms → 1 API call fire sau 500ms từ "ab@c.c"

---

### S-TICKETS-06: Rolling BIB Gamification (NEW rev2)

**Route:** `/tickets/[id]/rolling-bib`

**Entry point:** S-TICKETS-02 ticket detail → tap button "Đổi BIB number" (only show khi `basic_info.available_to_roll === true`)

**State machine (4 states):**

```
[NoBIB]  ───tap "Thử ngay"──▶  [RollingBIBModal]
   │                                  │
   │                                  ▼ (3s spin)
   │                          [ConfirmBIB]
   │                          ├──tap "Chọn lại"──▶ back to NoBIB
   │                          └──tap "Xác nhận"──▶ [Success]
   │                                                    │
   │                                                    ▼
   └─────────────────────────────────────────── back to S-TICKETS-02
```

#### State 1 — NoBIB (Pre-roll)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Đổi BIB                          │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │  ← Card gradient purple.700 → blue.600
│   │                             │   │     padding space.7
│   │      🎲 Random BIB           │   │  ← heading.h2 white
│   │                             │   │
│   │      ?  ?  ?  ?  ?           │   │  ← 5 question marks text-[24px] white
│   │                             │   │     spaced flex justify-evenly
│   │                             │   │
│   │   Quay BIB ngẫu nhiên cho   │   │  ← body.md white opacity 0.9
│   │   số đẹp hơn                │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   ⚠ Chỉ được đổi 1 lần              │  ← body.sm warning amber
│                                     │
├─────────────────────────────────────┤
│   [Thử ngay 🎲]                      │  ← primary lg full, sticky bottom
└─────────────────────────────────────┘
```

**Components used:** Header (back button), GradientCard (custom với `expo-linear-gradient`), Question marks placeholder, Warning text, Sticky bottom CTA primary

**States:**
- Initial: card render, CTA enabled
- Tap CTA → transition to State 2 (RollingBIBModal)

#### State 2 — RollingBIBModal (Spin Animation)

**Wireframe:**
```
┌─────────────────────────────────────┐
│  ✕  Đang quay BIB...                │  ← header close + title
├─────────────────────────────────────┤
│                                     │
│      [SlotMachine illustration]     │  ← centered, asset SVG
│                                     │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │  ← 4 slot boxes spinning
│   │  3  │ │  8  │ │  1  │ │  5  │  │     RollingNumber component
│   └─────┘ └─────┘ └─────┘ └─────┘  │     bg primary-500 cyan #36BFFA
│                                     │     text white text-[40px] bold
│                                     │
│   "Đang chọn BIB may mắn..."        │  ← body.md center white
│                                     │
├─────────────────────────────────────┤
│   [Hủy]                              │  ← ghost lg (allow cancel mid-spin)
└─────────────────────────────────────┘
```

**Animation specs:**
- 4 slot boxes spin với SlotCounter library (hoặc custom `Animated.Value` cycling 0-9)
- Duration: 3000ms (`ANIMATION.GAMIFICATION`)
- Easing: ease-out (slow at end)
- Haptic: `expo-haptics` impactLight every ~100ms tick
- Reduce motion respect: nếu `prefersReducedMotion` → skip animation, show random number directly + small fade-in

**States:**
- Spinning (0-2900ms): boxes cycling random digits
- Slowing (2700-3000ms): boxes settle to final digit one-by-one (left to right, 100ms stagger)
- Done (3000ms + 200ms delay): trigger transition to State 3 (ConfirmBIB)
- Cancel: tap ✕ hoặc "Hủy" → confirm dialog "Hủy quay? BIB hiện tại sẽ giữ nguyên" → if confirm → back to S-TICKETS-02 (KHÔNG state NoBIB)

**Components:** Modal full-screen overlay (dark backdrop), SlotMachine SVG (asset cần Claude Design hoặc Coder source), RollingNumber component (4 instances), Caption, Ghost cancel button

**Implementation note:**

```typescript
// Pseudo-code state machine
const [phase, setPhase] = useState<'spin' | 'settle' | 'done'>('spin');
const newBIB = await rollingBib();  // API call parallel với spin

useEffect(() => {
  const spinTimer = setTimeout(() => setPhase('settle'), 2700);
  const doneTimer = setTimeout(() => {
    setPhase('done');
    setConfirmBIB(newBIB);
    transitionToState3();
  }, 3000 + 200);
  return () => { clearTimeout(spinTimer); clearTimeout(doneTimer); };
}, []);
```

#### State 3 — ConfirmBIB (Result Preview)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  BIB mới của bạn                  │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │  ← Gradient card purple-700 → blue-600
│   │                             │   │
│   │       🎉 BIB MAY MẮN!        │   │  ← display.md white bold
│   │                             │   │
│   │         3815                 │   │  ← display.lg text-[60px] white bold
│   │                             │   │     mono font for digits
│   │                             │   │
│   │   Saigon Marathon 2026 · 5km│   │  ← body.md white opacity 0.85
│   │                             │   │
│   │   ⏱ Còn lại: 04:23:15        │   │  ← mono.md gold #FEC84B bold
│   │      để xác nhận              │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│   [Chọn lại]    [Xác nhận BIB]      │  ← 2 buttons side-by-side
│   ghost lg       primary lg          │
└─────────────────────────────────────┘
```

**Countdown logic (BR-TICKETS-17):**
- Source: `rolling_bib_valid_until` timestamp từ backend response
- Hook: `useCountDown(rollingBibValidUntil)` custom — return `{hours, minutes, seconds, hasExpired}`
- Format: `HH:MM:SS` bold gold `color.countdown.text = #FEC84B`
- Tick: every 1s update display
- On expire: auto navigate back S-TICKETS-02 + toast warning "Hết thời gian xác nhận BIB, vui lòng thử lại nếu muốn"

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Tap "Chọn lại" | Confirm dialog "Quay lại lần nữa? Lần quay này sẽ huỷ" → if confirm → state 2 reset (call rollingBib() API again) |
| 2 | Tap "Xác nhận BIB" | Show spinner overlay → POST commit confirm endpoint (TBD backend) → success → state 4 |
| 3 | Tap back ← | Same as "Chọn lại" |
| 4 | Countdown = 0 | Auto navigate back S-TICKETS-02 + toast |

**PAUSE-EPIC4-09 (NEW rev2):** Backend confirm endpoint commit Rolling BIB chính xác là gì? Spec backend rollingBib API trả về cả `new_bib_value` và lock period, nhưng confirm endpoint riêng để finalize chưa rõ. Có thể single endpoint `PUT /athlete/rolling-bib` đã commit luôn — nếu vậy state 3 chỉ là preview, KHÔNG có second call. Verify spot-check trong SDK extract phase.

#### State 4 — Success (Final BIB Card)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  BIB của bạn                      │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │  ← Card white bg, radius.xl
│   │ ───────────────────────────  │   │
│   │  BIB · 5 KM                  │   │  ← header bar primary-600 bg
│   │ ───────────────────────────  │   │     text white label.lg
│   │                             │   │
│   │         3815                 │   │  ← display.lg text-6xl bold
│   │                             │   │     primary-900 color
│   │                             │   │
│   │   Saigon Marathon 2026       │   │  ← heading.h2 center
│   │                             │   │
│   │ ─────────────────────────   │   │  ← gradient footer bar
│   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │     purple → blue
│   └─────────────────────────────┘   │
│                                     │
│   ✅ Đã xác nhận BIB của bạn!        │  ← body.lg semantic.success
│                                     │
├─────────────────────────────────────┤
│   [Xem chi tiết vé]                  │  ← primary lg full
│   [Chia sẻ BIB]                      │  ← outline lg full (Phase 2)
└─────────────────────────────────────┘
```

**Actions:**
- Tap "Xem chi tiết vé" → navigate S-TICKETS-02 với refreshed data (new BIB)
- Tap "Chia sẻ BIB" → native share intent (Phase 2 — MVP defer)
- Tap back ← → S-TICKETS-02

**On mount (state 4):**
- Trigger `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` — celebrate haptic
- Fade-in animation 400ms cho card
- Confetti animation (optional Phase 2 — defer MVP)

---

#### All UI states summary cho S-TICKETS-06

| Master state | Sub-state | UI |
|--------------|-----------|----|
| State 1 NoBIB | Initial | Card gradient + ? placeholders + CTA "Thử ngay" |
| State 1 NoBIB | Loading API check | Skeleton card + disabled CTA |
| State 2 RollingBIBModal | Spinning | Slot boxes cycling + Hủy CTA |
| State 2 RollingBIBModal | Settling | Boxes settle left-to-right 100ms stagger |
| State 2 RollingBIBModal | Cancel confirm | Alert dialog |
| State 3 ConfirmBIB | Initial render | BIB display + countdown ticking |
| State 3 ConfirmBIB | Countdown active | Tick every 1s |
| State 3 ConfirmBIB | Countdown expired | Auto navigate back + toast |
| State 3 ConfirmBIB | Submitting confirm | Spinner overlay, buttons disabled |
| State 3 ConfirmBIB | Error commit | Toast error + buttons re-enabled |
| State 4 Success | Initial | Fade-in card + success haptic + green checkmark |

**Components needed (cho Claude Design generate):**

| Component | Spec |
|-----------|------|
| `<GradientCard>` | Wrapper với `expo-linear-gradient` purple.700 → blue.600 |
| `<RollingNumber>` | Single slot box với animated digit cycling |
| `<SlotMachine>` | SVG illustration (asset cần generate) |
| `<CountdownTimer>` | Hook + display HH:MM:SS với color prop |
| `<BIBNumberCard>` | White card với header bar + center BIB + footer gradient |
| `<ConfirmDialog>` | Reuse từ design-system #7 Modal pattern |

**Endpoint:**

| Element | Spec |
|---------|------|
| Method | PUT |
| Path | `/athlete/rolling-bib` |
| Auth | Bearer Required |
| Request body | (TBD — verify spot-check, có thể empty body với ticket context từ token) |
| Response (clean SDK) | `{ newBib: string, validUntil: string }` (ISO timestamp) |
| Status | 200 / 401 / 410 (no longer available) / 500 |
| SDK normalize | YES — legacy snake → clean camel |

**Test cases TC-TICKETS-XX cho Rolling BIB:**

- `TC-TICKETS-21 (NEW)`: State 1 → tap CTA → State 2 transition + API call fired
- `TC-TICKETS-22 (NEW)`: State 2 spin animation 3s + haptic ticks
- `TC-TICKETS-23 (NEW)`: State 2 cancel mid-spin → confirm dialog → back to S-TICKETS-02 (KHÔNG mất BIB hiện tại)
- `TC-TICKETS-24 (NEW)`: State 3 countdown ticking real-time, auto-navigate khi 0
- `TC-TICKETS-25 (NEW)`: State 3 → tap "Chọn lại" → confirm → back to State 2 (new API call)
- `TC-TICKETS-26 (NEW)`: State 3 → tap "Xác nhận" → API success → State 4 + success haptic
- `TC-TICKETS-27 (NEW)`: State 4 → tap "Xem chi tiết vé" → S-TICKETS-02 với BIB mới
- `TC-TICKETS-28 (NEW)`: Network fail mid-roll → toast error + back to State 1
- `TC-TICKETS-29 (NEW)`: `prefersReducedMotion=true` → skip spin animation, jump direct State 3

---

### S-ORDERS-01: My Orders List (Tab)

**Route:** `/(tabs)/orders` (bottom tab)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ 📋 Đơn hàng                         │
├─────────────────────────────────────┤
│ [Đã thanh toán] [Chờ] [Đã huỷ]      │  ← filter tabs
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Đơn #ORD-2026-A1234             │ │
│ │ 15/01/2026                       │ │
│ │ Saigon Marathon · 5 km           │ │
│ │ Tổng: 180.000đ                   │ │
│ │ [✓ Đã thanh toán]                │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ... more orders                  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Endpoint:**

| Method | GET `/order?financialStatus=paid&pageNo=X&pageSize=10&sortField=created_at&sortDirection=DESC` |
| SDK normalize | `financialStatus` clean → backend `finalcial_status` (typo intentional, backend has typo) |

```typescript
interface MyOrdersInput {
  financialStatus?: 'paid' | 'pending' | 'voided' | 'failed';
  internalStatus?: string;
  pageNo?: number;
  pageSize?: number;
  sortField?: 'created_at';
  sortDirection?: 'ASC' | 'DESC';
}

interface MyOrdersResponse {
  items: Order[];
  pagination: {...};
}

interface Order {
  id: string;
  orderNumber: string;        // "ORD-2026-A1234"
  raceId: string;
  raceName: string;
  courseId: string;
  courseName: string;
  athleteName: string;
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  financialStatus: 'paid' | 'pending' | 'voided' | 'failed';
  internalStatus: string;
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  ticketId?: string;
}
```

**States, actions:** similar to S-TICKETS-01 list pattern.

---

### S-ORDERS-02: Order Detail

**Route:** `/orders/[id]`

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Đơn #ORD-2026-A1234              │
├─────────────────────────────────────┤
│ [✓ Đã thanh toán]                   │  ← status badge prominent
│ Ngày: 15/01/2026 14:23              │
│                                     │
│ ── Sản phẩm ──────────────────────  │
│ Saigon Marathon 2026                │
│   5 km · BIB A1234                  │
│   VĐV: Nguyễn Văn A                 │
│   200.000đ                          │
│                                     │
│ ── Chi tiết ─────────────────────── │
│ Subtotal              200.000đ       │
│ Mã giảm (NHAPMA20)  − 20.000đ       │
│ ──────────────────────────────────  │
│ Tổng cộng             180.000đ       │
│                                     │
│ ── Thanh toán ──────────────────── │
│ Phương thức: PayX QR                │
│ Mã giao dịch: TXN-XXX               │
│ Ngày thanh toán: 15/01/2026 14:25   │
│                                     │
│ ── Vé liên quan ───────────────────  │
│ [Xem vé →]                           │  ← navigate ticket detail
│                                     │
│ [Tải hoá đơn PDF]                    │  ← Phase 2
└─────────────────────────────────────┘
```

**Endpoint:** `GET /order/by-id?order_id=X` (auth)

---

## 🧪 Test Cases TC-TICKETS-XX

### TC-TICKETS-01: List tickets happy path
| GET `/codes/fetch-by-user?sortDirection=DESC&pageNo=1&code_statuses=ACTIVE` |
| 200 + paginated tickets clean shape |
| MUST NOT leak: internal `_id`, `merchant_id`, `created_by` |

### TC-TICKETS-02: List tickets unauthenticated
| 401 |

### TC-TICKETS-03: Ticket detail
| GET `/codes/get/{id}` Bearer | 200 + full Ticket |
| Side effect verify: SQLite cache write |

### TC-TICKETS-04: Ticket IDOR attempt
| User A token, GET `/codes/get/{userBTicketId}` | 403 |

### TC-TICKETS-05: Estimate change course happy
| GET `/codes/estimate/change-course?code_value=V&to_course_id=C` Bearer |
| 200 + `{changeCourseFee: 300000, finalValue: 500000, note: "..."}` |

### TC-TICKETS-06: Estimate change course - same course
| `to_course_id` === current course | 400 + "Cùng cự ly hiện tại" |

### TC-TICKETS-07: Commit change course - fee positive (need payment)
| PUT `/codes/change-course` body=`{paymentConfirm: {...}}` |
| 200 + updated ticket with new course |
| Side effect: payment recorded, BIB possibly re-assigned |

### TC-TICKETS-08: Commit change course - fee negative (refund)
| PUT `/codes/change-course` no payment |
| 200 + refund pending notice in response |

### TC-TICKETS-09: Transfer happy path
| POST `/athlete/transfer?code_value=V&receipt_email=b@test.com` body `{message: ""}` |
| 200 + transfer record |
| Side effect: ticket status → TRANSFERRED, new user ownership |

### TC-TICKETS-10: Transfer to self
| receipt_email === user's email | 400 + "Không thể chuyển cho chính mình" |

### TC-TICKETS-11: Transfer to non-existent email
| Backend behavior: 200 + invite sent OR 404 + "Email chưa đăng ký" |
| **PAUSE-EPIC4-02:** confirm backend strategy |

### TC-TICKETS-12: Transfer already transferred ticket
| Ticket status = TRANSFERRED | 409 + "Vé đã chuyển" |

### TC-TICKETS-13: List orders by financial status
| GET `/order?finalcial_status=paid` Bearer | 200 + paid orders |
| ⚠️ Note: backend has typo `finalcial_status` (not `financial_status`) |

### TC-TICKETS-14: Order detail IDOR
| User A get user B order | 403 |

### TC-TICKETS-15: Edit athlete info (simple)
| PUT `/athlete/simple-edit?athlete_id=A` Bearer body `{name_on_bib: "NEW"}` |
| 200 + updated athlete |

### TC-TICKETS-16: Edit after cutoff
| Race close_for_edit < now | 403 + "Đã đóng chỉnh sửa" |

### TC-TICKETS-17: Rolling BIB
| PUT `/athlete/rolling-bib` Bearer | 200 + new BIB number |

### TC-TICKETS-18: Rolling BIB after expiry
| `rolling_bib_valid_until < now` | 400 + "Hết hạn đổi BIB" |

### TC-TICKETS-19: Offline tickets list
| Airplane mode, prior cache available | Show cached list + offline banner |

### TC-TICKETS-20: Concurrent transfer (race condition)
| 2 transfers same ticket concurrent (Promise.all) | 1 success + 1 conflict 409 |

---

## ⚡ Performance SLA

| Metric | Target |
|--------|--------|
| Tickets list cold render | < 1s (cache) / < 2s (fresh) |
| Ticket detail render | < 1s (cache) / < 1.5s (fresh) |
| Estimate change course | < 2s p95 |
| Commit change course | < 3s p95 (without payment); + payment flow time if applicable |
| Transfer BIB | < 2s p95 |
| Orders list render | < 1.5s p95 |
| QR thumbnail in list | render từ ticket.value KHÔNG fetch image (client-gen) |

---

## 🛑 PAUSE Conditions

- [ ] **PAUSE-EPIC4-01:** `simpleEditAthlete` vs `register` — khi nào dùng cái nào? Backend logic explain.
- [ ] **PAUSE-EPIC4-02:** Transfer to non-existent email — backend invite flow hay 404?
- [ ] **PAUSE-EPIC4-03:** Backend typo `finalcial_status` confirmed? SDK normalize fix typo `financialStatus` cho consumer.
- [ ] **PAUSE-EPIC4-04:** Change course with fee — payment flow integrate với EPIC-3 flow như thế nào? Backend hold reservation cho new course while user pays?
- [ ] **PAUSE-EPIC4-05:** Refund cho change course (fee < 0) — frontend display only hay có endpoint riêng để track refund status?
- [ ] **PAUSE-EPIC4-06:** Rolling BIB endpoint detail — `PUT /athlete/rolling-bib` body? Verify.
- [ ] **PAUSE-EPIC4-07:** Edit cutoff date — backend field nào? `race.close_for_edit_at`? `course.editable_until`?
- [ ] **PAUSE-EPIC4-08:** Invoice PDF endpoint — Phase 2, defer hoặc backend đã có?

## ✅ Status

- [x] DRAFT
- [x] READY (Wave 2 COMPLETE — 4/4 files)

---

## 🎯 Wave 2 SUMMARY

| File | Screens | BR count | TC count |
|------|---------|----------|----------|
| epic-2-browsing | 9 | 14 | 10 |
| epic-3-checkout | 7 | 20 | 18 |
| epic-4-tickets | 7 | 14 | 20 |
| epic-5-result | 5 | 10 | 11 |
| **TOTAL Wave 2** | **28 screens** | **58 BR** | **59 TC** |

→ Wave 2 ready. BA chờ Manager `/5bib-plan` review APPROVE → write Wave 3 (EPIC-6 E-Waiver + EPIC-7 Check-in).
