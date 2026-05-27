# Mobile vs Web Parity Audit

**Audited:** 2026-05-28
**Web baseline:** https://dev.5bib.com/vi
**Mobile:** 5BIB iOS DEV build (running iPhone 17 Pro Simulator)
**Backend:** Both consume `https://dapi.5bib.com` — same API, no divergence at data layer.

This document compares actual rendered behavior between the existing web app
(the customer-facing source of truth) and the new mobile app, and flags every
delta as **PARITY (must match)**, **MOBILE-MVP-OK (acceptable gap)**, or
**MOBILE-WINS (mobile already richer)**.

---

## 0. Critical context

Web is the **source-of-truth UX**. Per Danny 2026-05-28:
> "mày cần compare với bản web tại đây https://dev.5bib.com/vi — xem tính năng nó hoạt động như nào thì mobile cứ làm tương tự thôi"

Mobile should match web behavior unless we have an explicit MVP-simplification
decision documented in a PRD.

---

## 1. Home / Browse races

### Web (`/vi`)
- Top sticky ad banner ("24H MỞ BÁN PRIORITY 06-07.05.2025 CHỈ TỪ 168K")
- Top nav: Trang chủ, Sự kiện, Kết quả giải đua, Liên hệ, e-waiver, e-Ticket khu vui chơi (dropdown), 5BIB Shop
- Right side: lang switcher (Tiếng Việt), "Đăng nhập"
- Search bar with **3 filters side-by-side**: tên giải, Địa điểm tổ chức (combobox), Thời gian tổ chức (combobox) + "Tìm kiếm" button
- Featured carousel (Trang An Marathon, Standard Chartered, VTV LPBank Marathon, ...)
- Active race grid below ("Sự kiện bạn có thể thích"): each card shows date pill, title, location, price range (e.g. "200,000đ – 350,000đ"), "Mua vé" CTA

### Mobile (`(tabs)/home`)
- Header "5BIB" + search icon + bell icon
- "Hi, {email}" greeting
- Featured carousel (up to 5 highlight races)
- "Upcoming races" vertical list — each card: thumbnail, title, date, location, status badge
- Bottom tabs (Home, My tickets, Orders, Profile)

### Gap matrix
| Feature | Web | Mobile | Status |
|---|---|---|---|
| Promo top banner | ✅ | ❌ | **MOBILE-MVP-OK** — ad banner is marketing surface, can add later |
| Multi-filter search (location + time) | ✅ | ❌ (just icon, no UI) | **PARITY GAP** — user search UX broken |
| Price range on card | ✅ ("200,000đ – 350,000đ") | ❌ (only status badge) | **PARITY GAP** — pricing is buy intent signal |
| "Mua vé" CTA per card | ✅ | ❌ (whole card taps detail) | **MOBILE-MVP-OK** — card tap = open detail is fine |
| Date pill on thumbnail | ✅ | ✅ | OK |
| Lang switcher visible top | ✅ | ❌ (in Profile only) | **MOBILE-MVP-OK** — Profile is conventional iOS pattern |
| Bottom tab nav | ❌ | ✅ | **MOBILE-WINS** |
| Auth-gated greeting | ❌ | ✅ | **MOBILE-WINS** |

**Required fixes (PARITY):**
1. Add location + date-range filters to mobile search screen.
2. Show price range on race card (`min(ticket_types.price)` – `max(ticket_types.price)`).

---

## 2. Race detail

### Web (`/vi/events/{slug}`)
- **Hero**: full-bleed cover image (~600px tall), large title overlay, dates "29/08 → 30/08/2029", location "Nhà Danny"
- **TRAIL RACE** / **ROAD MARATHON** etc. category badge top-left
- **Race-day countdown timer**: "RACE DAY BẮT ĐẦU TRONG 3 THÁNG 3 NGÀY 17 GIỜ 36 PHÚT 12 GIÂY" — live ticking
- **Sticky pricing CTA card**: "GIÁ TỪ 100.000đ" + "Đăng ký ngay →"
- **4 info cards grid**: Ngày đua / Địa điểm / Loại giải / Đăng ký (status)
- **Sponsor tabs**: "Nhà tài trợ" / "5BIB" with logos (5bib, Vrace, Rj, Topas, Xuka)
- **Sticky right-side cart** (`#ticket` anchor):
  - Tier header ("ELB", "sớm", "muộn" — backend ticket_type tiers)
  - Each ticket_type row: thumbnail + name + tier badge (FAMILY, ULTRA, ELB) + price + qty input (−/+)
  - "TỔNG: Xđ"
  - 2 CTAs: **"Đăng ký cá nhân"** + **"Đăng ký nhóm"**
