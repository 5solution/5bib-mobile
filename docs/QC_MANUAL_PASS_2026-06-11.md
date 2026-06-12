# QC Manual Test Pass — toàn bộ màn hình (2026-06-11)

> **Phương pháp:** Scripted manual test pass (UI walkthrough) từng màn trên
> iPhone 17 Pro simulator (iOS 26.5), DEV backend (dapi.5bib.com), account
> `ceo@5bib.com`. Driver: idb tap/swipe/text + screenshot từng bước (79
> shots tại /tmp/e2e/) + verify chéo BE bằng curl sau mỗi mutation.
> **Persona:** End-user Athlete. Status: 🟢 TESTING → verdict cuối ở dưới.

## Bảng verdict per màn (26 màn)

| # | Màn | UI | BE | Ghi chú |
|---|---|---|---|---|
| 1 | Login | ✅ | ✅ | Logo thật, SSO, validation. Sai pass → toast "Wrong email or password" đúng |
| 2 | Register | ✅ | ➖ | Form khớp web (name/email/2×pass/terms). Không submit (tránh rác). BE register verify riêng bằng curl: tạo account OK, cần kích hoạt email |
| 3 | Forgot password | ✅ render | ➖ | Mở + back OK, không gửi để tránh spam mail |
| 4 | Welcome / Onboarding | ➖ | ➖ | Không reach được khi đã có session; route gating onboarding chưa wire (backlog cũ B-07) |
| 5 | Home | ✅ | ✅ | Hero gradient + search pill + featured + discovery chips. Ảnh featured xám = F1 (race chứa JSON trong field ảnh) |
| 6 | Events list | ✅ | ✅ | Chip "ONGOING" raw (F3), sort race cũ lên đầu (F4) |
| 7 | Events search | ✅ | ✅ | Debounce, "VNPAY" → 2 kết quả đúng |
| 8 | Event detail | ✅ | ✅ | CountdownRing live, phase gating "Chưa mở", roster 576 VĐV (filter+search+pagination), related events, parallax + sticky header |
| 9 | Checkout — Confirm | ✅ | ✅ | 6 tier hiện đủ. F5: không gate "Chưa mở" như event detail |
| 10 | Checkout — Athlete info | ✅ | ✅ | DateField modal mới hoạt động (chọn 05/03/1990), gender segmented, draft persist khôi phục nguyên form sau reload |
| 11 | Checkout — Payment | ✅ | ✅* | *Sau fix F8: order #5B200002542IB thanh toán 925.056đ (server total). F7: picker gateway nằm dưới fold |
| 12 | Checkout result (success) | ✅ | ✅ | Total đúng server. F9 "##" fixed. F10 "View ticket" dead-end fixed |
| 13 | Tickets list | ✅ | ✅ | 2 vé mới đầu list. F11 CHECKEDIN "—" fixed. Count caps 10 (pagination backlog) |
| 14 | Ticket detail | ✅ | ✅ | BIB card 13 fields đúng data form. **F23 fixed: CHECKEDIN giờ hiện chip "Đã check in" + QR stub + actions đúng matrix (Chia sẻ/Uỷ quyền/Kết quả)** |
| 15 | Ticket detail — QR (CHECKED_IN) | ✅ | ✅ | Stub gradient + perforation + QR thật + "Trực tuyến" + pulse ring |
| 16 | Ký miễn trừ (sign) | ✅ | ✅ | Sau 2 fix: luồng authenticated không OTP, template S3 load, ký xong BE `disclaimer_status=True` + PDF S3 + **vé tự chuyển CHECKEDIN** (nghiệp vụ đúng). F15: HTML entities thô |
| 17 | E-waiver OTP entry (public) | ⚠️ | ➖ | Render nhưng F26: heading "Select race" không có picker + helper in 2 lần (backlog cũ confirmed) |
| 18 | Transfer | ✅ | ➖ | Warning + validation + CTA gating đúng. Không submit (giữ vé) |
| 19 | Change course | ✅ | ⚠️ | List sibling courses + CTA gating OK. F25: estimate lỗi race-không-hỗ-trợ → toast generic thay vì message BE |
| 20 | Rolling BIB | ✅ render | ➖ | Màn Reroll hiện đúng + warning "Only one reroll". Card tím off-brand (backlog). Không roll được (race chưa mở pool) |
| 21 | Orders list | ✅ | ✅ | Filter tabs đúng enum, đơn mới nhất đầu. F16: default tab Awaiting → tường trắng |
| 22 | Order detail | ✅ | ✅ | 3 card đủ. F17 course "—", F18 Method "UNKNOWN" raw, F19 transaction time trống |
| 23 | Profile | ✅ | ✅ | Gradient header + 3 info section + settings + 6 legal links. **F20: KHÔNG có màn Đổi mật khẩu** |
| 24 | Edit profile | ✅ | ✅ | Save ăn BE (verify + revert). F21: DOB còn text YYYY-MM-DD |
| 25 | Change avatar | ✅ render | ➖ | Modal camera/library OK. F29: X + Cancel chết khi vào bằng deep link (router.back không có parent) |
| 26 | Delete account | ⚠️ không reach | ➖ | Deep link bị modal nuốt (F28); không retry sâu để tránh rủi ro màn hard-delete |
| — | Not-found | ✅ | — | VN copy + "Về trang chủ" |
| — | Motion showcase (dev) | ✅ | — | AnimatedLogo wordmark thật + các primitive render |
| — | Sign out → login lại | ✅ | ✅ | Confirm dialog → login screen → đăng nhập lại OK. Full auth cycle PASS |

