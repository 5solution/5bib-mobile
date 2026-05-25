# FEATURE-003: EPIC-3 — Checkout & Payment

**Status:** 🔵 READY rev2 (2026-05-25) — Updated per Manager deep audit + Danny decisions: +VAT toggle, +Buy-group tiers, +Rolling BIB ref, -Insurance dropped, +zero-total skip gateway, +age-at-event-date, +name regex UPPERCASE
**Author:** 5bib-po-ba
**Wave:** 2 of 4
**Linked:** [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md), [epic-2-browsing](01-ba-prd-epic-2-browsing.md)
**Audience:** Claude Design + Coder

---

## 📌 Pre-flight check

- [x] Wave 1 + EPIC-2 đã READY
- [x] Spot-check `src/services/order/index.ts`, `src/services/priceRule/index.ts`, `src/services/athlete/index.ts` (athlete register), `src/constants/payment.ts`
- [x] Đọc `src/validations/checkout.validation.ts` để hiểu form athlete

**🔥 Critical findings:**
- `createOrder(payload, race_id)`: race_id qua **query param**, payload là athlete + course info
- `checkoutUrl()`: switch endpoint theo PaymentMethod enum — 8 methods → 3 backend endpoint (`/vnpay/payment`, `/payx/payment`, `/payoo/payment`); OnePay default `/onepay/payment`
- PriceRule endpoint **THẬT là `/price_rule/find-one`** (NOT `/price-rule/validate`)
- Athlete register: `POST /athlete/register?code_value=X` body = athlete info snake_case
- Payment params khác per gateway (vnpay dùng `vnp_BankCode`, payx dùng `return_url`/`payment_method`)

---

## 🎯 EPIC-3 Goal

Cho phép Athlete **mua BIB**: chọn course → nhập athlete info → apply discount → chọn payment method → WebView gateway → success → show QR ticket. Đây là **CORE revenue flow**. Optimize cho conversion: minimize friction, persist draft form, handle deep link return từ gateway.

## 📦 Scope EPIC-3 (REVISED rev2 — 2026-05-25)

| Screen ID | Screen Name | Route | Auth |
|-----------|------------|-------|------|
| S-CHECKOUT-01 | Course selection (entry) | `/checkout?race_id=X&course_id=Y` | **Required** |
| S-CHECKOUT-02 | Athlete info form | (step 2 of checkout flow) | Required |
| **S-CHECKOUT-02b** | **VAT Invoice Toggle (NEW rev2)** | (sub-screen of step 2) | Required |
| S-CHECKOUT-03 | Discount code + Review + **Buy-group tier (NEW rev2)** | (step 3) | Required |
| S-CHECKOUT-04 | Payment method picker (bottom sheet) | (overlay) | Required |
| S-CHECKOUT-05 | Payment WebView | `/checkout/payment-webview?orderId=X&url=Y` | Required |
| S-CHECKOUT-06 | Payment result | `/checkout/result?orderId=X&status=Y` | Required |
| S-CHECKOUT-07 | QR ticket display | `/tickets/[id]/qr` (deep link target) | Required |

### ❌ Scope OUT (REVISED rev2 — explicit drop)

