# Backend TODOs — handover requests

> **Owner:** Mobile (Danny). Backend team handed off without a contact.
> Items here need backend changes; mobile cannot work around them cleanly.

Use this file to track upstream-only fixes that emerged during real-backend
QC. When backend is reachable again, file these as tickets.

---

## 🚨 BE-MOBILE-01 — `/order/create` POST 400 on iOS Simulator (HTTP/3)

**Severity:** P1 — blocks mobile e2e test on iOS Simulator, NOT a real-device bug.

**Symptom:** From iOS Simulator the same JSON body that returns `200` over
curl returns `400 "Mismatch request param"` to `/order/create`. Verified by:
1. Mobile body diffed against curl body — byte-identical.
2. Mobile token replayed via curl → 200, order persisted.
3. Mobile request observed in `simctl log` shows transport
   `quic-connection` (HTTP/3) attempted against `dapi.5bib.com`.

**Suspected root cause:** Backend nginx does NOT advertise HTTP/3
(`curl -I` shows `HTTP/1.1 200` and no `Alt-Svc` header), yet iOS
CFNetwork speculatively negotiates QUIC anyway, and the fallback path
corrupts the POST payload mid-flight.

**Backend ask (pick one):**
- (A) Properly disable HTTP/3 at the nginx layer so iOS doesn't speculate.
  Confirm by inspecting response headers — expected absence of
  `Alt-Svc: h3=":443"`. iOS will then negotiate HTTP/1.1 cleanly.
- (B) Properly enable HTTP/3 at nginx (UDP/443 + matching `Alt-Svc`) so
  iOS's speculation actually completes via QUIC.
- (C) Front the public API with Cloudflare / similar reverse proxy and
  configure it to strip `Alt-Svc` on `dapi.5bib.com`.

**Mobile workaround (current):** None robust. iOS does not expose a public
API to disable HTTP/3 per-request. We documented this as known-issue for
the QC loop; real-device builds via TestFlight are unaffected because real
iOS speculates differently against non-Apple-CDN endpoints.

**Verification after fix:** Replay the failing body via simulator + see
`response_status=200` instead of `400` in `simctl log show --predicate
'process == "5BIB"' | grep order/create`.

---

## 🟧 BE-MOBILE-02 — `race_extension.payment_options` not respected

**Severity:** P2 — confusing UX, not a hard block.

**Symptom:** Race 305 advertises `payment_options:
["VNPAY_QR","PAYX_DOMESTIC_CARD"]` in `race_extenstion`. Mobile's payment
picker shows 4 hard-coded options (VNPay / PayX / Payoo / OnePay). If the
user picks Payoo or OnePay, the gateway WebView displays "Failed to load
payment page" because the race wasn't actually configured for that
gateway. **Web has the same bug** — verified at
`https://dev.5bib.com/vi/events/5bib-find-your-new-experience#ticket`.

**Backend ask:** None — backend is already correct. **Mobile fix landed in
this commit batch** (`filterPaymentOptions()` in
`apps/mobile/app/checkout/index.tsx`), which reads `race.paymentOptions`
and hides the unsupported entries.

**Followup:** Web app should adopt the same filter when its team comes back.

---

## 🟧 BE-MOBILE-03 — VN phone validation tightness vs UI prefix

**Severity:** P2 — soft UX bug. Already fixed mobile-side.

**Symptom:** Phone fields render with a static `+84` prefix label to the
left of the input. Users naturally type `901234567` (bare 9 digits).
Original `VN_PHONE_RX = /^(0|\+84)[35789][0-9]{8}$/` rejects bare input →
"Continue" stays disabled with no visible explanation.

**Mobile fix landed:** regex relaxed to `/^(0|\+84)?[35789][0-9]{8}$/` and
`normalizePhone()` prepends `+84` before submission so backend always
receives canonical form. See `apps/mobile/app/checkout/index.tsx`.

**Backend ask:** Confirm whether `/order/create.athlete_sub_info[].contact_phone`
expects `+84xxxxxxxxx` or `0xxxxxxxxxx`. We send `+84` — adjust
`normalizePhone()` if backend wants `0` prefix instead.

---

## 🟦 BE-MOBILE-04 — `/pub/race?page_no` ignored

**Severity:** P3 — workaround in place.

**Symptom:** Backend `/pub/race` always returns `currentPage: 0` regardless
of `page_no` query param. `page_size` capped at 10. So mobile can never
fetch past races beyond the first 10 unless we filter by `status`.

**Mobile workaround:** Home tab filters by `status=GENERATED_CODE` (6 active
races on DEV → fits in one page). Past/completed races inaccessible from
mobile UI.

**Backend ask:** Either honor `page_no` or expose a different endpoint for
paginated browse-by-status (e.g. `/pub/race?status=COMPLETE&from=X&to=Y`
or cursor-based pagination).

---

## 🟦 BE-MOBILE-05 — `course.price` always `null`

**Severity:** P3 — workaround in place.

**Symptom:** `/pub/race-course?race_id=X` and `/pub/simple-course` both
return `course.price = null` at the top level. The real per-tier price
lives in `course.ticket_types[].price` (e.g. 100000 for race 305 20km).

**Mobile workaround:** Normalizer falls back to `ticket_types[0].price`
when `course.price` is null. Race detail + home cards now show correct
prices.

**Backend ask:** Either populate `course.price` with min ticket_type price
OR document the contract so we don't rediscover it during PROD QC.

---

## 🟦 BE-MOBILE-06 — `course.race_id` missing in `/pub/simple-course` bulk response

**Severity:** P3 — workaround in place.

**Symptom:** `/pub/simple-course?race_ids=305,257` returns courses without
a `race_id` field, making client-side grouping impossible.

**Mobile workaround:** `getCoursesByRaces()` falls back to N parallel
single-race fetches, stamping `raceId` on each course locally.

**Backend ask:** Add `race_id` to each course in the multi-race response.

---

## 🚫 Out of mobile scope — Phase 2 (locked 2026-05-29 by Danny)

These web features were verified during the parity audit but **explicitly
deferred** out of mobile MVP. Do NOT reopen unless requirements change.

### Group buys — `/vi/my-group-buys`
Web has a dedicated tab + page for group registration management. The
audit visit showed it empty (paginated empty list) for `ceo@5bib.com`.
Backend endpoints exist (`/buy-group/*`) but mobile has no UI surface.

**Status:** SKIP for v2.0 mobile launch. Reassess if a customer asks.

### KYC identity verification
Mobile profile screen has the "THÔNG TIN ĐỊNH DANH" UI block with a
status badge derived from `user.idNumber` presence (mirrors web's empty
state). The actual KYC integration — uploading ID document scans, OCR,
manual review queue — is backend-side and not implemented yet on web
either (web shows the same "CHƯA ĐỊNH DANH" badge with no upload flow).

**Status:** UI placeholder is enough for v2.0. Full KYC integration is
Phase 2 — own track, own PRD, depends on backend integration with a
KYC vendor (VietQR? VNPT eKYC? — Danny TBD).