## BE verify bằng curl (mutation nào cũng đối chiếu)

- Order create: `total_price=925056` (server discount 1%) — app giờ dùng đúng
- Fake payment: paid OK với server total; fail đúng khi amount lệch
- Waiver: `disclaimer_status` False→True + `skip_liability_pdf_link` sinh trên S3
- Athlete status: REMIND_CHECK_IN → CHECKEDIN sau ký (nghiệp vụ ký = check-in)
- Profile update: PUT `/users/{id}` ăn, đã revert
- Change password: endpoint tồn tại + DTO validate (`password/newPassword/confirmNewPassword`); account seed ceo@ bị từ chối (nghi backdoor dev — login OK nhưng hash check fail); account mới cần kích hoạt email → endpoint chưa verify trọn nhưng field contract đã chốt
- Skip-liability secret: double-nested `{data:{data:"id-hash"}}` — đã unwrap đúng

## Bug FIXED trong pass này (commit kèm)

- **F23 (P1)**: `asAthleteStatus` thiếu case `CHECKEDIN` → vé đã check-in
  hiện chip sai ("Chờ xác nhận"), action sai, **KHÔNG hiện QR**. Fixed —
  verify lại trên máy: chip "Đã check in" + QR stub + đúng action matrix.

## Findings mới (chưa fix)

| ID | P | Mô tả |
|---|---|---|
| F25 | P2 | Change-course estimate lỗi → toast generic; nên surface message BE + ẩn list khi race không hỗ trợ |
| F26 | P2 | E-waiver OTP entry: heading "Select race" không có control + helper ×2 (backlog cũ, confirmed) |
| F27 | P2 | Race history: tên giải "—", distance trống, tổng "0 km" — field mapping result item |
| F28 | P3 | Deep link bị nuốt khi modal đang present |
| F29 | P3 | Change-avatar X/Cancel chết khi vào bằng deep link (router.back thiếu parent — cần fallback router.replace('/profile')) |

+ Findings cũ giữ nguyên hiệu lực: F1 (JSON-image), F3/F4 (events list),
F5/F7 (checkout), F15-F21 (xem E2E_REPORT_2026-06-11.md).

## Final Verdict

**🟡 CONDITIONAL PASS** — toàn bộ luồng tiền + vé + auth hoạt động đúng
end-to-end trên DEV sau các fix trong 2 phiên test hôm nay. Chặn release:
1. F20 — màn Đổi mật khẩu chưa tồn tại (SDK sẵn, cần build UI)
2. F1 — guard URL ảnh (khối xám đập mặt ngay home)
3. F5 — checkout cho chọn tier chưa mở bán (rủi ro đơn lỗi)
Còn lại là polish, không chặn.

## UPDATE 2026-06-11 (tối) — cả 3 blocker ĐÃ XỬ XONG → 🟢 PASS

Commit `c07127b` (sau commit `684f454` xử Uỷ quyền + time-gates + waiver
sign rebuild). Verified live trên simulator DEV:
- **F20 ✅** màn `/profile/change-password` (row Settings) — validation
  inline 8–20 ký tự chữ+số, khớp confirm, double-tap lock, lỗi BE dịch VN.
  Lưu ý coverage: account seed `ceo@` bị BE từ chối đổi pass (hash không
  khớp — backdoor login), success-path cần verify với account thật.
- **F1 ✅** `asImageUrl()` guard — root cause thật là `race_extenstion.banner`
  chứa CHUỖI JSON (race 257), không phải `images`. Home featured giờ render
  CoverFallback gradient + logo.
- **F5 ✅** checkout step-1 gate theo `valid_from/valid_to` + `is_show`
  (badge Chưa mở/Đã đóng + ngày mở bán, hint cạnh Continue, re-check lúc
  submit chống TOCTOU, clock tick 30s, auto-select tier mở đầu tiên).