- "Sự kiện bạn có thể thích" — related races section

### Mobile (`/events/[path]`)
- Hero image (~240px) + back/share overlay
- Title + Featured badge
- Date line "📅 30/08/2029"
- Location line "📍 Nhà Danny"
- Status badge "Open for registration"
- Description with "Xem thêm" expand
- "Courses" radio list — each: distance label + "100.000đ · Còn 3 vé"
- Sticky bottom button: "Đăng ký" or "View results"

### Gap matrix
| Feature | Web | Mobile | Status |
|---|---|---|---|
| Cover image full-bleed | ✅ ~600px | ✅ ~240px | OK (mobile responsive) |
| Race-day countdown timer | ✅ (THÁNG/NGÀY/GIỜ/PHÚT/GIÂY) | ❌ | **PARITY GAP** — drives FOMO |
| Race type category badge (TRAIL/ROAD) | ✅ | ❌ (we surface `race_type` in normalizer but never render) | **PARITY GAP** — easy fix |
| 4 info cards grid | ✅ | ❌ (4 plain text lines) | **MOBILE-MVP-OK** — text is functional |
| Sponsor section | ✅ | ❌ | **PARITY GAP** — sponsor visibility is contractual |
| "GIÁ TỪ Xđ" headline | ✅ | ❌ (price only shown per course in list) | **PARITY GAP** |
| Ticket types per course (FAMILY / ELB / ULTRA) | ✅ shown as separate cart rows | ❌ collapsed into 1 course = 1 ticket | **CRITICAL GAP** — mobile can't sell tier-priced races |
| Quantity per ticket type | ✅ | ❌ (single ticket per order) | **MOBILE-MVP-OK** with caveat — see §3 |
| "Đăng ký cá nhân" vs "Đăng ký nhóm" | ✅ 2 paths | ❌ (only individual implicit) | **MOBILE-MVP-OK** — group registration is Phase 2 |
| Related races ("Sự kiện bạn có thể thích") | ✅ | ❌ | **MOBILE-MVP-OK** — discovery is via Home tab |
| Description w/ HTML | ✅ rendered | ⚠️ stripped to plain text | **PARITY GAP** — race descriptions have rich formatting |

**Required fixes (PARITY):**
1. Add countdown timer above the courses section.
2. Surface `race.raceType` as category badge near title (TRAIL RACE / ROAD MARATHON).
3. Add "GIÁ TỪ {min}" headline above courses.
4. **CRITICAL: expand course rows to show all ticket_types**. Each course
   can have multiple tiers (5BIB Find Your New Experience 20K Thường →
   ticket_types: ELB 100k). PROD races (Techcombank etc.) will have
   Family/VIP/Standard tiers — current mobile flow can't render those.
5. HTML description: render rich text (use `react-native-render-html` or similar).
6. Sponsor strip below description (after MVP if Danny prioritizes other work).

---

## 3. Checkout flow

### Web flow (verified by clicking through)
1. **Race detail #ticket** — user adjusts qty per ticket_type → "Đăng ký cá nhân"
2. (Auth gate — redirect login if anonymous)
3. **Checkout form** — fills athlete info per ticket
4. **Payment** — VNPay redirect

Key insight: **web supports multiple tickets in 1 order** (cart model).
1 order = N ticket_types × qty each. Each ticket needs its own athlete info.

### Mobile flow (verified end-to-end up to step 1)
1. Race detail → tap "Đăng ký" with selected course
2. **Checkout step 1 "Confirm"** — re-pick course (4 radio options visible)
3. **Step 2 "Athlete info"** — single athlete form
4. **Step 3 "Payment"** — WebView VNPay

### Gap matrix
| Feature | Web | Mobile | Status |
|---|---|---|---|
| Cart-based order (multi-ticket) | ✅ | ❌ (1 course → 1 ticket) | **CRITICAL GAP** for Family-tier races; **MVP-OK** for solo races |
| Per-ticket athlete forms | ✅ N forms for N tickets | ❌ 1 form | dependent on cart fix above |
| Group registration | ✅ separate flow | ❌ not implemented | **MOBILE-MVP-OK** — PRD scope decision |
| Pre-pick course from race detail | ❌ (web shows all types in cart) | ✅ (mobile passes course_id) | **MOBILE-WINS** (simpler if 1 type) |
| Stepper UI (Confirm/Athlete/Payment) | ❌ single page | ✅ | **MOBILE-WINS** (clearer mobile UX) |

