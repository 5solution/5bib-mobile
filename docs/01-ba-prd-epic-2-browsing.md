# FEATURE-003: EPIC-2 — Race Browsing

**Status:** 🔵 DRAFT → 🔵 READY khi xong
**Author:** 5bib-po-ba
**Wave:** 2 of 4
**Linked:** [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md), [epic-1-auth](01-ba-prd-epic-1-auth.md)
**Audience:** Claude Design (generate UI) + Coder

---

## 📌 Pre-flight check

- [x] Đã đọc `00-manager-init.md` + Wave 1 (overview + design-system)
- [x] Đã đọc memory `codebase-map.md` + `known-issues.md`
- [x] Spot-check code thật: `src/services/race/index.ts`, `src/services/race-course/index.ts`

---

## 🎯 EPIC-2 Goal

Cho phép Athlete + Anonymous user **khám phá giải đấu**: home feed, browse all events, filter, xem race detail, xem course detail. Đây là TOP của funnel — UX tốt → user nhanh chóng vào checkout.

## 📦 Scope EPIC-2

| Screen ID | Screen Name | Route | Auth |
|-----------|------------|-------|------|
| S-BROWSE-01 | Home Tab — Race Feed | `/(tabs)/home` | Optional (anon OK) |
| S-BROWSE-02 | All Events List | `/events` | Optional |
| S-BROWSE-03 | Event Detail | `/events/[path]` | Optional |
| S-BROWSE-04 | Course Detail (bottom sheet) | (overlay on event detail) | Optional |
| S-BROWSE-05 | Challenges List | `/challenges` | Optional |
| S-BROWSE-06 | Challenge Detail | `/challenges/[id]` | Optional |
| S-BROWSE-07 | Race Detail Standalone (alt route) | `/race-detail/[id]` | Optional |
| S-BROWSE-08 | Search Modal | (overlay) | Optional |
| S-BROWSE-09 | Filter Bottom Sheet | (overlay) | Optional |

---

## 👤 User Stories

- **US-BROWSE-01:** As an **Athlete**, I want to **xem giải sắp diễn ra** so that quyết định đăng ký giải nào tiếp theo.
- **US-BROWSE-02:** As an **Anonymous Visitor**, I want to **browse giải không cần login** so that đánh giá xem app có giải tôi quan tâm không trước khi đăng ký.
- **US-BROWSE-03:** As an **Athlete**, I want to **search giải theo tên** so that nhanh chóng tìm giải biết tên.
- **US-BROWSE-04:** As an **Athlete**, I want to **filter giải theo location/date/type** so that tìm giải phù hợp lịch + vị trí.
- **US-BROWSE-05:** As an **Athlete**, I want to **xem chi tiết course** (distance, elevation, map) so that chọn cự ly phù hợp khả năng.
- **US-BROWSE-06:** As an **Athlete**, I want to **xem giải highlight + featured** so that nhanh chóng thấy giải nổi bật BTC promote.
- **US-BROWSE-07:** As an **Athlete**, I want to **share giải qua mạng xã hội** so that rủ bạn bè cùng đăng ký.

---

## 📜 Business Rules (BR-BROWSE-XX)