- **F23/F25-F29**: F29 (change-avatar X chết khi deep link) fixed cùng commit.
- Review panel đối kháng 3-lens xác nhận + fix thêm: course toàn tier ẩn
  vẫn mua được (P2 — đã chặn cả ở selectionBlocked lẫn subtotal/variantId
  fallback), stale selection khi deep-link chéo race.

## UPDATE 2026-06-12 — ĐỢT POLISH BACKLOG (toàn bộ findings còn lại)

Verified live trên simulator DEV từng cụm:

| ID | Fix | Verify |
|---|---|---|
| F3 | RaceCard/chip thêm ONGOING ("Đang diễn ra") + CANCEL; filter sheet đổi sang enum BE thật (GENERATED_CODE/ONGOING/COMPLETE — option cũ là enum hư cấu BE không match) | ✅ list sạch badge raw |
| F4 | Events 'ALL' giờ whitelist `GENERATED_CODE,COMPLETE` như web — hết DRAFT/CANCEL/junk nổi đầu list | ✅ |
| F7 | PaymentMethodPicker dời lên ĐẦU step thanh toán (web parity) | code (UI nav 3 bước — verify ở lần mua tới) |
| F15 | Đã hết entities từ đợt rebuild waiver (render WebView) | ✅ từ 11/6 |
| F16 | Empty state orders: "Chưa có đơn hàng nào" (default tab giữ Chờ thanh toán = đúng web) | code |
| F17 | Course name từ `line_items[0].ticketType.race_course_name - type_name` → "12KM - Early Bird"; thêm qty + đơn giá line thật (trước hardcode x1 + hiện tổng đơn) | ✅ |
| F18 | `payment_method='UNKNOWN'` → ẩn row (web parity) | ✅ |
| F19 | Transaction time đọc `payment_on` (field `paid_at` không tồn tại trên wire) | ✅ "11/06/2026 19:54" |
| F21 | Edit profile DOB dùng DateField (ISO in/out, hiển thị DD/MM/YYYY) | code |
| F25 | Estimate đổi cự ly surface message BE thay vì toast generic | code |
| F26 | E-waiver entry: email lên đầu, section "Chọn giải đấu" chỉ hiện khi có data, hết helper ×2 | ✅ AX tree |
| F27 | Result normalizer đọc nested `course_info` + `chip_time` + `overall_rank` (string→number) + params camelCase (snake bị ignore — probe live) | ✅ "Total: 2 races · 109 km" |
| F2 | Greeting không bao giờ hiện email thô | ✅ "Welcome to 5BIB!" |
| F12 | Tile action 2 dòng — hết "Chuyển như…" | ✅ |
| F13 | Toast chuyển lên ĐỈNH màn (anchor bottom cũ đè đúng sticky CTA mọi màn stack), error 5s→4s, default 3s→2.5s | ✅ |
| — | Tickets pagination: pageSize 50 + infinite scroll (cap 10 cũ giấu vé) | code |
| — | Language switcher WIRED (trước là no-op): row Ngôn ngữ cycle vi/en/de, persist AsyncStorage, restore khi boot | ✅ cold restart giữ tiếng Việt |
| — | Order subtotal đọc `total_line_items_price` như web (field cũ `sub_total_price` không khớp toán discount/total trên màn) | ✅ |
| — | i18n sweep: tab Home, swipe actions, not-found, section titles, key thô `profile.bloodType` → key thật; keys mới đủ vi/en/de | ✅ |

**F28 (deep link bị modal nuốt) — INVESTIGATED, DEFER**: app không có
Linking listener nào; expo-router tự xử lý deep link trong nav tree, nhưng
RN `Modal` (DateField, rolling-bib confirm…) nằm NGOÀI nav tree nên link
đến khi modal đang mở sẽ đổi màn bên dưới mà modal vẫn đè trên. Fix đúng
cần per-modal dismissal theo navigation event — P3, để backlog riêng.

---

## UPDATE 2026-06-12 (chiều) — Payment thật fix xong + course label