- **Insurance per-ticket checkout — DROPPED MOBILE (Danny 2026-05-25)**
  - Web có toggle "Mua bảo hiểm tai nạn" tại checkout step 3 với price `{N}đ × {qty}`
  - Backend response field `insurance_price` + `allowInsurancePurchase` → mobile **IGNORE**, KHÔNG render checkbox
  - User mua insurance qua web. Mobile giảm friction.
  - Reference: [ux-patterns-reference.md section EPIC-3 #4](01-ba-prd-ux-patterns-reference.md)

---

## 👤 User Stories

- **US-CHECKOUT-01:** As an **Athlete**, I want to **mua BIB cho cự ly đã chọn** so that tham gia race.
- **US-CHECKOUT-02:** As an **Athlete**, I want to **nhập thông tin VĐV** so that BTC có data check-in.
- **US-CHECKOUT-03:** As an **Athlete**, I want to **đăng ký HỘ người khác** (representative) so that mua BIB cho người thân.
- **US-CHECKOUT-04:** As an **Athlete**, I want to **apply discount code** so that giảm chi phí.
- **US-CHECKOUT-05:** As an **Athlete**, I want to **chọn nhiều phương thức thanh toán** so that dùng cái thuận tiện nhất.
- **US-CHECKOUT-06:** As an **Athlete**, I want to **thanh toán qua WebView gateway** so that giao dịch an toàn qua bank chính thức.
- **US-CHECKOUT-07:** As an **Athlete**, I want to **nhận QR ticket ngay sau thanh toán** so that có proof tham gia.
- **US-CHECKOUT-08:** As an **Athlete**, I want to **app remember draft form** nếu tôi thoát giữa chừng so that không phải nhập lại.

---

## 📜 Business Rules (BR-CHECKOUT-XX)

| ID | Business Rule |
|----|--------------|
| BR-CHECKOUT-01 | Checkout BẮT BUỘC login. Anonymous tap → modal đăng nhập (BR-BROWSE-11). |
| BR-CHECKOUT-02 | Quantity per checkout = **1 BIB per order** (mobile MVP). Multi-BIB checkout defer Phase 2. Web có hỗ trợ multi nhưng mobile UX simplified. |
| BR-CHECKOUT-03 | Athlete form có 2 mode: **Tự đăng ký** (default, fill từ user profile) hoặc **Đăng ký hộ** (representative). |
| BR-CHECKOUT-04 | Required fields athlete: `first_name`, `last_name`, `email`, `phone`, `dob`, `gender`, `nationality`, `id_number`, `tshirt_size`, `racekit`, `emergency_contact_name`, `emergency_contact_phone`. |
| BR-CHECKOUT-05 | Đăng ký hộ: thêm fields `delegator_name`, `delegator_phone`, `delegator_email`, `delegator_cccd`. |
| BR-CHECKOUT-06 | Athlete dưới 18 tuổi (tính từ dob vs race date): bắt buộc thêm `guardian_*` fields. |
| BR-CHECKOUT-07 | Discount code: optional. Apply qua `GET /price_rule/find-one?text=X&race_id=Y` → return discount info hoặc 404 nếu invalid. |
| BR-CHECKOUT-08 | Total price = `course.price - discount_amount`. Hiển thị rõ subtotal + discount + final. |
| BR-CHECKOUT-09 | Payment method picker show theo `paymentOptions` constant (filter `disabled: false`). Dev environment show `devPaymentOptions` (subset). |
| BR-CHECKOUT-10 | Order create: `POST /order/create?race_id=X` với body chứa athlete info + course_id + discount_code. Backend trả `order_id`. |
| BR-CHECKOUT-11 | Sau order create → fetch payment URL theo gateway → open WebView. |
| BR-CHECKOUT-12 | WebView restrict navigation: chỉ allow whitelist domain (vnpayment.vn, payx.vn, payoo.vn, onepay.vn). External link → block. |
| BR-CHECKOUT-13 | Deep link return từ gateway: `bib5://payment-return?orderId=X&status=Y` → close WebView + navigate result screen. |
| BR-CHECKOUT-14 | Payment status: `paid` (success) / `pending` (chờ webhook) / `voided` (cancelled) / `failed`. Success criteria: `financial_status === 'paid'`. |
| BR-CHECKOUT-15 | Sau payment success → fetch order detail by id → navigate `/tickets/[id]/qr` (S-CHECKOUT-07). |
| BR-CHECKOUT-16 | Draft form persist trong AsyncStorage key `draft_checkout_{race_id}_{course_id}` — expire sau 24h. Restore khi user re-enter checkout cùng race+course. |
| BR-CHECKOUT-17 | WebView timeout: 10 phút idle → auto close + confirm dialog "Phiên thanh toán hết hạn" + tap "Thử lại" → restart payment flow. |
| BR-CHECKOUT-18 | User tap close WebView mid-payment → confirm dialog "Huỷ giao dịch? Order chưa hoàn tất sẽ tự huỷ sau 15 phút". |
| BR-CHECKOUT-19 | Pending payment → screen show countdown 15 min + auto-poll order status mỗi 10s. Khi `paid` → navigate QR. Khi timeout → "Giao dịch hết hạn, vui lòng thử lại". |
| BR-CHECKOUT-20 | QR ticket cached offline (BR-GLOBAL-02). Sau lần load đầu tiên, ticket data + QR string lưu SQLite. |
| **BR-CHECKOUT-21 (NEW rev2)** | **VAT toggle:** Checkout step 2 có checkbox "Lấy hoá đơn VAT". Khi check → mở section 6 conditional fields (company info). Khi uncheck → ẩn section + clear errors (KHÔNG clear values, để user toggle lại không mất data). Pattern P1 + P7 trong ux-patterns-reference.md. |
| **BR-CHECKOUT-22 (NEW rev2)** | **VAT schema:** Discriminated union zod schema dựa field `vat: boolean`. Nếu `vat=true` → require 6 company fields (company_name, tax, company_address, company_receiver_name, company_phone, company_email). Nếu `vat=false` → KHÔNG require gì thêm. |
| **BR-CHECKOUT-23 (NEW rev2)** | **VAT form reset on toggle:** Khi user toggle VAT → call `methods.reset(undefined, { keepValues: true, keepErrors: true, keepDirtyValues: true, keepTouched: true, keepIsValid: false })` để FORCE re-validate với schema mới mà KHÔNG xoá data đã nhập. |
| **BR-CHECKOUT-24 (NEW rev2)** | **Buy-group discount tier:** Race có thể có `buy_group_conditions: Array<{min_quantity: number, discount_percent: number}>`. Khi `cart.quantity >= condition.min_quantity` → apply tier discount cao nhất match. Mobile MVP single-quantity = 1 → tier rarely apply, nhưng phải implement vì backend luôn return field. Hiển thị badge "🎉 Tiết kiệm {Y}đ khi mua ≥ {N} vé" trong cart breakdown khi applicable. |
| **BR-CHECKOUT-25 (NEW rev2)** | **Zero-total special case:** Nếu order total === 0đ (free event hoặc 100% discount) → backend API `/checkout` trả `status: 266` (ORDER_WITH_TOTAL_EQUAL_ZERO). Mobile SKIP payment gateway flow, navigate trực tiếp `/orders/{orderId}?redirect_from_checkout=true` → display success result screen. |
| **BR-CHECKOUT-26 (NEW rev2)** | **Age validation tại EVENT date (not today):** Validate `dob` against `event_start_date` thay vì `dayjs()` current. Check `course.min_age` per-course (mỗi course có age requirement khác nhau, vd: 21km min 18t, 5km không min). Schema: `getAthleteSchema(eventStartDate)` factory. |
| **BR-CHECKOUT-27 (NEW rev2)** | **Name regex UPPERCASE auto:** `first_name`, `last_name`, `name_on_bib` fields phải auto-convert input → UPPERCASE on change. Regex reject digit + special char: `/^[^0-9!@#$%^&*()_+=[\]{};':"\\|,.<>/?]*$/`. Error: "Tên chỉ chứa chữ cái và khoảng trắng". |
| **BR-CHECKOUT-28 (NEW rev2)** | **Policy link dynamic per race:** Checkbox "Đồng ý điều khoản" KHÔNG hardcode `/policy`. Lấy URL từ `race.race_extension?.url`. Nếu empty → fallback `https://5bib.com/policies/general`. Open link external WebView (KHÔNG inline). |

---

## 🖥️ Per-Screen Spec

### S-CHECKOUT-01: Course Selection (entry)

**Route:** `/checkout?race_id=X&course_id=Y`

> **Note:** EPIC-2 navigate vào đây với race_id + course_id query param. Nếu chỉ có race_id (KHÔNG có course_id) → show course picker step trước.

**Wireframe (when course_id given):**
```
┌─────────────────────────────────────┐
│ ←  Đăng ký giải                     │
├─────────────────────────────────────┤
│ ── Bước 1/3: Xác nhận ────────────  │  ← step indicator
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Saigon Marathon 2026             ││  ← race info card
│  │ 📅 15/03/2026                    ││
│  │ 📍 TP.HCM                        ││
│  └─────────────────────────────────┘│
│                                     │
│  ── Cự ly đã chọn ───────────────── │
│  ┌─────────────────────────────────┐│
│  │ ◉ 5 km                           ││  ← course radio (highlighted)
│  │   200.000đ · Còn 50 vé           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ○ 10 km                          ││
│  │   350.000đ                       ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ○ 21 km                          ││
│  │   500.000đ                       ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│  [Tiếp tục]                          │  ← sticky bottom CTA
└─────────────────────────────────────┘
```

**States:**
- Initial: course pre-selected từ query, CTA enabled
- Course changed: re-fetch course detail (price update)
- Course sold out: that course row disabled với badge "Hết vé"
- All courses sold out: CTA "Hết vé tất cả cự ly", navigate result/news
- Loading: skeleton 3 course cards
- Error: toast + retry

**Actions:**
- Tap course radio → switch selection
- Tap "Tiếp tục" → navigate step 2 (S-CHECKOUT-02)

**Data:**
- Race info: `race` object passed via navigation state or re-fetch
- Course list: `GET /pub/races/course/{raceId}`
- Selected course default: `course_id` query param

---

### S-CHECKOUT-02: Athlete Info Form

**Route:** within `/checkout` flow, step 2

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Đăng ký giải             [Lưu] │  ← save draft icon
├─────────────────────────────────────┤
│ ── Bước 2/3: Thông tin VĐV ──────── │
├─────────────────────────────────────┤
│                                     │
│  [○ Tự đăng ký] [○ Đăng ký hộ]    │  ← segmented control
│                                     │
│  ── Thông tin cá nhân ────────────  │
│                                     │
│  ┌──────────────┐ ┌───────────────┐ │
│  │ Họ *         │ │ Tên *         │ │  ← 2 cols
│  │ Nguyễn       │ │ Văn A         │ │
│  └──────────────┘ └───────────────┘ │
│  ┌─────────────────────────────────┐│
│  │ Email *                          ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Số điện thoại *                  ││
│  └─────────────────────────────────┘│
│  ┌──────────────┐ ┌───────────────┐ │
│  │ Ngày sinh *  │ │ Giới tính *   │ │
│  │ 01/01/1990   │ │ ◯ Nam ◯ Nữ   │ │
│  └──────────────┘ └───────────────┘ │
│  ┌─────────────────────────────────┐│
│  │ Quốc tịch *           [▾]        ││  ← dropdown
│  │ Việt Nam                         ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ CMND/CCCD/Passport *             ││
│  └─────────────────────────────────┘│
│                                     │
│  ── Trang phục ───────────────────  │
│  ┌──────────────┐ ┌───────────────┐ │
│  │ Size áo *    │ │ Racekit *     │ │
│  │ [▾ M]        │ │ [▾ Tiêu chuẩn]│ │
│  └──────────────┘ └───────────────┘ │
│                                     │
│  ── Tên trên BIB ─────────────────  │
│  ┌─────────────────────────────────┐│
│  │ Nguyễn Văn A                     ││  ← max 15 chars
│  └─────────────────────────────────┘│
│                                     │
│  ── Liên hệ khẩn cấp ────────────── │
│  ┌─────────────────────────────────┐│
│  │ Tên người liên hệ *              ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ SĐT liên hệ *                    ││
│  └─────────────────────────────────┘│
│                                     │
│  ── Sức khoẻ (tuỳ chọn) ────────── │
│  ┌─────────────────────────────────┐│
│  │ Nhóm máu          [▾]            ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Tình trạng sức khoẻ              ││
│  │ (textarea 3 lines)               ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Thuốc đang dùng                  ││
│  └─────────────────────────────────┘│
│                                     │
│  ── (Nếu đăng ký hộ) ──────────── │  ← chỉ show khi mode "Đăng ký hộ"
│  Người đại diện:                    │
│  ┌─────────────────────────────────┐│
│  │ Tên người đại diện *             ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ SĐT người đại diện *             ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Email người đại diện *           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ CCCD người đại diện *            ││
│  └─────────────────────────────────┘│
│                                     │
│  ── (Nếu VĐV < 18 tuổi) ────────── │  ← guardian fields conditional
│  Người giám hộ:                     │
│  [tương tự đại diện]                │
│                                     │
├─────────────────────────────────────┤
│  [Quay lại]            [Tiếp tục]   │  ← step nav
└─────────────────────────────────────┘
```

**Form Fields:**

| Field | Label | Type | Required | Validation | Error |
|-------|-------|------|----------|------------|-------|
| `mode` | Mode | segmented | ✅ | `self` \| `represent` | — |
| `first_name` | Họ | text | ✅ | min 1, max 50, trim | "Vui lòng nhập họ" |
| `last_name` | Tên | text | ✅ | min 1, max 50, trim | "Vui lòng nhập tên" |
| `email` | Email | email | ✅ | BR-AUTH-01 | "Email không hợp lệ" |
| `phone` | SĐT | phone | ✅ | regex `^(0\|\+84)[35789][0-9]{8}$` | "SĐT không hợp lệ" |
| `dob` | Ngày sinh | date | ✅ | < race_date - 5y (min 5t), > 1900 | "Vui lòng chọn ngày sinh hợp lệ" |
| `gender` | Giới tính | radio | ✅ | `male` \| `female` \| `other` | "Vui lòng chọn giới tính" |
| `nationality` | Quốc tịch | dropdown | ✅ | from `getProvinces()` country list | "Vui lòng chọn quốc tịch" |
| `id_number` | CMND/CCCD/Passport | text | ✅ | min 5, max 20 alphanumeric | "Số giấy tờ không hợp lệ" |
| `tshirt_size` | Size áo | dropdown | ✅ | enum [XS,S,M,L,XL,XXL] | "Vui lòng chọn size" |
| `racekit` | Racekit | dropdown | ✅ | from race config (`race.racekit_options`) | "Vui lòng chọn racekit" |
| `name_on_bib` | Tên trên BIB | text | ✅ | min 1, max 15, uppercase auto, trim | "Tên trên BIB tối đa 15 ký tự" |
| `emergency_contact_name` | Tên liên hệ khẩn cấp | text | ✅ | min 1, max 100 | "Vui lòng nhập tên" |
| `emergency_contact_phone` | SĐT liên hệ | phone | ✅ | regex VN phone | "SĐT không hợp lệ" |
| `blood_type` | Nhóm máu | dropdown | ⚪ | enum [A,B,AB,O] × [+,-] | — |
| `medical_information` | Tình trạng sức khoẻ | textarea | ⚪ | max 500 | "Tối đa 500 ký tự" |
| `current_medication` | Thuốc đang dùng | textarea | ⚪ | max 500 | — |
| `achievements` | Thành tích | textarea | ⚪ | max 1000 | — |
| `club` | Câu lạc bộ | text | ⚪ | max 100 | — |
| `address` | Địa chỉ | textarea | ⚪ | max 500 | — |
| **Representative (if mode=represent)** |
| `delegator_name` | Tên đại diện | text | ✅ if represent | min 1, max 100 | "Vui lòng nhập tên đại diện" |
| `delegator_phone` | SĐT đại diện | phone | ✅ if represent | regex | "SĐT không hợp lệ" |
| `delegator_email` | Email đại diện | email | ✅ if represent | regex | "Email không hợp lệ" |
| `delegator_cccd` | CCCD đại diện | text | ✅ if represent | regex CCCD VN | "CCCD không hợp lệ" |
| **Guardian (if VĐV < 18t)** |
| `guardian_name` | Tên giám hộ | text | ✅ if < 18 | — | — |
| `guardian_dob` | Ngày sinh giám hộ | date | ✅ if < 18 | adult ≥ 18 | — |
| `guardian_identity` | CCCD giám hộ | text | ✅ if < 18 | — | — |
| `guardian_email` | Email giám hộ | email | ✅ if < 18 | — | — |
| `guardian_phone` | SĐT giám hộ | phone | ✅ if < 18 | — | — |
| `guardian_relation` | Quan hệ giám hộ | dropdown | ✅ if < 18 | enum [cha, mẹ, anh/chị, ...] | — |

**All States:**

| State | Spec |
|-------|------|
| Initial | Form filled với user profile data (firstName, email, phone từ session) hoặc draft từ AsyncStorage |
| Mode switched self ↔ represent | Show/hide delegator section, KHÔNG clear other fields |
| Age < 18 detected (dob change) | Show guardian section + scroll to it |
| Validation error per field | Field border red + helper red + scroll to first error |
| Submitting (validate all) | CTA spinner |
| All valid | CTA "Tiếp tục" enabled |
| Save draft auto | Every field blur → save AsyncStorage (debounce 1s) |
| Restore draft | First mount detect AsyncStorage → toast "Khôi phục dữ liệu chưa lưu" + populate form |

**Components:** Header (custom), Step Indicator (3 dots), Segmented Control, Input (text/email/phone), Date Picker, Radio Group, Dropdown (with search for nationality), Textarea, Conditional sections (collapse), Sticky Bottom Nav

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Switch mode | Show/hide delegator section |
| 2 | Type field | Inline validate on blur, auto-save draft after 1s idle |
| 3 | Change dob | If age < 18 → show guardian section |
| 4 | Tap "Quay lại" | Confirm dialog if dirty "Lưu draft + quay lại?" → back to S-CHECKOUT-01 |
| 5 | Tap "Tiếp tục" | Validate all → navigate step 3 (S-CHECKOUT-03) |
| 6 | Tap "Lưu" icon header | Force save draft to AsyncStorage |

---

### S-CHECKOUT-02b: VAT Invoice Toggle (NEW rev2)

**Route:** sub-section của S-CHECKOUT-02 (cùng route, scroll vào)

**Wireframe (VAT off — initial state):**
```
┌─────────────────────────────────────┐
│ ── Hoá đơn ─────────────────────── │  ← section header
│                                     │
│  ☐ Lấy hoá đơn VAT                  │  ← checkbox (default unchecked)
│  💡 Bật nếu cần hoá đơn cho doanh   │  ← helper text body.sm secondary
│     nghiệp                          │
│                                     │
└─────────────────────────────────────┘
```

**Wireframe (VAT on — expanded state):**
```
┌─────────────────────────────────────┐
│ ── Hoá đơn ─────────────────────── │
│                                     │
│  ☑ Lấy hoá đơn VAT                  │  ← checked
│                                     │
│  ── Thông tin công ty ─────────── │
│  ┌─────────────────────────────────┐│
│  │ Tên công ty *                    ││
│  │ CÔNG TY TNHH ABC                 ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Mã số thuế *                     ││
│  │ 0123456789                       ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Địa chỉ công ty *                ││
│  │ 123 Lê Lợi, Q1, TP.HCM           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Tên người nhận hoá đơn *         ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ SĐT công ty *                    ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Email công ty *                  ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

**Animation:** Expand/collapse `ANIMATION.MEDIUM` (300ms) khi toggle checkbox. Smooth height transition (Reanimated `LayoutAnimation` hoặc `Animated.timing`).

**Form fields (only validated khi VAT=true):**

| Field name | UI label | Type | Required | Validation | Error message | Default |
|------------|----------|------|----------|------------|---------------|---------|
| `vat` | Lấy hoá đơn VAT | checkbox | ⚪ | boolean | — | `false` |
| `company_name` | Tên công ty | text | ✅ if vat=true | min 1, max 255, trim | "Vui lòng nhập tên công ty" | "" |
| `tax` | Mã số thuế | text | ✅ if vat=true | regex `^[0-9]{10}(-[0-9]{3})?$` | "MST sai format (10 chữ số hoặc 10-3)" | "" |
| `company_address` | Địa chỉ công ty | text | ✅ if vat=true | min 5, max 500, trim | "Vui lòng nhập địa chỉ công ty" | "" |
| `company_receiver_name` | Tên người nhận | text | ✅ if vat=true | min 1, max 100, trim | "Vui lòng nhập tên người nhận" | "" |
| `company_phone` | SĐT công ty | phone | ✅ if vat=true | regex `^(0\|\+84)[1-9][0-9]{8,9}$` | "SĐT công ty không hợp lệ" | "" |
| `company_email` | Email công ty | email | ✅ if vat=true | regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` | "Email công ty không hợp lệ" | "" |

**All UI states:**

| State | Spec |
|-------|------|
| **Initial (VAT off)** | Checkbox unchecked, company fields hidden, schema KHÔNG require company fields. Helper text show. |
| **Toggle on (VAT on)** | Checkbox checked, animate expand 300ms, 6 fields slide-in, schema switches to require company fields, scroll-to-first field. |
| **Toggle off (VAT on → off)** | Animate collapse 300ms, 6 fields slide-out, errors clear, schema switch back. **KEEP field values** (user may toggle back). |
| **VAT on + partial fill** | Validate on blur per field, inline error red below field. |
| **VAT on + all filled** | All field borders neutral, no errors, CTA "Tiếp tục" enabled. |
| **VAT on + submit** | Validate all 6 → if invalid scroll-to-first-error + show inline errors. |
| **VAT on + submit valid** | Continue to S-CHECKOUT-03 với VAT data trong order payload. |
| **Submitting** | All inputs disabled, spinner trên CTA. |

**Buttons:**

| Label | Position | Default | Disabled | Loading | Action | Confirm? |
|-------|----------|---------|----------|---------|--------|----------|
| Checkbox "Lấy hoá đơn VAT" | Section top | Unchecked | KHÔNG | N/A | Toggle vat state + form reset | NO |
| Helper info icon (ⓘ) | After helper text | Default | KHÔNG | N/A | Open bottom sheet "Khi nào cần VAT?" | NO |

**Implementation note (Pattern P1 + P7):**

```typescript
// Zod discriminated union (reuse từ web pattern)
const CheckoutVATSchema = z.discriminatedUnion('vat', [
  z.object({
    vat: z.literal(true),
    company_name: z.string().min(1).max(255).trim(),
    tax: z.string().regex(/^[0-9]{10}(-[0-9]{3})?$/),
    company_address: z.string().min(5).max(500).trim(),
    company_receiver_name: z.string().min(1).max(100).trim(),
    company_phone: z.string().regex(/^(0|\+84)[1-9][0-9]{8,9}$/),
    company_email: z.string().email().max(254),
  }),
  z.object({
    vat: z.literal(false).default(false),
  }),
]);

// Form reset on toggle (BR-CHECKOUT-23)
useEffect(() => {
  if (hasVAT !== prevVAT.current) {
    methods.reset(undefined, {
      keepValues: true,
      keepErrors: true,
      keepDirtyValues: true,
      keepTouched: true,
      keepIsValid: false,
    });
    prevVAT.current = hasVAT;
  }
}, [hasVAT, methods]);
```

**Data binding (clean SDK shape):**

```typescript
interface CheckoutPayload {
  // ... existing athlete + order fields
  vat: {
    enabled: false;
  } | {
    enabled: true;
    companyName: string;
    taxCode: string;       // SDK rename → backend `tax`
    address: string;
    receiverName: string;
    phone: string;
    email: string;
  };
}

// SDK normalize: flatten clean nested → backend flat fields
// vat.companyName → company_name
// vat.taxCode → tax
// vat.address → company_address
// etc.
```

**Edge cases UX:**
- Toggle VAT off khi đã fill data → KHÔNG mất data, user toggle lại restore
- Submit checkout với VAT on nhưng 1 field invalid → scroll-to-first-error + inline red
- Backend reject MST invalid (vd: backend verify với GDT API) → toast "MST không tồn tại, vui lòng kiểm tra"

**Accessibility:**
- Checkbox label tap area: full row (KHÔNG chỉ checkbox 24×24)
- Screen reader announce: "Lấy hoá đơn VAT, checkbox, hiện đang {checked/unchecked}"
- Animated expand: respect `prefersReducedMotion` → skip animation

---

### S-CHECKOUT-03: Discount + Review + Payment Method

**Wireframe (rev2 — thêm Buy-group tier):**
```
┌─────────────────────────────────────┐
│ ←  Đăng ký giải                     │
├─────────────────────────────────────┤
│ ── Bước 3/3: Thanh toán ────────── │
├─────────────────────────────────────┤
│                                     │
│  ── Đơn hàng ─────────────────────  │
│  ┌─────────────────────────────────┐│
│  │ Saigon Marathon 2026             ││
│  │ 5 km · Nguyễn Văn A              ││
│  └─────────────────────────────────┘│
│                                     │
│  ── Mã giảm giá ──────────────────  │
│  ┌──────────────────┐ ┌─────────┐  │
│  │ NHAPMA           │ │[Áp dụng]│  │  ← input + button inline
│  └──────────────────┘ └─────────┘  │
│  ✓ Đã áp dụng giảm 20.000đ          │  ← success state
│                                     │
│  [🎉 Tiết kiệm 30k khi mua ≥3 vé]   │  ← Buy-group tier badge (rev2 — show if tier active)
│                                     │
│  ── Chi tiết thanh toán ────────── │
│  Giá vé                  200.000đ   │
│  Mã giảm (NHAPMA)      − 20.000đ   │
│  Giảm nhóm (≥3 vé 10%) − 18.000đ   │  ← Buy-group tier discount line (rev2)
│  ──────────────────────────────────  │
│  Tổng cộng              162.000đ   │  ← bold, brand color
│                                     │
│  ── Phương thức thanh toán ────── │
│  ┌─────────────────────────────────┐│
│  │ Chọn phương thức     [▾]        ││  ← tap → open S-CHECKOUT-04
│  └─────────────────────────────────┘│
│  ◯ Quét QR chuyển khoản (PayX QR)   │  ← compact list view of methods
│  ○ Thẻ ATM nội địa (NAPAS)          │
│  ○ Quét QR chuyển khoản VNPay       │
│  ○ Ví điện tử Payoo                 │
│  ○ Thẻ tín dụng/ghi nợ              │
│                                     │
├─────────────────────────────────────┤
│  [Quay lại]    [Thanh toán 180k]   │  ← sticky CTA
└─────────────────────────────────────┘
```

**Form fields (discount):**

| Field | Type | Validation |
|-------|------|------------|
| `discount_code` | text uppercase | trim, max 30, alphanumeric |
| `payment_method` | radio | enum from `paymentOptions` |

**All States:**

| State | Spec |
|-------|------|
| Initial | discount empty, payment_method = `PAYX_QR` default (most popular) |
| Discount typing | "Áp dụng" button enabled |
| Discount applying | Button spinner |
| Discount valid | Toast green "Đã áp dụng giảm X đ" + UI update với savings |
| Discount invalid | Toast error "Mã không hợp lệ hoặc đã hết hạn" |
| Discount expired (race-specific) | "Mã không áp dụng cho giải này" |
| Method selected | Radio filled, CTA enabled |
| CTA submit | Spinner "Đang tạo đơn hàng..." |
| Order create success | Navigate WebView |
| Order create fail | Toast error + stay on screen |

**Endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `GET /price_rule/find-one?text=X&race_id=Y` | Validate discount code |
| `POST /order/create?race_id=X` body=`OrderCreatePayload` | Create order |

```typescript
// Clean SDK
interface DiscountCheckInput { code: string; raceId: string }
interface DiscountCheckResponse {
  valid: boolean;
  discountAmount?: number;
  discountPercent?: number;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'EXCEEDED_USAGE' | 'INVALID_RACE';
}

interface OrderCreateInput {
  raceId: string;
  courseId: string;
  athlete: AthleteCreatePayload;     // from S-CHECKOUT-02 form
  delegator?: DelegatorPayload;      // if represent mode
  guardian?: GuardianPayload;        // if < 18
  discountCode?: string;
}

interface OrderCreateResponse {
  orderId: string;
  totalAmount: number;
  status: 'pending';
}
```

> **SDK Normalization:** `athlete.first_name` → backend keep snake_case; SDK transforms camelCase ↔ snake_case automatically based on convention.

---

### 💸 Buy-Group Discount Tier (NEW rev2)

**Trigger:** Backend response cart endpoint trả `race.buy_group_conditions: Array<{min_quantity, discount_percent}>` + cart `quantity`.

**Logic (client-side calc khi render cart breakdown):**

```typescript
function calculateTierDiscount(
  conditions: Array<{min_quantity: number; discount_percent: number}>,
  quantity: number,
  subtotal: number
): { tierDiscount: number; matchedTier: {min_quantity, discount_percent} | null } {
  let matchedTier = null;
  let highestDiscount = 0;
  
  // Sort conditions by min_quantity DESC to find highest applicable tier
  const sorted = [...conditions].sort((a, b) => b.min_quantity - a.min_quantity);
  
  for (const condition of sorted) {
    if (quantity >= condition.min_quantity) {
      matchedTier = condition;
      highestDiscount = condition.discount_percent;
      break;  // first match (highest) wins
    }
  }
  
  const tierDiscount = (subtotal * highestDiscount) / 100;
  return { tierDiscount, matchedTier };
}
```

**UI render rules:**

1. **Badge (above cart breakdown):**
   - Show ONLY khi `matchedTier !== null`
   - Format: `"🎉 Tiết kiệm {Y}đ khi mua ≥{N} vé"` (Y = tierDiscount formatted VND, N = matchedTier.min_quantity)
   - Color: `brand.accent` (gold) background tint, dark text
   - Tap: open bottom sheet "Cách tính giảm giá nhóm" giải thích tier system

2. **Cart breakdown line item:**
   - Show ONLY khi `tierDiscount > 0`
   - Format: `"Giảm nhóm (≥{N} vé {X}%)   −{Y}đ"`
   - Color text: `semantic.success` (green)
   - Right-aligned amount

3. **Total calculation:**
   - `final_total = subtotal - voucher_discount - tier_discount`
   - Display: bold, `brand.primary` color

**Edge cases:**
- `conditions` empty array hoặc undefined → KHÔNG show badge/line, treat tierDiscount = 0
- Multiple tiers match (vd: ≥3 và ≥5) → apply HIGHEST tier discount (sort DESC by min_quantity, first match)
- `quantity = 1` (mobile MVP default) → tier rarely match, badge hidden. Implement vẫn cần (race có thể set min_quantity=1 cho special promo).
- Voucher + tier discount stack (additive, KHÔNG multiplicative): `total = subtotal - voucher - tier`

**Form fields:** N/A (computed from cart state, KHÔNG user input)

**TC-CHECKOUT-XX cho buy-group tier:**

- `TC-CHECKOUT-19 (NEW)`: Cart subtotal 200k, quantity 2, conditions=[{min:3, pct:10}] → tierDiscount=0, badge hidden
- `TC-CHECKOUT-20 (NEW)`: Cart subtotal 600k, quantity 3, conditions=[{min:3, pct:10}] → tierDiscount=60k, badge "Tiết kiệm 60.000đ khi mua ≥3 vé" show, line item show
- `TC-CHECKOUT-21 (NEW)`: Cart subtotal 1M, quantity 5, conditions=[{min:3, pct:10}, {min:5, pct:20}] → match higher tier (≥5, 20%) → tierDiscount=200k
- `TC-CHECKOUT-22 (NEW)`: Voucher 50k + tier 60k → total = 600k - 50k - 60k = 490k

> **Mobile MVP note:** Đã giới hạn `BR-CHECKOUT-02: 1 BIB per order`. Tier discount rarely apply ở MVP. Nhưng spec phải implement vì backend trả field + edge case race có promo `min_quantity=1`. Phase 2 mở multi-BIB → tier trở thành critical.

---

### 💰 Zero-Total Special Case (NEW rev2 — BR-CHECKOUT-25)

**Trigger:** Backend API `POST /checkout` (Next.js internal proxy) response code `status: 266` (`ORDER_WITH_TOTAL_EQUAL_ZERO`).

**Scenarios:**
- Free race (price = 0)
- Voucher 100% discount cover full price
- Sponsor-funded entry (BTC tài trợ)

**Flow:**

```
User submit checkout step 3 with method selected
  │
  ▼
POST /api/checkout (internal Next.js)
  │
  ▼
Backend computes total:
  - If total > 0 → status 200, return gateway URL → S-CHECKOUT-05 WebView
  - If total === 0 → status 266, return special URL
  │
  ▼ (status 266)
Response: { 
  success: true, 
  status: 266,
  url: "/vi/orders/{orderId}?redirect_from_checkout=true" 
}
  │
  ▼
Mobile SKIP WebView, navigate `/orders/{orderId}?redirect_from_checkout=true`
  │
  ▼
S-CHECKOUT-06 Payment Result render with status="success" + special label "Miễn phí"
```

**UI difference vs normal flow:**

- Result screen heading: "🎉 Đăng ký thành công (Miễn phí)" thay vì "Thanh toán thành công"
- Hide payment method + transaction ID rows (irrelevant)
- Show: order ID, race info, "BIB sẽ được cấp khi BTC mở pool"
- CTA buttons giữ nguyên: "Xem QR ticket" + "Về trang chủ"

**TC-CHECKOUT-23 (NEW):** Submit checkout free race → backend trả status 266 → mobile navigate `/orders/{orderId}?redirect_from_checkout=true` → render S-CHECKOUT-06 với label "Miễn phí" + hide payment info rows.

---

### 👶 Age Validation tại Event Date (UPDATED rev2 — BR-CHECKOUT-26)

**Replace** age validation logic trong S-CHECKOUT-02 form fields table:

**Old (rev1):** `dob` validation only check `< race_date - 5y (min 5t), > 1900`

**New (rev2):**

```typescript
// Schema factory pattern
function getAthleteSchema(eventStartDate: Date | null = null) {
  return BaseAthleteSchema.superRefine((athlete, ctx) => {
    const { dob, course } = athlete;
    if (!dob || !course?.min_age) return;
    
    const refDate = eventStartDate ?? new Date();
    const currentAge = dayjs(refDate).diff(dayjs(dob), 'year');
    
    if (currentAge < course.min_age) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dob'],
        message: `Yêu cầu vận động viên phải trên ${course.min_age} tuổi tại ngày race (${dayjs(refDate).format('DD/MM/YYYY')})`
      });
    }
  });
}
```

**Why event date not today:**
- User đăng ký 6 tháng trước race
- Hôm nay user mới 17t, nhưng đến ngày race sẽ 18t → eligible
- Validate today → false positive reject

**Per-course `min_age`:**
- Backend race response includes per-course `min_age` (vd: 21km min 18, 5km no min)
- Schema check based on user's selected course, KHÔNG hardcode race-level

**TC-CHECKOUT-24 (NEW):** Course 21km min_age=18, dob = 2009-01-01 (16 tuổi today), event_date = 2027-03-01 → reject. Same dob, event_date = 2028-03-01 (19 tuổi at event) → accept.

**TC-CHECKOUT-25 (NEW):** Course 5km min_age=null (no requirement) → bất kỳ tuổi nào pass.

---

### 🔤 Name Field UPPERCASE + Letter-Only (UPDATED rev2 — BR-CHECKOUT-27)

**Replace** name fields validation trong form fields table:

**Old (rev1):** `min 1, max 50, trim`

**New (rev2):**
- Type: text với `autoCapitalize="characters"` (RN prop) + onChange transform `value.toUpperCase()`
- Regex: `/^[^0-9!@#$%^&*()_+=[\]{};':"\\|,.<>/?]*$/` (cho phép chữ + space + accented Việt Nam, reject digit + special char)
- Error message: "Tên chỉ chứa chữ cái và khoảng trắng"
- Applies to: `first_name`, `last_name`, `name_on_bib`

**Implementation hint cho Coder:**

```tsx
<Input
  value={value}
  autoCapitalize="characters"
  onChangeText={(text) => onChange(text.toUpperCase())}
  // Note: KHÔNG dùng autoCapitalize alone vì iOS không enforce, cần manual transform
/>
```

**TC-CHECKOUT-26 (NEW):** Input "nguyễn văn a" → onChange transforms to "NGUYỄN VĂN A". Submit valid.

**TC-CHECKOUT-27 (NEW):** Input "Nguyễn 123" → regex reject + inline error "Tên chỉ chứa chữ cái và khoảng trắng".

---

### S-CHECKOUT-04: Payment Method Picker (Bottom Sheet)

**Triggered:** from S-CHECKOUT-03 expand picker

**Wireframe:**
```
┌─────────────────────────────────────┐
│             ━━━━                    │
│  Chọn phương thức thanh toán         │
│  ─────────────────────────────────  │
│                                     │
│  ── Khuyến nghị ─────────────────── │
│  ◉ [PayX QR]  Quét QR PayX          │  ← method row với logo
│     Phí 0đ · 24/7                    │
│  ○ [VNPay QR] Quét QR VNPay         │
│     Phí 0đ                           │
│                                     │
│  ── Thẻ ngân hàng ─────────────────  │
│  ○ [NAPAS]   Thẻ ATM nội địa        │
│  ○ [PayX ATM] PayX thẻ ATM          │
│  ○ [Visa]    Thẻ tín dụng (VNPay)   │
│  ○ [OnePay]  Thẻ quốc tế (OnePay)   │
│                                     │
│  ── Ví điện tử ──────────────────── │
│  ○ [Payoo]   Ví Payoo                │
│                                     │
├─────────────────────────────────────┤
│  [Xác nhận]                          │
└─────────────────────────────────────┘
```

**Data:** `paymentOptions` (production) or `devPaymentOptions` (dev) from `@5bib/sdk/constants/payment`

**Actions:**
- Tap method → select radio
- Tap "Xác nhận" → save selection, dismiss sheet, parent screen update CTA label

---

### S-CHECKOUT-05: Payment WebView

**Route:** `/checkout/payment-webview?orderId=X&url=Y&method=Z`

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ✕  Thanh toán           [● PayX QR]│  ← close + gateway badge
├─────────────────────────────────────┤
│ ▓▓▓▓▓░░░░░░░░░░░░░ (loading bar)    │  ← thin progress
├─────────────────────────────────────┤
│                                     │
│       [WebView full content]        │
│       (3rd party gateway page)      │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Behavior (CRITICAL):**

1. **Open**: load `url` from `GET /{gateway}/payment?order_id=X&returnUrl=bib5://payment-return&...`
2. **Whitelist domains** (BR-CHECKOUT-12):
   - `*.vnpayment.vn`
   - `*.payx.vn` / `*.payx.com.vn`
   - `*.payoo.vn` / `*.payoo.com.vn`
   - `*.onepay.vn`
   - `5bib.com` (return URL)
3. **Listen URL changes**:
   - If URL starts with `bib5://payment-return` → extract `orderId`, `status` query params → close WebView → navigate `/checkout/result?orderId=X&status=Y`
   - If URL matches `https://5bib.com/payment-return?...` (universal link fallback) → same as above
   - If URL outside whitelist → block + toast "URL không hợp lệ"
4. **Timeout 10 min idle** (BR-CHECKOUT-17): detect KHÔNG có URL change → auto close + confirm "Phiên thanh toán hết hạn"
5. **Tap ✕**: confirm dialog "Huỷ giao dịch? Order sẽ tự huỷ sau 15 phút" → if confirm → close

**States:**
- Loading initial: progress bar 0→100% gateway page render
- Loaded: full WebView
- Network error: full screen error + "Thử lại"
- Deep link captured: brief flash before close

**Endpoint:**

| Element | Spec |
|---------|------|
| Method | GET |
| Path varies | `/vnpay/payment`, `/payx/payment`, `/payoo/payment`, `/onepay/payment` |
| Auth | None (public URL gen) |
| Request (clean SDK) | `{ orderId, returnUrl, paymentMethod }` |
| Backend legacy params (per gateway) | VNPay: `?order_id=X&returnUrl=Y&vnp_BankCode=Z`; PayX: `?order_id=X&return_url=Y&payment_method=Z`; Payoo: `?order_id=X&returnUrl=Y` |
| Response | `{ url: string }` (gateway redirect URL) |
| SDK normalize | YES — abstract per-gateway param differences |

```typescript
interface PaymentUrlInput {
  orderId: string;
  paymentMethod: PaymentMethod; // enum
  returnUrl: string;            // 'bib5://payment-return'
}

interface PaymentUrlResponse {
  url: string;
  expiresInSeconds: number;
}
```

---

### S-CHECKOUT-06: Payment Result

**Route:** `/checkout/result?orderId=X&status=Y`

**Wireframe (success):**
```
┌─────────────────────────────────────┐
│                                     │
│         [✓ green icon icon.2xl]     │
│                                     │
│   Thanh toán thành công!             │  ← heading.h1
│                                     │
│   Mã đơn hàng                        │
│   #ORD-2026-A1234                    │  ← mono.md
│                                     │
│   Tổng thanh toán                    │
│   180.000đ                           │
│                                     │
│   Giải: Saigon Marathon 2026         │
│   Cự ly: 5 km                        │
│   BIB sẽ được cấp khi BTC mở pool   │
│                                     │
│  [Xem QR ticket]                     │  ← primary lg full
│  [Về trang chủ]                      │  ← ghost lg full
└─────────────────────────────────────┘
```

**Wireframe (pending):**
```
   [⏳ yellow icon]
   
   Đang chờ xác nhận thanh toán
   
   Chúng tôi đã nhận giao dịch của bạn.
   Vui lòng chờ khoảng 1-2 phút...
   
   ⏱ Còn lại: 14:23
   
   [○ Đang kiểm tra...] (auto-poll mỗi 10s)
   
   [Huỷ và làm lại]
```

**Wireframe (fail):**
```
   [✕ red icon]
   
   Thanh toán không thành công
   
   Lý do: Giao dịch bị từ chối bởi ngân hàng
   
   Mã đơn: #ORD-... (chưa thanh toán)
   
   [Thử lại với phương thức khác]
   [Về trang chủ]
```

**States flow:**
- `success` → show QR ticket CTA → tap → navigate `/tickets/[id]/qr`
- `pending` → poll order status every 10s (max 15 min) → if `paid` → switch to success view + auto navigate after 2s; if timeout → switch to fail
- `failed` / `cancelled` → fail view with retry CTA → tap → navigate back to S-CHECKOUT-03 (payment method picker)

**Endpoint:**
- `GET /order/by-id?order_id=X` (auth Bearer) — for polling status

```typescript
interface OrderDetail {
  id: string;
  raceId: string;
  raceName: string;
  courseId: string;
  courseName: string;
  athleteName: string;
  totalAmount: number;
  discountAmount: number;
  financialStatus: 'paid' | 'pending' | 'voided' | 'failed';
  internalStatus: string;
  createdAt: string;
  paidAt?: string;
  ticketId?: string;  // available after payment success
  bib?: string;
}
```

---

### S-CHECKOUT-07: QR Ticket Display

**Route:** `/tickets/[id]/qr` — deep link target

> Đây là endgame của checkout flow. Cũng là entry point từ S-TICKETS-02 trong EPIC-4 (My Tickets). Reusable screen.

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←  Vé của bạn                  [⤴]  │  ← back + share
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │  ← QR card (xem design-system #16)
│   │                             │   │
│   │       [QR CODE 240×240]     │   │
│   │                             │   │
│   │   BIB: A1234                │   │  ← mono.md large
│   │   Saigon Marathon 2026      │   │  ← heading.h2
│   │   5 km · 15/03/2026         │   │
│   │                             │   │
│   │   [● Trực tuyến]            │   │  ← online/offline indicator
│   └─────────────────────────────┘   │
│                                     │
│  ── Chi tiết vé ──────────────────  │
│  Tên VĐV: Nguyễn Văn A              │
│  Email: a@example.com               │
│  SĐT: 0912345678                    │
│  Size áo: M                          │
│  Racekit: Tiêu chuẩn                 │
│                                     │
│  ── Hành động ────────────────────  │
│  [Đổi cự ly]                         │  ← outline, navigate EPIC-4 S-TICKETS-04
│  [Chuyển BIB cho người khác]         │  ← outline, EPIC-4 S-TICKETS-05
│  [Xem chi tiết giải]                 │  ← ghost
│                                     │
└─────────────────────────────────────┘
```

**Brightness boost (BR-GLOBAL-02 + UX):**
- On mount: `Brightness.setBrightnessAsync(1.0)` (max), `KeepAwake.activateKeepAwake()`
- On unmount: restore previous brightness, deactivate keep-awake

**Offline handling (BR-CHECKOUT-20):**
- On first successful load → write to SQLite `cached_tickets` table
- On mount: try fetch online; if fail → fallback SQLite cache
- Online indicator: green dot + "Trực tuyến" / gray dot + "Ngoại tuyến — Dữ liệu từ {lastSyncTime}"

**Data binding:**
- `GET /codes/get/{ticketId}` returns TicketResponse → display
- QR data: `ticket.value` (secret code that staff scans)
- Cache write: full ticket payload + QR string

**Endpoint:**

| Method | GET |
| Path | `/codes/get/{ticketId}` |
| Auth | Bearer Required |
| Response | `Ticket` clean shape |
| Cache | SQLite + 5 min in-memory |

---

## 🧪 Test Cases TC-CHECKOUT-XX

### TC-CHECKOUT-01: Validate discount code happy
| GET `/price_rule/find-one?text=NHAPMA&race_id=R001` |
| 200 + `{valid: true, discountAmount: 20000}` |
| UI: Toast green "Đã áp dụng giảm 20.000đ" |

### TC-CHECKOUT-02: Discount code invalid
| Code not found | 404 → UI toast "Mã không hợp lệ hoặc đã hết hạn" |

### TC-CHECKOUT-03: Discount race mismatch
| Code valid but for different race | 400 + `errorCode: 'INVALID_RACE'` → UI "Mã không áp dụng cho giải này" |

### TC-CHECKOUT-04: Create order happy path
| POST `/order/create?race_id=R001` body `{...full payload}` |
| 201 + `{orderId: "ORD123", totalAmount: 180000, status: "pending"}` |
| Side effect: Order doc created MongoDB |

### TC-CHECKOUT-05: Create order missing required field
| Body missing `athlete.first_name` | 400 + field-level error map |
| UI: scroll to first error + inline red |

### TC-CHECKOUT-06: Create order unauthenticated
| No Authorization header | 401 → force logout → login |

### TC-CHECKOUT-07: Payment URL VNPay
| GET `/vnpay/payment?order_id=ORD123&returnUrl=bib5://payment-return&vnp_BankCode=VNPAYQR` |
| 200 + `{url: "https://sandbox.vnpayment.vn/..."}` |

### TC-CHECKOUT-08: Payment URL PayX (different param name)
| GET `/payx/payment?order_id=ORD123&return_url=bib5://payment-return&payment_method=PAYX_QR` |
| 200 + `{url: "https://payx.vn/..."}` |

### TC-CHECKOUT-09: Deep link return success
| WebView URL changes to `bib5://payment-return?orderId=ORD123&status=success` |
| Expected: WebView closes, navigate `/checkout/result?orderId=ORD123&status=success` |

### TC-CHECKOUT-10: Deep link return cancel
| URL `bib5://payment-return?orderId=ORD123&status=cancelled` |
| Expected: navigate result screen with cancel UI |

### TC-CHECKOUT-11: WebView whitelist enforcement
| Gateway page link out to `https://malicious.com` |
| Expected: navigation blocked + toast "URL không hợp lệ" |

### TC-CHECKOUT-12: Order polling pending → paid
| Setup: order status `pending` |
| Poll every 10s `/order/by-id` |
| After 30s backend update → `financialStatus: 'paid'` |
| UI: switch from pending → success view after detect |

### TC-CHECKOUT-13: Order polling timeout
| Order stays `pending` for 15 min |
| UI: switch to "Giao dịch hết hạn" + retry CTA |

### TC-CHECKOUT-14: Draft form persist
| User on S-CHECKOUT-02, fill 5 fields, kill app |
| Re-open checkout same race+course |
| Expected: toast "Khôi phục dữ liệu chưa lưu" + form populated |

### TC-CHECKOUT-15: Age < 18 conditional guardian
| User enter dob → age computed = 15 |
| Expected: Guardian section auto-show + required validation activate |

### TC-CHECKOUT-16: Represent mode
| Toggle to "Đăng ký hộ" |
| Expected: Delegator section show, 4 fields required |

### TC-CHECKOUT-17: QR ticket offline
| Load ticket online once → kill app → airplane mode → re-open ticket |
| Expected: QR renders from SQLite cache + offline indicator gray |

### TC-CHECKOUT-18: QR brightness boost
| Mount S-CHECKOUT-07 |
| Expected: screen brightness max + keep-awake active |
| Unmount: restore |

---

## ⚡ Performance SLA

| Metric | Target |
|--------|--------|
| Checkout entry → form render | < 1s |
| Athlete form save draft (debounced) | < 100ms perceived |
| Discount validate response | < 1s p95 |
| Order create response | < 2s p95 |
| Payment URL fetch | < 1.5s p95 |
| WebView initial load | < 5s p95 (depends gateway) |
| Order polling efficiency | KHÔNG block UI, 10s interval |
| QR ticket cold render | < 500ms (from cache) / < 2s (fresh) |

---

## 🛑 PAUSE Conditions

- [ ] **PAUSE-EPIC3-01:** Multi-BIB checkout — confirm mobile MVP single BIB only? Web có support.
- [ ] **PAUSE-EPIC3-02:** Discount code endpoint response shape — verify `/price_rule/find-one` thực tế trả gì (web wrap với `.then(d => d)` không unwrap data, suspect non-standard).
- [ ] **PAUSE-EPIC3-03:** Order create payload — full schema confirm. Backend chấp nhận snake_case nested object?
- [ ] **PAUSE-EPIC3-04:** Webhook order status update — backend có webhook fire khi gateway confirm payment? Frontend polling là backup.
- [ ] **PAUSE-EPIC3-05:** `bib` field — assigned khi nào? Ngay sau payment hay sau BTC mở pool BIB?
- [ ] **PAUSE-EPIC3-06:** OnePay endpoint format — spot-check KHÔNG có dedicated handler trong `checkoutUrl()`. Verify backend có `/onepay/payment` không.
- [ ] **PAUSE-EPIC3-07:** Deep link scheme `bib5://` — confirm với app.json + universal link `5bib.com/.well-known/*`.
- [ ] **PAUSE-EPIC3-08:** Order auto-cancel timer 15 min — backend có job tự void hay frontend chỉ display?

## ✅ Status

- [x] DRAFT
- [x] READY (Wave 2 part 3)