| ID | Business Rule |
|----|--------------|
| BR-BROWSE-01 | Home tab show **featured + upcoming races** — pagination 10 items/page, infinite scroll. Default sort: `start_date ASC`. |
| BR-BROWSE-02 | Race status filter: `OPEN_FOR_SALE`, `COMING_SOON`, `CLOSED`, `FINISHED`. Mobile MVP show 2 nhóm: "Đang mở đăng ký" (`OPEN_FOR_SALE`) + "Đã kết thúc" (`CLOSED`/`FINISHED`). |
| BR-BROWSE-03 | Race highlighted (`is_highlight=true`) hiển thị badge "⭐ Nổi bật" trên card. |
| BR-BROWSE-04 | Race khi `bib_set_up=true` mới enable button "Đăng ký" trên detail screen. Nếu false → button disabled với label "Chưa mở đăng ký". |
| BR-BROWSE-05 | Cache race list: SWR-style — hiển thị cached ngay, fetch fresh background. TTL cache 30 phút trên client (parity web ISR 1800s). |
| BR-BROWSE-06 | Search debounce 300ms client-side trước khi fire API. |
| BR-BROWSE-07 | Filter combine với search — cả hai cùng apply (AND logic). |
| BR-BROWSE-08 | Race detail có hero image — load lazy với placeholder skeleton. KHÔNG block render content nếu image fail. |
| BR-BROWSE-09 | Course detail show map (Leaflet OSM web → `react-native-maps` mobile) — fallback static image nếu map fail load (vd: race chưa có toạ độ). |
| BR-BROWSE-10 | Share race: native share intent (`expo-sharing`) — payload chứa race name + universal link `https://5bib.com/events/[slug]` (deep link return). |
| BR-BROWSE-11 | Anonymous user tap "Đăng ký" trên course → modal "Cần đăng nhập để mua BIB" + CTA "Đăng nhập" / "Đăng ký" → sau login redirect back về course detail. |
| BR-BROWSE-12 | Race detail có nhiều course → user chọn 1 course → navigate sang EPIC-3 Checkout với `race_id + course_id` query param. |
| BR-BROWSE-13 | Race detail có status `CLOSED` hoặc `FINISHED` → show button "Xem kết quả" → mở WebView `result.5bib.com/event/{raceId}` (qua EPIC-5 S-RESULT-01b WebView wrapper). KHÔNG navigate native leaderboard (đã removed rev2). |
| BR-BROWSE-14 | Offline: show cached list/detail từ AsyncStorage (BR-GLOBAL-02 extend). Banner "Đang offline" sticky top. Search/filter disable khi offline. |

---

## 🖥️ Per-Screen Spec

### S-BROWSE-01: Home Tab — Race Feed

**Route:** `/(tabs)/home` (bottom tab)

