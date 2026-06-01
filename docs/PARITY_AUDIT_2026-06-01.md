# 5BIB Mobile vs Web Parity Audit — 2026-06-01

> Audit dev.5bib.com (web) against `apps/mobile` (RN + Expo SDK 51).
> Goal: 1 trang Danny đọc, biết được app mobile đang LỆCH web ở đâu, cái gì BROKEN, cái gì THIẾU, cái gì DƯ. Sau đó Danny pick priority — tao fix tuần tự, không thêm feature mới cho tới khi list này clean.

## TL;DR cho người không kiên nhẫn

| Status | Số mục |
|---|---|
| 🔴 Bug đã biết (crash/visual lệch) | **7** |
| 🟡 Tính năng web có, mobile THIẾU | **9** |
| 🟢 Tính năng mobile có, web không có (extras) | **5** |
| ⚪ Đã làm xong (mới session này, chưa verify trên device) | **12** |

---

## 🔴 Bug đã biết — phải fix trước khi nói chuyện feature mới

| # | Nơi | Triệu chứng | Nguyên nhân | Mức |
|---|---|---|---|---|
| B-01 | **Event detail (vào màn `events/[path]`)** | Trắng màn / crash | Hook order — đã fix commit `664e6c8` nhưng Danny vẫn báo lỗi → cần verify lại trên device | 🔴 P0 |
| B-02 | **Cold start app** | Có thể trắng nếu chưa rebuild native client (Skia + Lottie là native module mới) | Cần `npx expo prebuild --clean && npx expo run:ios` | 🔴 P0 |
| B-03 | **Ticket detail — action buttons** | "Lộn xộn", quá nhiều button dọc cột | Đã redesign primary + tile grid (commit `ec1e586`) — cần verify | 🟡 P1 |
| B-04 | **Tickets list swipe** | Có thể conflict với FlatList vertical scroll | Subagent claim đã set activeOffsetX — cần verify trên device | 🟡 P1 |
| B-05 | **Skia confetti** | Có thể không render | Cần rebuild native | 🟡 P1 |
| B-06 | **AppLaunchIntro** | Có thể che app lâu hơn 1.9s | Chưa verify timeline thực | 🟢 P2 |
| B-07 | **Onboarding screen** mới tạo | Không có route gating — màn /login chưa biết check `seenOnboarding` | Cần wire `app/index.tsx` redirect logic | 🟡 P1 |

---

## 🟡 Web có, Mobile THIẾU

Lấy từ audit dev.5bib.com vs mobile screens. Đây là cái thiếu thật, không phải nice-to-have.

### Home tab

| # | Web có | Mobile có | Gap |
|---|---|---|---|
| G-01 | **Sponsored races** với custom CTA label ("Múc nhanh", "Mua nhanh đi bạn") | Chỉ có featured carousel chung | Mobile chưa hiển thị sponsored sticker + custom CTA |
| G-02 | **Live race tracker** (banner "Trực tiếp — đang diễn ra, X đang chạy, Y finished") | Không có | Mobile không có widget live race day |
| G-03 | **Race-type categories** (Newbie / Trail / Road) clickable | Không có | Mobile chưa có entry points theo loại giải |
| G-04 | **Events by city chips** (Hà Nội, TP.HCM, Đà Nẵng, Đà Lạt) | Không có | Mobile chưa có city quick filter |
| G-05 | **Community testimonials** + stats (109 giải, 353.9K, 4.4K VĐV) | Không có | Marketing-only, có thể bỏ qua mobile |
| G-06 | **Bookmark/Save race** heart icon trên mọi card | Không có | Mobile chưa có chức năng lưu giải |

### Events listing

| # | Web có | Mobile có | Gap |
|---|---|---|---|
| G-07 | **Popular search chips** (VMM, Hà Nội Marathon, Trail Sa Pa...) | Không có | Mobile chỉ có search field, không có gợi ý |
| G-08 | **Price range slider** filter | Không có | Mobile chưa có filter giá |
| G-09 | **Grid / List view toggle** | Chỉ có list | Mobile mặc định list, ok |
| G-10 | **Sort dropdown** (Ngày gần / Giá / Phổ biến) | Không có | Mobile mặc định sort newest, không cho user đổi |

### Event detail

| # | Web có | Mobile có | Gap |
|---|---|---|---|
| G-11 | **Custom organizer tabs** (Sponsors / Test / Test2 — CMS-driven) | Không có tab | Mobile flatten all content vào 1 scroll. OK cho mobile nhưng mất content tabs khác |
| G-12 | **Athlete public roster** (table 493 athletes với BIB + flag) | Không có | Mobile thiếu xem danh sách VĐV đăng ký |
| G-13 | **Multi-phase ticket cart** (Early Bird / Regular accordion với "Chưa mở" gating) | Có flatten ticket_types nhưng KHÔNG có phase accordion + "Chưa mở" trạng thái | Phase + date-gated availability chưa map |
| G-14 | **Group buy** entry (`/vi/group-buy?race_id=`) | Mày bảo deferred Phase 2 | Confirmed skip |
| G-15 | **Related events carousel** dưới event detail | Không có | Mobile thiếu cross-sell |

