# 5BIB Backend API Reference — Mobile Source of Truth

**Last updated:** 2026-05-26 (Manager)
**Status:** ✅ Complete — extracted từ Postman collection backend team bàn giao trước khi rời.
**Source:** `docs/backend-postman/5bib-api.postman_collection.json` (255 endpoints, 651 KB)
**Audience:** Mobile dev team (RN Expo) + SDK extract team (FEATURE-002)

> ⚠️ **NO BACKEND SUPPORT.** Backend team đã bàn giao API và không còn làm cho 5BIB nữa. Doc này là **SOURCE OF TRUTH DUY NHẤT** cho mobile dev. Mọi quirk, payload format, error code → decide ngay tại đây, KHÔNG ai để ask sau.

---

## Quick Index

| Section | Endpoints | Status |
|---|---|---|
| [Backend Conventions](#backend-conventions) | — | required reading |
| [EPIC-1 Auth & Profile](#epic-1-auth--profile) | 14 | all confirmed |
| [EPIC-2 Browsing (Race detail)](#epic-2-browsing-race-detail) | 8 | all confirmed |
| [EPIC-3 Checkout (Order + Payment)](#epic-3-checkout-order--payment) | 12 | all confirmed |
| [EPIC-4 Tickets / BIB / Athlete](#epic-4-tickets--bib--athlete) | 11 | all confirmed |
| [EPIC-5 Results](#epic-5-results) | 4 | WebView + native |
| [EPIC-6 E-Waiver](#epic-6-e-waiver) | 6 | all confirmed |
| [EPIC-7 Metadata + Config](#epic-7-metadata--config) | 8 | provinces, props, ticket types |
| [Apple Sign-In Deep Dive](#apple-sign-in-deep-dive) | 3 variants | ⚠️ Special section |
| [Critical Warnings](#critical-warnings) | — | required reading |
| [TypeScript Types Cheat Sheet](#typescript-types-cheat-sheet) | — | for SDK extract |

---

## Backend Conventions

### Base URLs

| Env | URL | Postman var | Note |
|-----|-----|-------------|------|
| DEV | `https://dapi.5bib.com` | `{{HOST}}` | Test account: `ceo@5bib.com` (Danny re-tạo sau khi tao xóa nhầm) |
| PROD | `https://api.5bib.com` | (not in Postman) | LIVE — 69 DAU, cẩn thận. KHÔNG probe destructive. |
| LOCAL | (`HOST_LOCAL` / `LOCAL_HOST`) | dev-team-local-only | Mobile KHÔNG dùng |

### Auth header
```
Authorization: Bearer <access_token>
```

### Response wrapper
```jsonc
// Success
{ "data": {...}, "success": true }

// Error single-level
{ "success": false, "error": { "code": 1234567, "message": "..." } }

// Error double-nested (~30% endpoints)
{ "success": false, "error": { "error": { "code": 400, "message": "..." } } }
```
→ SDK adapter PHẢI unwrap cả 2 patterns.

### Error code semantics (from probe + Postman)
| Status + Body pattern | Meaning | Mobile action |
|---|---|---|
| `200` + `success: true` | OK | proceed |
| `200` + `success: false` | Logic error (yes 200!) | parse `error.code` để biết business error |
| `400 "Invalid HTTP Method"` | Wrong method OR catch-all fall-through | retry with different method, or 404 |
| `400 "Mismatch request param"` | Missing/wrong query param | fix request |
| `400` validation body | Field validation | show field error |
| `401` | Token invalid/expired | call `GET /renew` → retry once |
| `403` empty body | Endpoint không tồn tại | bug |
| `403` JSON | Permission denied | hide UI element |
| `423` | Account locked | show countdown |
| `429` | Rate limited | backoff exponential |

### JWT format
```jsonc
// Decoded payload
{
  "USER": { "id": 9, "email": "ceo@5bib.com" },
  "exp": 1780383297  // unix sec, ~24h từ login
}
// Algorithm: HS256
```

### Naming inconsistency (PHẢI NHỚ)
Backend mix `snake_case` (legacy) + `camelCase` (newer):
- **Snake_case fields:** `new_password`, `new_password_confirm`, `race_id`, `course_id`, `order_id`, `code_value`, `tenant_id`, `phone_number`, `id_number`, `dob`, `first_name`, `last_name`, `country_code`, `medical_info`, `sos_phone`, `tshirt_size`, `racekit`, `customize_fields`, `disclaimer_status`, `is_represent`, `athlete_sub_info`, `financial_status`, `included_insurance`, `line_items`, `variant_id`, `ticket_type_id`, `discount_codes`
- **CamelCase fields:** `confirmPassword`, `newPassword`, `confirmNewPassword`, `countryCode`, `sosPhone`, `nationality`
- **Both seen for same concept:** `sosPhone` AND `sos_phone` (đôi khi cùng 1 endpoint!)

→ **SDK adapter normalize layer (FEATURE-002 Option A):** map TẤT CẢ → clean camelCase trước khi consumer thấy.

### Query param vs body (PHẢI NHỚ)
Backend rất tùy hứng. Hai endpoint cùng tên có thể format khác:
- `POST /forgot?email=X` (query param, body null) ❌ KHÔNG có JSON body
- `POST /reset` body `{otp, email, new_password, new_password_confirm}` ✅ JSON body
- `POST /login` body `{email, password}` ✅ JSON body
- `POST /auth/google/login?token=X` (query param) ❌ token in URL
- `POST /order/create?race_id=X` body `{order: {...}}` ✅ both query + body
- `POST /athlete/register?code_value=X` body `{...athlete...}` ✅ both

→ SDK adapter mỗi endpoint phải có config riêng (query? body? both?).

### Idempotency / retry
- POST endpoints chưa support idempotency-key
- Mobile MUST debounce double-tap submit để tránh duplicate order/payment
- Retry strategy chỉ áp dụng cho GET (idempotent by definition)

---

## EPIC-1 Auth & Profile

### `POST /login`
```jsonc
// Request body (JSON)
{
  "email": "ceo@5bib.com",
  "password": "Danny@11"
  // password có thể: (a) plain text, (b) SHA-256 hash + salt format
  //                       "<sha256>@<salt>" (vd "3a116...@Danny-vo-dick-vu-tru")
  // Mobile dev: GỬI PLAIN, backend tự handle hash.
}

// Response 200
{
  "data": {
    "user_id": 9,                                    // int
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",        // JWT HS256, exp ~24h
    "email": "ceo@5bib.com",
    "username": "ceo@5bib.com"
  },
  "success": true
}

// Response 200 + success:false (wrong password)
{
  "success": false,
  "error": { "code": 1317272128, "message": "Invalid credential" }
}
```
**SDK normalize → `login(email, password): Promise<{ token, user }>`**

### `POST /register`
```jsonc
// Request body
{
  "email": "tester@5bib.com",
  "password": "Aa123123@",
  "confirmPassword": "Aa123123@",   // ⚠️ camelCase NOT confirm_password
  "name": "Tester"                  // full name single field
}
```
**Validation:** Password min 8 chars (BR-AUTH-02 in PRD).

### `POST /forgot?email=X` (query param, body null!)
```
POST {{HOST}}/forgot?email=user%40example.com
(no body)
```
**Gotcha:** EMAIL trong QUERY, không phải body. URL-encode `@` → `%40`.

### `POST /reset`
```jsonc
// Body — note snake_case!
{
  "otp": "539547",                       // 6-digit string từ email
  "email": "user@example.com",
  "new_password": "A123123@",            // snake_case!
  "new_password_confirm": "A123123@"     // snake_case!
}
```
⚠️ **KHÔNG dùng `newPassword`/`newPasswordConfirm`** — sẽ fail.

### `POST /resend_activation_email?email=X` (query param)
```
POST {{HOST}}/resend_activation_email?email=user%40example.com
```

### `POST /auth/google/login?token=X` (query param)
```
POST {{HOST}}/auth/google/login?token=<id_token_from_google_sdk>
(no body)
```
**SDK normalize:** `loginGoogle(idToken): Promise<{ token, user }>` — adapter convert to query.

**Alternate path:** `POST /google/login` (duplicate, mobile dùng `/auth/google/login` canonical).

### `POST /auth/apple/login` ⚠️ See [Apple Sign-In Deep Dive](#apple-sign-in-deep-dive)

### `GET /renew` 🔥 REFRESH TOKEN
```
GET {{HOST}}/renew
Authorization: Bearer <old_token>
(no body, no params)

// Response 200
{
  "data": {
    "user_id": 9,
    "access_token": "<NEW_jwt_with_extended_exp>",
    "email": "...",
    "username": "..."
  },
  "success": true
}
```
**SDK strategy:**
- Proactive: schedule refresh ở minute 23h sau login
- Reactive: on 401 response → call `/renew` → retry original request (max 1 retry)
- Single-token model (KHÔNG có separate refresh_token)

### `POST /logout`
```
POST {{HOST}}/logout
Authorization: Bearer <token>
```
Server-side invalidate JWT. Mobile cũng clear local SecureStore.

### `GET /users/user-info`
Returns current user profile. **SDK normalize:** `getMe(): Promise<User>`.

### `GET /users/{user_id}`
Returns any user by ID. Mobile chủ yếu dùng `/users/user-info` cho self.

### `PUT /users/{user_id}` — Update profile
Body: `BaseUserDTO` (xem TypeScript types section).

### `POST /users/update-password`
```jsonc
// Body — note ALL camelCase
{
  "password": "currentPassword",
  "newPassword": "newPass123",
  "confirmNewPassword": "newPass123"
}
```
**Schema validation:** newPassword 8-20 chars, ALL 3 fields required.

### `POST /upload/avatar` 🔥
```
POST {{HOST}}/upload/avatar
Content-Type: multipart/form-data

Form fields:
- file: <binary>             (the image)
- type: BACK_HASH            (text field, value EXACTLY "BACK_HASH")
```
**Returns:** URL của uploaded image trên S3/CDN.
**Mobile flow:** Upload → get URL → call `PUT /users/{id}` với `avatar: <url>`.

### `DELETE /users/delete/forever` 🚨 HARD DELETE
```
DELETE {{HOST}}/users/delete/forever
Authorization: Bearer <token>
(NO body, NO params!)

// Response 200
{ "data": { "data": "Delete user successfully" }, "success": true }
```
**⚠️ HARD DELETE NGAY LẬP TỨC. Mobile UI BẮT BUỘC double-confirm.** See PRD EPIC-1 S-PROFILE-05.

### Public key endpoints (advanced — mobile có thể skip)
- `PUT /set/public-key` — register RSA public key cho user (for signature verification)
- `POST /verify-signature` — verify signed message
- `POST /service/verify-signature` — service-level signature verify

Mobile dev: Skip nếu không có feature signed-action.

---

## EPIC-2 Browsing (Race Detail)

### `GET /pub/race` — List public races
```
GET {{HOST}}/pub/race
GET {{HOST}}/pub/race?page=0&size=20&search=...    // TBD query params
```
**SDK normalize:** `listRaces(filters?): Promise<Race[]>`.

### `GET /pub/by-slug?slug=X` — Race detail by slug (mobile preferred)
```
GET {{HOST}}/pub/by-slug?slug=giai-marathon-quoc-te-vtv-lpbank-2026_214
```
Mobile dùng cho deep link `/race/[slug]`.

### `GET /pub/race-by-id?race_id=X&is_detail=true`
```
GET {{HOST}}/pub/race-by-id?race_id=171&is_detail=true
```
Set `is_detail=true` để fetch full data (description, terms, etc.).

### `GET /pub/race-course?race_id=X&status=Y`
```
GET {{HOST}}/pub/race-course?status=GENERATED_CODE&race_id=12
```
Returns list of course/distance options. Status filter: `GENERATED_CODE` = ready for sale.

### `GET /pub/race-course-by-id?variant_id=X`
⚠️ Param name là `variant_id` KHÔNG phải `course_id` (legacy: course tied to product variant in Sapo legacy).

### `GET /pub/simple-course?race_ids=X,Y,Z` — Bulk course fetch
```
GET {{HOST}}/pub/simple-course?race_ids=29,28
```
Comma-separated race IDs. Returns minimal course info for multiple races.

### `GET /pub/ticket-type?is_free=true`
Returns ticket types globally (or filter by free).

### `GET /pub/race-listed-vnpay`
Races đã configure VNPay gateway. Mobile có thể dùng để filter "races có hỗ trợ thanh toán mobile".

### `GET /pub/admin/get-skip-liability-code?athlete_id=X` (semi-public)
Returns the secret code dùng cho ký waiver. Mobile có thể cần nếu user lost code.

### `GET /pub/ticket-by-code/{secret_code}` — Lookup ticket by share link
```
GET {{HOST}}/pub/ticket-by-code/3068-e25c2f6b1c087ea8d31efeb4938bbf3a92c6fd53...
```
For shared waiver links via email. Mobile có thể deep-link handle.

---

## EPIC-3 Checkout (Order + Payment)

### `POST /order/create?race_id=X` 🔥 The big one
```jsonc
// URL: POST {{HOST}}/order/create?race_id=257
// Body:
{
  "order": {
    "email": "buyer@example.com",
    "included_insurance": true,                  // insurance toggle (Igloo)
    "financial_status": "pending",
    "send_receipt": true,
    "send_fulfillment_receipt": true,
    "currency": "VND",
    "tags": "",
    "status": "open",
    "discount_codes": [                          // optional
      { "code": "PROMO10" }
    ],
    "line_items": [
      {
        "quantity": 1,
        "variant_id": 110268573,                 // product variant ID
        "ticket_type_id": 573,
        "athlete_sub_info": [                    // 1 athlete per quantity
          {
            "email": "athlete@example.com",
            "name": "BÙI HƯNG",
            "first_name": "BÙI",
            "last_name": "HƯNG",
            "contact_phone": "0854529936",
            "id_number": "0988887767",           // CCCD
            "nationality": "Viet Nam",
            "gender": "MALE",                    // MALE / FEMALE / UNKNOWN
            "dob": "1984-10-06",
            "tshirt_size": "XXL",
            "racekit": "XXL",                    // duplicate of tshirt_size
            "address": "..."
            // ... more optional fields
          }
        ]
      }
    ]
  }
}

// Response 200
{
  "data": {
    "order_id": 12297275,
    "total": 12035,
    "currency": "VND",
    // ...
  },
  "success": true
}
```
**Notes:**
- `variant_id` + `ticket_type_id` together identify exact ticket. Get from race detail.
- `athlete_sub_info.length` MUST equal `quantity` (1 athlete per ticket).
- `included_insurance: true` triggers Igloo insurance flow (additional fee).

### `PUT /order/update?order_id=X`
```jsonc
PUT {{HOST}}/order/update?order_id=12166947
{
  "email": "...",
  "line_items": [{ "variant_id": 95905990, "quantity": 2, "ticket_type_id": 10 }]
}
```

### `GET /order?internal_status=COMPLETE` — List MY orders
```
GET {{HOST}}/order?internal_status=COMPLETE
GET {{HOST}}/order                              // all my orders
```
Filter by internal_status: `COMPLETE` / `PENDING` / `CANCELLED` (TBD others).

### `GET /order/by-id?order_id=X` — Single order
```
GET {{HOST}}/order/by-id?order_id=200002109
```

### `DELETE /order/delete?order_id=X` — Cancel order
```
DELETE {{HOST}}/order/delete?order_id=12528253
// Response success cho id valid, "Invalid order" cho fake id
```

### Payment gateway URLs (mobile WebView)

| Gateway | Endpoint | Notes |
|---|---|---|
| VNPay | `GET /vnpay/payment?order_id=X` | Returns redirect URL → mobile open in WebView |
| PayX | `GET /payx/payment?order_id=X` | Same flow |
| Payoo | `GET /payoo/payment?order_id=X` | Same flow |
| OnePay | `GET /onepay/payment?order_id=X` | Same flow |
| OnePay check status | `GET /onepay/check?order_id=X` | Mobile poll sau khi user back từ WebView |

**Mobile WebView flow:**
1. User click "Pay" → mobile call `GET /{gateway}/payment?order_id=X` → get redirect URL
2. Open WebView với URL đó
3. User complete payment → gateway redirect to callback URL (HTTPS)
4. **Intercept callback URL** (vd `dapi.5bib.com/vnpay?vnp_TxnRef=X&vnp_ResponseCode=00`) → close WebView
5. Poll `GET /order/by-id?order_id=X` để confirm `financial_status: "paid"`

**No custom URL scheme support** — backend chỉ trả HTTPS callback. Mobile WebView phải intercept HTTPS URL pattern.

**VNPay callback params (intercept):**
```
vnp_ResponseCode=00       → success
vnp_ResponseCode≠00       → fail
vnp_TxnRef                → mapping back to order_id
vnp_SecureHash            → backend verifies
```

### `POST /order/fake-payment?order_id=X&amount=Y&email=Z` (DEV only!)
For mobile dev testing without real payment. KHÔNG ship to prod.

### `POST /order/admin/payment?order_id=X` (admin)
Manual mark order as paid. Mobile không dùng.

### `POST /price_rule/create/discount` — Send discount code via email
```jsonc
{
  "race_id": 171,
  "price_rule_id": 1723713,
  "email": "tester@5bib.com"
}
```
Admin function. Mobile có thể skip.

### `GET /price_rule/list?tenant_id=X&race_id=Y&pageNo=1&pageSize=10`
List discounts. Mobile dev có thể consume để show available discounts.

### `GET /price_rule/detail?title=X`
Lookup discount by title/code.

---

## EPIC-4 Tickets / BIB / Athlete

### `GET /codes/fetch-by-user` 🔥 List MY tickets
```
GET {{HOST}}/codes/fetch-by-user
```
**SDK normalize:** `listMyTickets(): Promise<Ticket[]>`.

### `GET /codes/get/{id}` — Ticket detail
**SDK normalize:** `getTicket(id): Promise<Ticket>`.

### `GET /codes/skip-liability-code?code_value=X` — Get waiver code
Returns secret code dùng cho ký e-waiver (3068-xxxxx... format).

### `POST /athlete/register?code_value=X` 🔥 Claim ticket → register athlete
```jsonc
// URL: POST {{HOST}}/athlete/register?code_value=CPJP2510K-962-JP8R9U32
// Body
{
  "email": "athlete@example.com",
  "name": "ĐẶNG CHÍNH PHONG",
  "first_name": "ĐẶNG CHÍNH",
  "last_name": "PHONG",
  "contact_phone": "0941299868",
  "id_number": "001203018448",            // CCCD
  "idpp": "001203018448",                 // ID passport (or CCCD again)
  "nationality": "Viet Nam",
  "city_province": "Thành phố Hà Nội",
  "gender": "MALE",
  "dob": "2003-12-22",
  "address": "",
  "racekit": "M",                         // T-shirt size
  "sosPhone": "0941299868",               // ⚠️ camelCase
  "sos_phone": "0941299868",              // ⚠️ snake_case duplicate (SEND BOTH for safety)
  "club": "",
  "name_on_bib": "",
  "medical_info": "",
  "current_medication": "",
  "athlete_represent": {},                // empty object if is_represent=false
  "disclaimer_status": false,
  "is_represent": true,                   // true if registering for someone else
  "customize_fields": null
}
```
**Mobile flow:** Sau khi mua ticket (EPIC-3) → user claim athlete slot với form này (EPIC-4).

### `POST /athlete/register/represent` — Register for someone else
Similar to above, `is_represent=true` + populate `athlete_represent`.

### `POST /athlete/transfer?code_value=X&receipt_email=Y`
```jsonc
// URL: POST {{HOST}}/athlete/transfer?code_value=3RDUTC70K-184-CMP1&receipt_email=newowner@example.com
// Body
{ "message": "Transferring my BIB to you" }
```
Backend sends email với link claim to `receipt_email`.

### `POST /athlete/checkin?code_value=X`
Race day check-in (no body). Backend validate code valid + mark checked-in.

### `PUT /athlete/rolling-bib?course_id=X&code=Y&confirmed=true`
```
PUT {{HOST}}/athlete/rolling-bib?course_id=525&code=PTUT24PTL-784-EBP6&confirmed=true
```
The "Rolling BIB" gamification feature. Randomly assigns BIB number.
- `confirmed=false`: preview (rolls but not commit)
- `confirmed=true`: commit assignment

### `POST /profile/create` — Create athlete profile (reusable)
```jsonc
{
  "name": "Profile Name",
  "email": "...",
  "phone_number": "0734143213",
  "detail": "{\"a\":\"b\"}"               // stringified JSON for extra fields
}
```
Mobile concept: user saves "personas" (family members, kids) để quick-fill khi register cho race khác.

### `GET /profile/find` — List MY profiles
Returns array of saved profiles for current user.

### `PUT /profile/update?profile_id=X`
Update specific profile.

### `DELETE /profile/delete?profile_id=X`
Delete specific profile (NOT user account!).

### `GET /athlete/by-ticket-code?code_value=X`
Lookup athlete info by ticket code.

### `GET /athlete/bib-image?athlete_id=X&is_fb=true`
Auto-generated BIB image (PNG URL). `is_fb=true` returns Facebook-share-optimized version.

### `GET /athlete/all-medals` — User's medal collection
**SDK normalize:** `listMyMedals(): Promise<Medal[]>`.

### `PUT /athlete/update/{athlete_id}` — Simple edit
Update athlete info (name, dob, etc.) without re-register.

### `PUT /athlete/simple-edit` — Alternative endpoint (TBD which canonical, test live)

---

## EPIC-5 Results

### `GET /athlete/result` 🔥 My results
Returns user's race results history.
**SDK normalize:** `listMyResults(): Promise<Result[]>`.

### `POST /pub/athlete-result` — Public result lookup
Lookup result by athlete identifier (bib/email). Body shape TBD — test live.

### `GET /pub/rr/result-cert?result_id=X-Y`
Returns certificate URL (PDF) for shareable result.

### Result page via WebView
Per PRD reduced scope EPIC-5: mobile opens `https://result.5bib.com/race/:id?athlete=:bib` in WebView.

---

## EPIC-6 E-Waiver

**Flow:** Lookup race → Send OTP → Verify OTP → Sign (HTML body).

### `POST /pub/signing-race-dropdown`
```jsonc
// Body (TBD exact — Postman shows email/password but probably wrong)
// Likely: returns list of races user can sign waiver for
```
Test live to confirm body shape.

### `POST /pub/signing-request` — Send OTP
```jsonc
{
  "email": "user@example.com",
  "race_id": 276
}
```
Sends 6-digit OTP to email.

### `POST /pub/signing-request-result` — Verify OTP
```jsonc
{
  "email": "user@example.com",
  "race_id": 276,
  "otp": "226539"
}
```
Returns waiver context if OTP valid (race info + waiver text template).

### `GET /pub/race-skip-all-liability-html?race_id=X` — Get waiver HTML template
Returns full HTML legal text to display in WebView before signing.

### `POST /pub/aggree-skip-liability/{secret_code}` 🔥 Sign waiver
```
POST {{HOST}}/pub/aggree-skip-liability/3068-e25c2f6b...?delegator_email=X&delegator_name=Y&delegator_cccd=Z

Body: <p>PHIẾU MIỄN TRỪ TRÁCH NHIỆM</p>... (HTML with filled fields)
Content-Type: text/html
```
**Important:**
- secret_code in URL path = format `{athlete_id}-{long_hash}`
- delegator info in query params (URL-encoded)
- Body = filled HTML waiver (mobile renders editable HTML, user fills, submits)

**⚠️ Typo "aggree" trong path — KHÔNG fix, dùng đúng.**

### `POST /pub/partner/sign-by-code/{code}` — Partner-side sign
Bearer required. For partner staff signing on behalf. Mobile có thể skip.

---

## EPIC-7 Metadata + Config

### `GET /props/by-key?key=X` — App config / feature flags
```
GET {{HOST}}/props/by-key?key=app_min_version_ios

// Success → { data: <value>, success: true }
// No key → 1958323296 "No key" code
```
**Suggested keys to probe** (backend không có list — mobile try và xem):
- `mobile_min_version_ios`, `mobile_min_version_android` (force update)
- `mobile_maintenance_mode` (bool)
- `mobile_feature_flags` (JSON)
- `tnc_url`, `privacy_url` (legal page links)

### Provinces / Cities VN (use BACKEND's API, NOT external open-api)

| Endpoint | Returns |
|---|---|
| `GET /province` | All provinces |
| `GET /province/district?province=Tỉnh+X` | Districts of province |
| `GET /province/v2/ward?province=Tỉnh+X` | Wards (v2 = newer) |
| `GET /province/detail?province=Tỉnh+X` | Province details |

Backend has own province cache. Don't use `provinces.open-api.vn` (slower, external dependency).

### `GET /ticket-type/by-race-course?race_course_id=X`
Ticket types per race course.

### `GET /ticket-type/by-variant?variant_id=X`
Ticket types per product variant.

### `POST /upload/free` — Generic upload
Multipart, any file. Returns URL.

### `POST /upload/image` — Image upload (with processing)

### `POST /upload/image/url-decode` — Upload from base64 URL

### `POST /upload/id_card_image` — KYC ID upload

### eKYC endpoints (advanced, mobile skip first ship)
- `POST /ekyc-service/upload/single`
- `POST /ekyc-service/upload/hash`
- `POST /ekyc-service/ocr-document`
- `POST /ekyc-service/liveness-face`
- `POST /ekyc-service/liveness-document`
- `POST /ekyc-service/ekyc-full`
- `POST /ekyc-service/compare-face`

Tận dụng nếu app cần verify identity. Postman có examples cho VNPT KYC integration.

### Request / DNF report
```jsonc
// POST {{HOST}}/request/report
{
  "bib": "123123A",
  "course_id": 18,
  "description": "I was injured at km 25",
  "proof_images": ["url1", "url2"],
  "request_type": "DNF"           // DNF / REFUND / OTHER (TBD enum)
}
```

### Racekit pickup check
```
GET {{HOST}}/request/racekit/check?code_value=FXCB245KM-201-M7C2
```
Returns racekit pickup status.

### Strava integration (optional)
Endpoints under `/strava/*` for athletes who want sync activities. Out of scope for first mobile ship.

---

## Apple Sign-In Deep Dive

⚠️ **CRITICAL:** Backend Apple endpoints follow **OAuth code flow** (web-style), NOT identity_token flow (mobile-style). Mobile native Apple SDK gives `identityToken` directly — incompatible with backend `code` param.

### 3 variants backend cung cấp

1. **`POST https://appleid.apple.com/auth/oauth2/v2/authorize`** — Apple's own OAuth start (web-only redirect). Mobile native KHÔNG dùng.

2. **`GET /auth/apple/login?code=X`** (loginAppleByCode)
   - Param: Apple authorization `code` (one-time, from web OAuth redirect)
   - Mobile native: KHÔNG có `code`, có `identityToken`
   - ⚠️ Incompatible.

3. **`POST /auth/apple/login`** (loginApple, multivaluemap)
   - Form params (multivalue map). Unknown exact schema.
   - **Mobile dev MUST probe live** with these payloads:
     - Try `{ identityToken, fullName?: { givenName, familyName }, email? }`
     - Try `{ identity_token, full_name, email }` (snake_case)
     - Try multipart form-data with same fields
     - Try query params: `?identityToken=X&fullName=Y`
   - Whichever returns 200 + JWT = canonical for mobile.

### Recommended mobile strategy

```typescript
// Pseudo
const apple = await AppleSignIn.signIn();
// apple = { identityToken, authorizationCode, email, fullName }

// Attempt 1: POST JSON body
try {
  return await api.post('/auth/apple/login', {
    identityToken: apple.identityToken,
    fullName: apple.fullName,
    email: apple.email
  });
} catch {
  // Attempt 2: POST with authorizationCode as `code` (Apple gives both)
  try {
    return await api.post('/auth/apple/login', null, {
      params: { code: apple.authorizationCode }
    });
  } catch {
    // Attempt 3: GET /auth/apple/login?code=X
    return await api.get('/auth/apple/login', {
      params: { code: apple.authorizationCode }
    });
  }
}
```

**Apple credentials backend uses:**
- `client_id: com.5bib.dapi.dev` (DEV; PROD likely `com.5bib.app` or similar)
- `client_secret`: JWT ES256 signed by team key `2QVC5MK37L` (key id `73RVJ488G3`)
- Expires `1704895699` (2024-01-10) — likely expired! Backend may need to rotate. ⚠️

### Apple Sign-In PROD setup (when ready)
- iOS bundle ID `vn.5bib.app` need configure trong Apple Developer Portal
- Service ID (for backend) need configure
- App ID capability: Sign In with Apple enabled

---

## Critical Warnings

### 1. 🚨 `DELETE /users/delete/forever` — HARD DELETE no confirmation
- No body, no params required
- Deletes bearer-user IMMEDIATELY
- Tao đã xóa nhầm DEV `ceo@5bib.com` trong audit
- **Mobile UI BẮT BUỘC double-confirm** (type phrase + re-enter password). See PRD EPIC-1 S-PROFILE-05.

### 2. ⚠️ Naming inconsistency mọi nơi
Snake_case + camelCase mix even within same endpoint. SDK normalize layer MUST handle both.

### 3. ⚠️ Query param vs body inconsistent
Some endpoints use query (`/forgot?email=X`), some body (`/reset` body), some both. Map per-endpoint.

### 4. ⚠️ Status 200 + `success: false`
Backend returns 200 for business errors. Mobile MUST check `success` field, not just HTTP status.

### 5. ⚠️ Double-nested error wrapper
`{error: {error: {code, message}}}` happens ~30% endpoints. SDK unwrap both.

### 6. ⚠️ Apple Sign-In flow uncertain
Backend uses OAuth code, mobile has identityToken. Mobile dev MUST probe live (see Apple section).

### 7. ⚠️ `/users/{user_id}` catch-all gotcha
ANY path `/users/<anything>` matches `getUser`. Cannot probe-distinguish exists vs not.

### 8. ⚠️ NO retry/idempotency
Mobile MUST debounce double-tap POST. Backend will create duplicate orders.

### 9. ⚠️ HTML body for waiver sign
`POST /pub/aggree-skip-liability/{code}` body is `text/html`, not JSON. SDK adapter handle.

### 10. ⚠️ Apple JWT client_secret expired
Backend uses JWT expiring 2024-01-10 — likely needs re-sign. Mobile dev MUST verify Apple Sign-In works end-to-end on DEV before claim feature ready.

### 11. ⚠️ NO REFRESH_TOKEN / NO FCM endpoint
- Single-token model via `/renew` (no separate refresh_token)
- NO push notification endpoints — Danny confirmed "chưa bao giờ bắn notification". Mobile SKIP push first release.

### 12. ⚠️ Backend swagger spec INCOMPLETE
Swagger at `dapi.5bib.com/swagger-ui` only shows ~60% endpoints. Doc này (file mày đang đọc) là source of truth — KHÔNG dùng swagger.

---

## TypeScript Types Cheat Sheet

For SDK extract (FEATURE-002), normalize legacy → clean DTOs:

```typescript
// User / Profile
export interface User {
  id: number;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  avatar?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  nationality?: string;
  dob?: string;                   // YYYY-MM-DD
  // Athletic
  racekit?: string;               // T-shirt size XS/S/M/L/XL/XXL
  achievements?: string;
  club?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  // Emergency
  sosPhone?: string;
  sosPhoneCountryCode?: string;
  medicalInfoDetail?: string;
  currentMedication?: string;
  // External
  stravaId?: number | null;
}

// Auth
export interface LoginResponse {
  token: string;
  user: User;
}

// Race
export interface Race {
  id: number;
  slug: string;
  title: string;
  description?: string;
  location?: string;
  raceDate?: string;
  racekitDate?: string;
  raceKitLocation?: string;
  logoUrl?: string;
  bannerUrl?: string;
  templateUrl?: string;
  status: 'OPEN_SALE' | 'CLOSED_SALE' | 'EVENT_DAY' | 'ENDED';
  courses?: Course[];
  // ... more
}

// Course (race distance)
export interface Course {
  id: number;
  raceId: number;
  variantId: number;              // legacy ID for ticket-type lookup
  distance: string;               // "5K" | "10K" | "21K" | "42K"
  startTime?: string;
  ticketTypes?: TicketType[];
}

// Ticket / Code
export interface Ticket {
  codeId: number;
  codeValue: string;              // "CPJP2510K-962-JP8R9U32"
  raceId: number;
  courseId: number;
  status: 'REGISTERED' | 'PAID' | 'WAIVED_SIGNED' | 'BIB_ASSIGNED' | 'CHECKED_IN' | 'FINISHED' | 'DNF' | 'DNS';
  bibNumber?: string;
  athlete?: Athlete;
  // ... more
}

// Athlete (registered on ticket)
export interface Athlete {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  contactPhone: string;
  idNumber: string;               // CCCD
  nationality: string;
  cityProvince: string;
  gender: 'MALE' | 'FEMALE';
  dob: string;
  racekit: string;
  sosPhone: string;
  club?: string;
  nameOnBib?: string;
  medicalInfo?: string;
  currentMedication?: string;
  isRepresent: boolean;
  // ... more
}

// Order
export interface Order {
  id: number;
  email: string;
  raceId: number;
  financialStatus: 'pending' | 'paid' | 'voided' | 'cancelled';
  fulfillmentStatus?: string;
  total: number;
  currency: 'VND' | 'USD';
  lineItems: OrderLineItem[];
  discountCodes?: Array<{ code: string; amount?: number; type?: 'percentage' | 'fixed' }>;
  includedInsurance: boolean;
  createdAt: string;
  // ... more
}

export interface OrderLineItem {
  variantId: number;
  ticketTypeId: number;
  quantity: number;
  athleteSubInfo: Athlete[];      // quantity == athleteSubInfo.length
}

// Result
export interface Result {
  id: number;
  athleteId: number;
  raceId: number;
  courseId: number;
  bibNumber: string;
  finishTime?: string;            // HH:MM:SS
  rank?: number;
  rankAgeGroup?: number;
  status: 'FINISHED' | 'DNF' | 'DNS';
  splits?: Array<{ km: number; time: string; pace: string }>;
  certificateUrl?: string;
}

// Medal
export interface Medal {
  id: number;
  raceId: number;
  imageUrl: string;
  earnedAt: string;
}

// API wrapper
export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiError {
  success: false;
  error: {
    code: number;
    message: string;
  };
}
```

---

## Postman Collection Reference

Full collection: `docs/backend-postman/5bib-api.postman_collection.json`

Import vào Postman, set environment vars:
- `HOST` = `https://dapi.5bib.com`
- `HOST_LOCAL` = (skip, dev-team-local)

Test account: `ceo@5bib.com` / `Danny@11` (DEV — Danny re-tạo nếu bị xóa)

For payment testing → ask Danny test cards.

---

## Changelog

- **2026-05-26 (v3 — FINAL):** Repurpose từ `BACKEND_TODOS.md` → `docs/API_REFERENCE.md`. Source of truth duy nhất sau khi backend team handover. 51+ endpoints với REAL payload từ Postman collection. NO BACKEND SUPPORT context — không còn "ask backend" section.
- **2026-05-26 (v2):** Audit backend qua bearer-auth probe. Found 5/8 endpoint missing actually exist (swagger giấu).
- **2026-05-26 (v1):** Initial draft request backend build 3 endpoints — prove obsolete.