**Wireframe:**
```
┌─────────────────────────────────────┐
│ 🏃 5BIB                       🔍 🔔 │  ← header: logo + search icon + notif icon
├─────────────────────────────────────┤
│ Chào, Nguyễn Văn A                  │  ← greeting (nếu logged in)
│                                     │
│ ╔═════════════════════════════════╗ │  ← featured carousel
│ ║   [Hero image race featured]    ║ │     swipeable, 1.6:1 ratio
│ ║                                 ║ │     dots indicator bottom
│ ║   Saigon Marathon 2026         ║ │
│ ║   📅 15/03/2026 · 📍 TP.HCM     ║ │
│ ║   [Đăng ký ngay]                ║ │
│ ║                                 ║ │
│ ║   ● ○ ○                          ║ │
│ ╚═════════════════════════════════╝ │
│                                     │
│ ── Giải sắp diễn ra ─────────────── │  ← section header
│                                     │
│ ┌─────────────────────────────────┐ │  ← race card (vertical list)
│ │ [thumbnail 80×80]               │ │
│ │ Hanoi Half Marathon ⭐          │ │  ← name + highlight badge
│ │ 📅 20/04/2026                   │ │
│ │ 📍 Hà Nội · 5/10/21km           │ │  ← courses preview
│ │ [Đang mở đăng ký]               │ │  ← status badge
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ... more race cards             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Xem tất cả giải →]                  │  ← CTA bottom of feed
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Initial / Loading | Skeleton: 1 hero card + 5 race cards skeleton. Shimmer animation. |
| Empty (KHÔNG có race nào) | Empty state: icon 🏃 + "Hiện chưa có giải nào" + CTA "Khám phá blog" (link blog tab) |
| Filled | Hero carousel với 3-5 featured + race cards list |
| Refresh (pull-to-refresh) | Native `RefreshControl` brand.primary indicator |
| Error fetch | Toast top "Không tải được giải, thử lại" + fallback cached data nếu có |
| Offline | Banner top "Đang offline — hiển thị dữ liệu đã lưu" + cached races |
| Anonymous | Greeting "Chào mừng đến 5BIB!" thay vì tên user |

**Components used:** Header (custom với logo left, icon right), Carousel (custom hoặc `react-native-snap-carousel`), Race Card (xem design-system #4 variant `race`), Badge, Pull-to-refresh, Empty State, Banner

**Actions:**

| # | User action | UI behavior | Trigger | Next state |
|---|-------------|-------------|---------|------------|
| 1 | Tap 🔍 search icon | Open S-BROWSE-08 search modal full screen | Navigation | Search active |
| 2 | Tap 🔔 notification | Navigate `/notifications` (defer Phase 2 — MVP show empty list) | Navigation | Notif screen |
| 3 | Swipe featured carousel | Change slide, dots animate | Native gesture | New slide |
| 4 | Tap featured "Đăng ký ngay" | Navigate event detail `/events/[path]` | Navigation | S-BROWSE-03 |
| 5 | Tap race card | Navigate `/events/[path]` | Navigation | S-BROWSE-03 |
| 6 | Pull-to-refresh | Re-fetch race list + featured, replace cache | API | Loading → Filled |
| 7 | Scroll to bottom | Auto load page tiếp theo (infinite scroll) | API pagination | Append to list |
| 8 | Tap "Xem tất cả giải →" | Navigate `/events` | Navigation | S-BROWSE-02 |

**Data binding:**

| UI Field | Data source | Format hiển thị | Empty state |
|----------|------------|-----------------|-------------|
| Featured carousel | `GET /pub/race?is_highlight=true&pageSize=5` | Hero card | Skip section nếu rỗng |
| Race list | `GET /pub/race?status=OPEN_FOR_SALE&pageSize=10&pageNo=X&sortField=start_date&sortDirection=ASC` | Race card | Empty state full screen |
| Race name | `race.title` | text VN | "—" |
| Race date | `race.start_date` → format `dd/MM/yyyy` (date-fns) | "20/04/2026" | "Chưa xác định" |
| Race location | `race.location` hoặc `race.city` | text VN | "Chưa xác định" |
| Courses preview | `race.courses.map(c => c.distance).join('/')` | "5/10/21km" | "" |
| Highlight badge | `race.is_highlight === true` | Show "⭐ Nổi bật" badge | Hide |
| Status badge | `race.status` → mapped VN label | "Đang mở đăng ký" | — |
| Thumbnail | `race.cover_image_url` | Image cached | Placeholder gray |

**Edge cases UX:**
- Featured rỗng → ẩn section, list main full bleed
- Race count < 10 → KHÔNG show "Xem tất cả" CTA
- Hero image load chậm → skeleton placeholder, content text vẫn render
- Anonymous user → KHÔNG show greeting cá nhân, show "Chào mừng đến 5BIB!"

**Accessibility:**
- Carousel: announce slide N of M
- Each race card có accessibilityLabel: "Giải {name}, {date}, {location}, {status}"
- Pull-to-refresh announce "Đang tải lại"
- Touch target ≥ 48dp/44pt

---

### S-BROWSE-02: All Events List

**Route:** `/events`

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ← Tất cả giải              🔍 ⚙️    │  ← header với search + filter
├─────────────────────────────────────┤
│ 🏷 Đang mở · TP.HCM · Tháng 4    ✕ │  ← active filter chips
├─────────────────────────────────────┤
│ Sắp xếp: Ngày diễn ra ↓             │  ← sort selector tap → bottom sheet
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [thumb] Race A                  │ │
│ │ 📅 ... 📍 ... 🏃 5/10/21km      │ │
│ │ [Đang mở]                       │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ... race cards                  │ │
│ └─────────────────────────────────┘ │
│ ⏳ Đang tải thêm...                  │  ← infinite scroll loader
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Initial / Loading | Skeleton 6 race cards |
| Filled | List cards với pagination info implicit |
| Filtered + filled | Active filter chips visible, list filtered |
| Filtered + empty | Empty state: "Không có giải nào khớp filter" + CTA "Xoá bộ lọc" |
| Loading more (pagination) | Footer spinner + "Đang tải thêm..." |
| End of list | Footer "Đã hiển thị tất cả {totalCount} giải" |
| Error fetch | Toast + retry button trên empty area |
| Offline | Banner + cached data |
| Search active in list | Search bar morph header, list filter realtime |

**Components used:** Header, Filter Chips (horizontal scroll), Sort Selector (bottom sheet), Race Card, Empty State, Footer loader, Pull-to-refresh

**Actions:**

| # | User action | UI behavior | Trigger |
|---|-------------|-------------|---------|
| 1 | Tap 🔍 | Search bar replace title (animation 200ms), keyboard show | useState |
| 2 | Tap ⚙️ filter | Open S-BROWSE-09 Filter bottom sheet | Navigation |
| 3 | Tap filter chip ✕ | Remove that filter, re-fetch list | State + API |
| 4 | Tap sort | Open Sort bottom sheet (5 options: Ngày ASC/DESC, Tên A-Z, Phổ biến, Gần nhất) | Modal |
| 5 | Type search | Debounce 300ms (BR-BROWSE-06) → API `?title=X` | API |
| 6 | Tap race card | Navigate `/events/[path]` | Navigation |
| 7 | Scroll to 80% list | Auto load `pageNo + 1` | API pagination |
| 8 | Pull-to-refresh | Reset pageNo=1, re-fetch | API |

**Data binding:**

| UI Field | Data source | Note |
|----------|------------|------|
| Race list | `GET /pub/race?status=X&title=Y&race_type=Z&pageNo=N&pageSize=10` | clean SDK shape; legacy field `list, totalPages, currentPage` |
| Filter chips state | Local state (Zustand `useBrowseFilterStore`) | Persist across navigation (KHÔNG persist across app restart) |

**SDK contract:**

```typescript
// Clean SDK input
interface ListRacesInput {
  pageNo?: number;             // default 1
  pageSize?: number;           // default 10
  status?: 'OPEN_FOR_SALE' | 'COMING_SOON' | 'CLOSED' | 'FINISHED';
  title?: string;
  raceType?: string;           // SDK rename → backend `race_type`
  isHighlight?: boolean;       // SDK rename → backend `is_highlight`
  bibSetUp?: boolean;          // SDK rename → backend `bib_set_up`
  sortField?: string;          // 'start_date' | 'title' | 'created_at'
  sortDirection?: 'ASC' | 'DESC';
}