### Auth + Profile

| # | Web có | Mobile có | Gap |
|---|---|---|---|
| G-16 | Login Google SSO | Có (`google-signin` đã setup) | OK |
| G-17 | Register: chỉ Email + Tên + Pass + Confirm Pass | Không kiểm tra mobile có khớp không | Cần verify mobile register form khớp web |
| G-18 | Footer pháp lý (6 link policy) | Mobile chỉ có "Quy chế" 1 link | Mobile thiếu 5 policy link |

### E-waiver

| # | Web có | Mobile có | Gap |
|---|---|---|---|
| G-19 | OTP-based e-waiver entry không cần login | Mobile có e-waiver screen | Cần verify mobile OTP flow khớp web |

---

## 🟢 Mobile có thêm (web không có) — EXTRAS

| # | Mobile có | Web có | Justify giữ? |
|---|---|---|---|
| E-01 | **Rolling BIB / Quay BIB** game gamification | Web KHÔNG có | Mobile-only gamification, giữ — nhưng cần race với `bib_set_up=true` để test |
| E-02 | **Onboarding parallax** 3 màn intro | Không có | Mobile UX standard, giữ |
| E-03 | **App launch intro** splash animated logo | Không có | Mobile UX standard, giữ |
| E-04 | **Motion showcase dev screen** | N/A | Dev-only, giữ |
| E-05 | **Tab bar navigation** (Home / Events / Tickets / Orders / Profile) | Web là top nav | Mobile pattern, giữ |

---

## ⚪ Đã làm trong session này — chưa verify trên device

Liệt kê để Danny biết phạm vi đã đụng:

1. **Status matrix** ticket → web parity 8-status enum, badge labels khớp web
2. **Conditional QR card** chỉ show khi CHECKED_IN/RACEKIT_RECEIVED
3. **Motion primitives** (11 cái): FadeSlideIn, StaggerItem, PressScale, QRPulseRing, BadgeShimmer, SuccessBurst, Flip3D, AppLaunchIntro, SwipeActions, SkiaConfetti, LottieView, AnimatedLogo, IconMorph, CountdownRing
4. **Card spring press** + haptics tự động
5. **Button gradient sweep + haptic** medium
6. **Skeleton shimmer** thay opacity pulse
7. **Race detail parallax + sticky header**
8. **Ticket detail action redesign** primary + tile grid
9. **Tab tickets/orders/home** stagger entry
10. **Checkout result success** confetti + burst
11. **Rolling BIB reveal** Flip3D + confetti
12. **/dev/motion-showcase** preview screen

---

## 🎯 Đề xuất priority — Danny pick

### Track A: Lock foundation (zero feature mới)
Phải làm trước khi tao thêm bất kỳ thứ gì:

1. **B-01** Verify event detail không crash trên device (mày test rồi nói)
2. **B-02** Rebuild native client (`npx expo prebuild --clean && npx expo run:ios`)
3. **B-04** Verify swipe vs scroll trên ticket list
4. **B-07** Wire onboarding gating: app/index.tsx → check `AsyncStorage.seenOnboarding` → push /onboarding hoặc /login
5. Loại bỏ motion nào mày feel "không ngon" — tao revert

### Track B: Web parity gap cao priority
Sau khi Track A xong:

1. **G-13 Multi-phase ticket cart** — đây là biggest commerce gap. Mobile cần Early Bird/Regular accordion + "Chưa mở" gating. Nếu user mua ticket trên mobile mà phase chưa mở thì confusing.
2. **G-12 Athlete public roster** — danh sách VĐV trên event detail (xem 493 người đang đăng ký). Social proof + tìm bạn bè cùng giải.
3. **G-06 Save/Bookmark race** — heart icon trên card. Cần thêm SDK endpoint + storage.
4. **G-15 Related events** — carousel "Sự kiện bạn có thể thích" dưới detail.
5. **G-07/G-08/G-10 Filters mở rộng** — popular search chips + price slider + sort.

### Track C: Nice-to-have (defer)
1. G-02 Live race tracker widget
2. G-03 Race-type categories cards
3. G-04 City quick filter chips
4. G-05 Testimonials section
5. G-11 Custom organizer tabs

---

## 🛠️ Recommended next step — tao đề xuất

Mày chọn 1:

- **A) "Track A trước"** → tao verify từng bug trên device rồi báo cáo, không code mới
- **B) "Fix B-01 + B-04 thôi"** → tao tập trung 2 bug critical, bỏ qua các bug nhỏ
- **C) "G-13 multi-phase cart"** → biggest commerce gap, ưu tiên trước motion
- **D) Liệt kê cụ thể bug mày đang thấy** — tao fix đúng cái đó, không guess

Cá nhân tao đề xuất **D** vì mày đang frustrated và nói "lỗi nhiều". Tao guess sẽ miss. Mày screenshot hoặc text mô tả 3-5 lỗi cụ thể mày thấy trên màn → tao fix tuần tự, mỗi cái commit + push, mày verify từng cái.

Không thêm feature nào cho tới khi list bug mày đưa = 0.