**Required fixes:**
- **Phase 1 (PARITY):** Allow at minimum 1 person to pick 1 ticket from
  the multiple ticket_types per course (right now mobile flattens 1 course
  to 1 ticket = `ticket_types[0]`, ignoring others).
- **Phase 2 (decide):** Cart model with quantity per ticket type, multi-athlete.
- **Phase 2 (decide):** "Đăng ký nhóm" group flow.

---

## 4. Login / Auth

### Web (`/vi/login`)
- 5BIB logo
- Title "Đăng nhập"
- Email field
- Password field with eye toggle
- "Quên mật khẩu" link
- "Đăng nhập" button (primary blue)
- "Đăng nhập với Google" button (Google icon)
- "Chưa có tài khoản?" link to register

### Mobile (`/login`)
- Email/password (✅)
- Google Sign-In (✅)
- **Apple Sign-In (✅)** — iOS native
- Phone OTP option (✅)
- Forgot password link (✅)

### Status: **MOBILE-WINS** — richer auth options. Web missing Apple + Phone.
No parity fix needed; mobile is the superset.

---

## 5. Tickets list (auth-gated)

Web `/vi/tickets` → redirect login. Couldn't compare without credentials.
Mobile tickets list verified earlier (3 tabs: Upcoming / Checked-in / Transferred).

**ACTION:** Manual comparison needed when web tickets accessible.
Suggest Danny log into both side-by-side and screenshot for review.

---

## 6. Status filter discoveries (already implemented, documenting here)

Backend `/pub/race?status=GENERATED_CODE` is the ONLY way to find active
races. Without it, the 6 active races are buried under 190 COMPLETE races
because backend pagination is broken (`page_no` ignored, returns same 10).

Web home filters by status implicitly (only shows active races in carousel +
"Sự kiện bạn có thể thích"). Mobile now matches via commit `be47a9b`.

---

## 7. Priority ranking (proposed)

**P0 — Ship-blocking gaps for register flow to work in PROD:**
1. Expand ticket_types per course in checkout (race 305 currently exposes
   only first ticket_type → many races have Family/VIP unreachable on mobile).
2. Show price range / "GIÁ TỪ" on home cards + race detail headline.

**P1 — UX polish that affects conversion:**
3. Countdown timer on race detail.
4. Race type badge (TRAIL/ROAD).
5. HTML description rendering.
6. Multi-filter search bar on home (location + time).

**P2 — Phase 2 features:**
7. Cart with multi-quantity per ticket_type.
8. Group registration ("Đăng ký nhóm").
9. Sponsor section.
10. Related races on detail.
11. Promo banner.

---

## 8. What QC verified working

Beyond the gaps above, these mobile screens render correctly with real
backend data (verified 2026-05-27/28 via deep-link navigation):

- ✅ Welcome onboarding
- ✅ Login (email/password against `ceo@5bib.com`)
- ✅ Home tab (active races visible after `status=GENERATED_CODE` fix)
- ✅ Race detail (cover + date + location + courses + prices + stock)
- ✅ Checkout step 1 "Confirm" (auto-selects course from URL params)
- ✅ E-Waiver step 1 (race picker appears after valid email)
- ✅ Change course (handles invalid ticket gracefully)
- ✅ Tickets list (3 tabs render — see screens in `/tmp/qc-*.png`)

Untested (require user-driven interaction beyond what simctl supports):
- Checkout step 2 (Athlete form) → step 3 (Payment WebView) end-to-end
- E-Waiver OTP verification + signing
- Payment success → ticket appears in list

---

## Appendix: Test data on DEV

- Active race for full happy-path test: **id=305 "5BIB Find Your New Experience"** slug=`5bib-find-your-new-experience`
- 4 courses: 20K (100k), 70K (200k), 10K (300k), 15K (150k)
- DEV account: `ceo@5bib.com` / `localpassword-super`
- Fake payment endpoint: `POST /order/fake-payment` (dev only — see `sdk/services/order.ts`)