// Clean SDK response (normalized từ legacy {list, totalPages, currentPage})
interface ListRacesResponse {
  items: Race[];               // SDK rename `list` → `items`
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
  };
}

interface Race {
  id: string;                  // SDK normalize từ numeric `race_id`
  slug: string;
  title: string;
  description?: string;
  coverImageUrl: string | null; // snake → camel
  startDate: string;            // ISO
  endDate?: string;
  location?: string;
  city?: string;
  isHighlight: boolean;
  bibSetUp: boolean;
  status: 'OPEN_FOR_SALE' | 'COMING_SOON' | 'CLOSED' | 'FINISHED';
  raceType?: string;
  courses?: Array<{
    id: string;
    distance: string;          // "5km"
    name: string;
    price: number;
  }>;
}
```

**Endpoint specification:**

| Element | Spec |
|---------|------|
| Method | GET |
| Path | `/pub/race` |
| Auth | None (public) |
| Request (clean SDK) | `ListRacesInput` (xem trên) |
| Backend legacy | params snake_case: `?status=X&race_type=Y&is_highlight=Z&bib_set_up=W&title=...&pageNo=N&pageSize=10&sortField=start_date&sortDirection=ASC` |
| Response (clean SDK) | `ListRacesResponse` (normalized) |
| Status codes | 200 success / 500 server |
| Caching | Web ISR 30 min; mobile SWR-style (in-memory + AsyncStorage backup) |
| SDK normalize | YES — rename request fields + normalize response shape |

---

### S-BROWSE-03: Event Detail

**Route:** `/events/[path]` — `path` là race slug

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ←                          ⤴ 🔖    │  ← back + share + bookmark (Phase 2)
├═════════════════════════════════════┤  ← transparent header overlay
│                                     │
│     [Hero image 16:9]               │  ← full bleed top
│                                     │
├─────────────────────────────────────┤
│  Saigon Marathon 2026               │  ← race title heading.h1
│  ⭐ Nổi bật                          │  ← badge if highlight
│                                     │
│  📅 15/03/2026 · 6:00 sáng          │  ← date + time
│  📍 TP.HCM · Phú Mỹ Hưng            │  ← location
│                                     │
│  [Đang mở đăng ký]                  │  ← status badge
│                                     │
│  ── Giới thiệu ───────────────────  │
│  Lorem ipsum description ...        │  ← description (collapse 3 lines)
│  [Xem thêm ↓]                        │
│                                     │
│  ── Cự ly ────────────────────────  │
│  ┌─────────────────────────────┐    │
│  │ 5 km                        │    │  ← course card (tappable)
│  │ 200.000đ · Còn 50 slot      │    │
│  │ Mở: 01/01 - 14/03           │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 10 km                       │    │
│  │ 350.000đ                    │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 21 km                       │    │
│  │ 500.000đ                    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── Lịch trình ───────────────────  │
│  • 04:30 Mở cổng                    │  ← timeline
│  • 05:30 Khởi động                  │
│  • 06:00 Xuất phát 21km             │
│  ...                                │
│                                     │
│  ── Bộ kit ────────────────────────  │
│  [grid 4 ảnh racekit]               │
│                                     │
│  ── Vị trí ───────────────────────  │
│  [map mini 300×200]                  │  ← tap → open native map
│                                     │
├─────────────────────────────────────┤
│  [Chọn cự ly đăng ký]               │  ← sticky bottom CTA full width
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Loading | Skeleton hero + skeleton text sections |
| Filled | Full content render |
| Description collapsed | Show 3 lines + "Xem thêm ↓" |
| Description expanded | Show all + "Thu gọn ↑" |
| Race CLOSED | CTA replace với "Xem kết quả" → open WebView `result.5bib.com/event/{raceId}` (xem EPIC-5 rev2) |
| Race FINISHED | Same as CLOSED |
| Race `bib_set_up=false` | CTA disabled với label "Chưa mở đăng ký" |
| Anonymous + tap CTA | Modal đăng nhập (BR-BROWSE-11) |
| Authenticated + tap CTA | Navigate course picker hoặc S-BROWSE-04 |
| Image load fail | Placeholder gray + retry icon |
| Map fail load | Static fallback image with "Xem trên Google Maps" link |
| Offline | Banner + cached data |

**Components used:** Header (transparent overlay on hero), Hero Image, Badge, Description Collapse, Course Card (custom), Timeline, Image Grid, Mini Map, Sticky Bottom CTA, Bottom Sheet (for course detail S-BROWSE-04)

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Tap back ← | Pop screen |
| 2 | Tap ⤴ share | Open native share intent với race name + universal link |
| 3 | Tap 🔖 bookmark | Add to favorites (Phase 2, MVP show toast "Tính năng sắp ra mắt") |
| 4 | Scroll | Hero parallax effect (optional), header morph từ transparent → solid khi scroll > hero height |
| 5 | Tap "Xem thêm" description | Expand full description |
| 6 | Tap course card | Open S-BROWSE-04 Course Detail bottom sheet |
| 7 | Tap mini map | Open native map app với race coordinates (Apple Maps iOS / Google Maps Android) |
| 8 | Tap "Chọn cự ly đăng ký" | Scroll smooth tới section "Cự ly" hoặc open course picker bottom sheet |

**Data binding:**

| UI Field | Data source |
|----------|------------|
| Race title | `race.title` |
| Hero image | `race.coverImageUrl` |
| Date | `race.startDate` formatted |
| Location | `race.location + ", " + race.city` |
| Description | `race.description` (HTML stripped to plain text mobile MVP) |
| Status badge | `race.status` mapped |
| Courses | `race.courses[]` |
| Timeline | `race.schedule[]` (nếu backend có; nếu KHÔNG, ẩn section) |
| Racekit images | `race.racekit_images[]` |
| Map coords | `race.latitude, race.longitude` |

**Endpoint:**

| Element | Spec |
|---------|------|
| Method | GET |
| Path | `/pub/by-slug` (preferred) hoặc `/pub/race-by-id` |
| Auth | None |
| Request (clean SDK) | `{ slug: string, isDetail?: boolean }` (default `isDetail: true` cho detail screen) |
| Backend legacy | `?slug=X&is_detail=true` |
| Response | `Race` (clean shape) với `courses[]`, `schedule[]`, `racekit_images[]` included |
| Caching | 30 min |
| SDK normalize | YES |

---

### S-BROWSE-04: Course Detail (Bottom Sheet)

**Triggered:** từ S-BROWSE-03 khi tap course card

**Wireframe:**
```
┌─────────────────────────────────────┐
│             ━━━━                    │
│  5 km                                │  ← course distance heading.h2
│  Saigon Marathon 2026               │  ← race name body.md secondary
│  ─────────────────────────────────  │
│                                     │
│  📏 Cự ly: 5 km                     │
│  📈 Độ cao: +50m / -50m              │
│  ⏱ Cut-off: 1 tiếng                 │
│  💰 Giá: 200.000đ                   │
│  🎫 Còn: 50 vé                       │
│  📅 Mở: 01/01/2026 - 14/03/2026     │
│                                     │
│  ── Mô tả ────────────────────────  │
│  Course nhẹ nhàng phù hợp người mới...│
│                                     │
│  ── Bản đồ ───────────────────────  │
│  [map full width 16:10]              │  ← scroll trong sheet
│                                     │
├─────────────────────────────────────┤
│  [Đăng ký cự ly này — 200.000đ]     │  ← sticky bottom CTA
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Loading | Skeleton trong sheet |
| Filled | Full content |
| Sold out (`available_slots === 0`) | CTA disabled "Đã hết vé", badge "Hết vé" |
| Sale closed (date past) | CTA disabled "Đã đóng đăng ký" |
| Sale not opened | CTA disabled "Mở đăng ký từ {date}" |
| Anonymous + CTA | Same as BR-BROWSE-11 |

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Drag down sheet | Dismiss to event detail |
| 2 | Tap CTA "Đăng ký cự ly này" | Navigate `/checkout?race_id=X&course_id=Y` |

