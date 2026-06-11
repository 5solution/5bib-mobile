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