| ID | Finding | Fix | Verify |
|---|---|---|---|
| F30 | **"Không tải được trang thanh toán" với MỌI gateway thật** — BE trả URL trong envelope double-nested `{data:{data:url},success:true}` (probe live cả 4 gateway), SDK đọc `data.url` → luôn rỗng | `pickUrl` walk chuỗi `data`, reject non-http | ✅ E2E full: VNPay sandbox NCB card + OTP → intercept `vnp_ResponseCode=00` → màn thành công → BE `paid`, `payment_on` khớp (đơn 200002544) |
| F31 | **P1 prod**: whitelist WebView thiếu `vnpay.vn` — prod gateway là `pay.vnpay.vn` (vnpayment.vn chỉ là sandbox) → lên prod VNPay trắng màn | thêm `vnpay.vn` vào GATEWAY_HOSTS | code (chỉ test được trên prod) |
| F32 | `checkOnepayStatus`: envelope `success:true` ngoài cùng che `success:false` của payment (probe live xác nhận body 2 success 2 cấp) → đóng WebView OnePay chưa trả tiền vẫn ra màn success | descend hết chuỗi `data` rồi mới đọc status/success ở object trong cùng | probe live shape ✅, flow OnePay chưa test được (sandbox OnePay cần thẻ test riêng) |
| F33 | Share BIB image luôn rỗng — `getBibImage`/`getStoryImage` cùng bug class double-nested (web đọc `res.data.data.data`); thiếu param `code` web có gửi | walker unwrap + truyền `ticket.value` | code |
| F34 | Đơn 0đ (voucher 100%): BE trả HTTP 266 không URL, Fetcher nuốt status → webview kẹt retry vĩnh viễn | checkout short-circuit `total<=0` → thẳng màn kết quả (poll order) — đúng nhánh 266 của web | code (DEV k có voucher 100% để tạo đơn 0đ) |
| F35 | Lỗi business từ BE (200 + success:false) hiện generic — message thật ("đơn đã thanh toán"…) bị vứt | `pickApiErrorMessage` walk chuỗi `error` (2 shape live khác depth) + surface ở payment-webview cả nhánh envelope lẫn FetcherError | code (DEV BE cấp URL cả cho đơn voided nên không trigger được) |
| F36 | Voucher %: normalizer đọc `r.type` không tồn tại trên DTO (wire là `value_type`: fixed_amount/percentage/Fixed_price) → voucher 10% hiện giảm 10đ; value âm kiểu Shopify làm tổng TĂNG | map `value_type` + `Math.abs` như web | code (đối chiếu web checkout `getDiscountValue`; k mò được code voucher live trên DEV) |
| F37 | Course picker (event detail + checkout) hiện số trống "12/21/42" vì ưu tiên `distance` (organizer nhập số) — web hiện `course.name` | CourseCard label = `name \|\| distance`, badge tier = `type_name`, dedup badge trùng label | ✅ race 257 "12KM/21km/42KM"+Early Bird/Regular; race 305 "Family/Ultra/…"+ELB; checkout step-0 + step-2 summary |

Còn mở (không đổi): JWT refresh `/renew`, Pay-now hardcode vnpay,
F28 modal-vs-deep-link, i18n nốt domain components cũ.

### F38 + F39 (2026-06-12 chiều): Guardian <18 + size áo theo config giải

| ID | Nội dung | Verify |
|---|---|---|
| F38 | **Người giám hộ cho VĐV <18 tuổi** (trước đây mobile hoàn toàn không có): section hiện ở checkout step-1 + edit vé khi tuổi < 18 (đúng điều kiện web `age<18` tại ngày hiện tại, giờ LOCAL); 6 field: tên/ngày sinh/CMND/email/SĐT/quan hệ (chips song ngữ đúng 7 option web); giám hộ phải ≥18 tại ngày sự kiện; wire `athlete_represent` nested (probe + E2E sống: athlete 11655, represent_id 2904, app Lưu → BE đủ 6 field) | ✅ sống cả read + write |
| F39 | **Size áo = chips theo `race_extenstion.t_shirt_sizes`** (CSV organizer nhập, verify race 305 "M,L,XS,VL,TOVL"); fallback 15 size chuẩn của web khi giải bỏ trống (race 257); giữ nguyên khoá racekit_edit_enable; value lạ ngoài config vẫn hiện chip riêng | ✅ sống 2 giải |

Review đối kháng bắt + đã fix: draft checkout version cũ thiếu key guardian
→ crash `.trim()` (merge-over-defaults khi restore); **BE full-replace
`athlete_represent`** → edit mobile từng wipe field FAMILY web ghi
(guardian_shirt_size/bib_name/sex/address — giờ echo passthrough); 2 màn
validate guardian lệch nhau (đồng bộ regex + chuẩn hoá +84); tuổi tính theo
UTC lệch 7h ở biên sinh nhật 18 (đổi local date); header ✓ hiện như bấm
được khi validation đang chặn (đồng bộ canSubmit); chip ma khi value cũ
'm '/lowercase (so khớp case-insensitive).

Known-divergence (ghi nhận, chưa làm): bộ field guardian mở rộng cho course
FAMILY/KID (web có guardian_shirt_size/sex/bib_name/address + luôn hiện
cho KID/FAMILY bất kể tuổi) — mobile mới gate theo tuổi; data web ghi được
bảo toàn nhờ passthrough. Athlete DEV 11655 (vé VN5BIB21K-575-QKPOBAS1)
đang để dob 2016 + guardian đầy đủ làm data demo.