**Endpoint:** `GET /pub/race-course-by-id?race_course_id=X`

```typescript
// Clean SDK
interface CourseDetailInput { courseId: string }

interface CourseDetail {
  id: string;
  raceId: string;
  raceName: string;
  name: string;                  // "5 km"
  distance: string;              // "5 km"
  distanceMeters: number;        // 5000
  elevationGain?: number;        // +50m
  elevationLoss?: number;        // -50m
  cutOffMinutes?: number;
  price: number;
  currency: 'VND';
  availableSlots: number | null; // null = unlimited
  totalSlots?: number;
  saleOpenAt: string;            // ISO
  saleCloseAt: string;
  description?: string;
  mapImageUrl?: string;
  gpxUrl?: string;
  coordinates?: { lat: number; lng: number }[];
}
```

---

### S-BROWSE-05 + S-BROWSE-06: Challenges List + Detail

**Routes:** `/challenges` + `/challenges/[id]`

> **Note:** "Challenges" trên web là 1 dạng race đặc biệt (vd: long-distance virtual challenge, multi-month event). Spot-check code: KHÔNG có service `challenges` riêng — có thể dùng filter `/pub/race?race_type=CHALLENGE` để fetch.

**PAUSE-EPIC2-01:** Backend confirm — challenges có endpoint riêng hay dùng filter race? BA recommend dùng filter để đơn giản. Layout S-BROWSE-05 + S-BROWSE-06 reuse pattern S-BROWSE-02 + S-BROWSE-03 (DRY).

---

### S-BROWSE-07: Race Detail Standalone (alt route)

**Route:** `/race-detail/[id]`

Tương đương S-BROWSE-03 nhưng route bằng race ID thay vì slug. Lý do tồn tại: deep link từ external (vd: email marketing có race ID thay vì slug). Behavior identical với S-BROWSE-03.

Endpoint: `GET /pub/race-by-id?race_id=X&is_detail=true`

---

### S-BROWSE-08: Search Modal

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ✕  [🔍 Tìm giải...]              ⨯  │  ← search bar full + close
├─────────────────────────────────────┤
│ ── Lịch sử tìm kiếm ─────────────── │
│ 🕐 saigon marathon                  │  ← recent search items
│ 🕐 hanoi half                       │
│ 🕐 trail                            │
│ [Xoá lịch sử]                       │
│                                     │
│ ── Tìm kiếm phổ biến ───────────────│
│ 🔥 ultra marathon                   │
│ 🔥 5km                              │
│ 🔥 night run                        │
└─────────────────────────────────────┘
```

**States:**
- Initial (focus): show recent search (AsyncStorage) + popular (hardcoded or from backend)
- Typing: debounce 300ms → show results inline (race cards minified)
- Results found: list cards
- Empty results: "Không tìm thấy giải nào khớp '{query}'"
- Loading typing: spinner inline trong search bar

**Actions:**
- Type → debounced search
- Tap recent → fill search bar + search
- Tap result card → navigate event detail + save to recent search (max 10 items LRU)
- Tap ✕ → dismiss modal

**Data:**
- Recent search: AsyncStorage key `recent_searches` (array of strings, max 10)
- Live search: `GET /pub/race?title=X&pageSize=5`
- Popular search: hardcoded MVP, hoặc fetch từ `GET /pub/race/popular-keywords` (TBD backend confirm)

---

### S-BROWSE-09: Filter Bottom Sheet

**Wireframe:**
```
┌─────────────────────────────────────┐
│             ━━━━                    │
│  Bộ lọc                              │  ← title
│  [Xoá tất cả]                        │  ← top-right
│  ─────────────────────────────────  │
│                                     │
│  Trạng thái                          │
│  ◯ Đang mở đăng ký                  │  ← radio group
│  ◯ Sắp mở                            │
│  ◯ Đã đóng                           │
│  ◯ Đã kết thúc                       │
│                                     │
│  Loại giải                           │
│  ☐ Marathon                          │  ← multi checkbox
│  ☐ Trail                             │
│  ☐ Triathlon                         │
│  ☐ Challenge                         │
│                                     │
│  Tháng diễn ra                       │
│  [Chọn tháng]                        │  ← date picker
│                                     │
│  Khu vực                             │
│  [Chọn tỉnh/thành]                   │  ← city picker
│                                     │
├─────────────────────────────────────┤
│  [Áp dụng (15 giải)]                │  ← sticky CTA — count preview
└─────────────────────────────────────┘
```

**Behavior:**
- Real-time preview count: mỗi filter change → fire `GET /pub/race?...&pageSize=1` để lấy `totalCount` only, display "{N} giải"
- Apply → close sheet, parent list re-fetch với filters
- Reset → clear all filters + close

**Components:** Bottom Sheet, Radio Group, Checkbox Group, Date Picker (native), Combobox (city picker — dropdown với search), Counter Badge

---

## 🛠️ Cross-screen Technical Mandates EPIC-2

### Caching strategy
- Race list: SWR pattern — show cached + fetch fresh background
- TTL: 30 min in-memory + AsyncStorage backup
- Cache key: `races:${JSON.stringify(filters)}`
- Invalidate: pull-to-refresh manual

### Image optimization
- Use `expo-image` (faster + native cache hơn `Image` RN built-in)
- Placeholder: BlurHash từ backend (nếu có) hoặc gray block
- Quality: hero image 80%, thumbnail 60%

### State management
- `useBrowseFilterStore` (Zustand) cho filter state + recent searches
- Persist với `zustand/middleware/persist` + AsyncStorage adapter
- KHÔNG persist race data (luôn fetch fresh / SWR)

### Map
- Library: `react-native-maps`
- Marker: race location pin
- Fallback: nếu map không init được (vd: Google Maps not configured) → render static image từ Mapbox Static API hoặc OpenStreetMap tile preview

### Share intent
- `expo-sharing` với message: `"Tham gia {race.title} cùng tôi! {universalLink}"`
- Universal link: `https://5bib.com/events/{slug}` (deep link return về app)

---

## 🧪 Test Cases TC-BROWSE-XX

### TC-BROWSE-01: List races happy path
| Element | Value |
|---------|-------|
| Method | GET |
| URL | `/pub/race?pageNo=1&pageSize=10&status=OPEN_FOR_SALE&sortField=start_date&sortDirection=ASC` |
| Headers | None |
| Expected status | 200 |
| Expected body shape | `{ items: Race[10], pagination: { currentPage: 1, totalPages: N, pageSize: 10 } }` (clean SDK shape) |
| MUST NOT leak | Internal field `created_by`, `last_modified_by`, `merchant_id` |

### TC-BROWSE-02: List với filter rỗng kết quả
| URL | `/pub/race?title=xyz_nonsense_123&pageSize=10` |
| Expected | `{ items: [], pagination: { currentPage: 1, totalPages: 0, pageSize: 10 } }` |
| UI | Empty state "Không có giải khớp filter" + CTA xoá bộ lọc |

### TC-BROWSE-03: Race detail by slug
| Method | GET |
| URL | `/pub/by-slug?slug=saigon-marathon-2026&is_detail=true` |
| Expected status | 200 |
| Expected body | `Race` clean shape với `courses[]`, `schedule[]` populated |
| Side effect | None (read-only, no cache write here — frontend handle) |

### TC-BROWSE-04: Race detail slug không tồn tại
| URL | `/pub/by-slug?slug=non-existent` |
| Expected status | 404 |
| UI | Screen empty state "Không tìm thấy giải" + back button |

### TC-BROWSE-05: Course detail happy path
| Method | GET |
| URL | `/pub/race-course-by-id?race_course_id=X` |
| Expected | `CourseDetail` clean shape |

### TC-BROWSE-06: Course list của race
| URL | `/pub/races/course/{raceId}` |
| Expected | `{ items: Course[], pagination: {...} }` |

### TC-BROWSE-07: Pagination boundary
| URL | `/pub/race?pageNo=999&pageSize=10` |
| Expected | `{ items: [], pagination: { currentPage: 999, totalPages: N, pageSize: 10 } }` |
| UI | "Đã hiển thị tất cả {N} giải" footer |

### TC-BROWSE-08: Search debounce
| Behavior | User type "saig" → 100ms → "saigo" → 200ms → "saigon" |
| Expected | Chỉ 1 API call fire sau 300ms từ "saigon" |
| UI | Loading inline trong search bar |

### TC-BROWSE-09: Offline mode
| Setup | Airplane mode, cached races có sẵn |
| Expected | Show cached list, banner top "Đang offline", search/filter disabled |

### TC-BROWSE-10: Anonymous tap "Đăng ký"
| Setup | Logged out, on event detail, tap CTA |
| Expected | Modal "Cần đăng nhập" → tap "Đăng nhập" → navigate Login → after login → pop về event detail (deep link state preserved) |

---

## ⚡ Performance SLA

| Metric | Target |
|--------|--------|
| Home tab cold render | < 1s (cached data first) |
| Home tab fresh fetch | < 2s p95 |
| Race detail render | < 1s (cache) / < 2.5s (fresh) |
| Search debounced response | < 600ms p95 (300ms debounce + 300ms API) |
| Filter apply re-fetch | < 1.5s p95 |
| Image load (hero) | < 3s p95 trên 4G |
| Infinite scroll trigger | KHÔNG block scroll, prefetch tại 80% list |

---

## 🛑 PAUSE Conditions (BA flag cho /5bib-plan)

- [ ] **PAUSE-EPIC2-01:** Challenges có endpoint riêng `/pub/challenges`? Hay filter `?race_type=CHALLENGE`? Backend confirm.
- [ ] **PAUSE-EPIC2-02:** Popular search keywords — backend có endpoint `/pub/race/popular-keywords` không, hay frontend hardcode MVP?
- [ ] **PAUSE-EPIC2-03:** Race detail field `schedule[]`, `racekit_images[]` — verify backend response có hay không. Nếu KHÔNG → BA ẩn 2 section đó MVP, defer Phase 2.
- [ ] **PAUSE-EPIC2-04:** Coordinates (lat/lng) cho race — backend có lưu không? Nếu không → ẩn map section, defer Phase 2 (cần BTC nhập tọa độ).
- [ ] **PAUSE-EPIC2-05:** Bookmark/favorite race — defer Phase 2 (cần backend endpoint `POST /users/me/favorites`).

---

## ✅ Status

- [x] DRAFT
- [x] READY (Wave 2 part 1)

## 🔗 Next

Claude Design consume file này → generate 9 screen TSX cho Browsing flow. BA tiếp viết EPIC-5, EPIC-3, EPIC-4.
