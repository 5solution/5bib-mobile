# FEATURE-003: EPIC-5 — Result (REDUCED SCOPE)

**Status:** 🔵 READY (Wave 2 — rev2 after Danny clarify 2026-05-25)
**Author:** 5bib-po-ba
**Wave:** 2 of 4
**Linked:** [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md)
**Audience:** Claude Design + Coder

---

## 📌 Pre-flight check

- [x] Wave 1 đã APPROVED rev2
- [x] Memory đã đọc (đã update note `result.5bib.com` separate system 2026-05-25)
- [x] Spot-check `src/services/athlete/index.ts` cho `/athlete/result` endpoint

---

## 🚨 SCOPE REDUCTION 2026-05-25 (Danny directive)

> **Danny clarify:** Endpoint `/rr/find` thuộc **RaceResult backend riêng** (phục vụ `result.5bib.com` standalone site). KHÔNG cần mobile re-implement leaderboard + personal result + certificate share native. Mobile **redirect ra `result.5bib.com`** cho UX nhất quán với web pattern.
>
> **Trước (rev1):** 5 screens (Search, Leaderboard, Personal Result, Certificate Share, My History) — full native implementation với `/rr/find`
> **Sau (rev2):** **2 screens** — 1 Redirect Hub + 1 My History (own user, dùng `/athlete/result` ở `api.5bib.com` core).

**Saving effort:** ~80% reduction trong EPIC-5. Coder save ~3-4 ngày + designer save tương ứng.

---

## 🎯 EPIC-5 Goal (revised)

Cung cấp **lối vào nhanh** đến tính năng kết quả ở `result.5bib.com` + cho phép user xem **lịch sử race của chính mình** trong app.

## 📦 Scope EPIC-5 (REDUCED)

| Screen ID | Screen Name | Route | Auth | Status |
|-----------|------------|-------|------|--------|
| S-RESULT-01 | Result Hub (redirect ra `result.5bib.com`) | `/result` | Optional | NEW (rev2) |
| S-RESULT-05 | My Race Results History (own user) | `/(tabs)/profile/race-history` | **Required** | KEPT (rev2) |

**REMOVED (rev2):**
- ❌ S-RESULT-02 Event Leaderboard — dùng `result.5bib.com/event/[id]` thay vì native
- ❌ S-RESULT-03 Personal Result by BIB — dùng `result.5bib.com/event/[id]/bib/[bib]` thay vì native
- ❌ S-RESULT-04 Certificate Share Modal — handled bởi `result.5bib.com` (đã có share/download built-in)

---

## 👤 User Stories

- **US-RESULT-01:** As an **Athlete**, I want to **tra kết quả nhanh từ app** so that không phải mở browser thủ công.
- **US-RESULT-02:** As an **Athlete**, I want to **xem lịch sử race của mình** so that track thành tích cá nhân.
- **US-RESULT-03:** As an **Anonymous Visitor**, I want to **mở result page nhanh từ app** so that share với bạn bè.

---

## 📜 Business Rules (BR-RESULT-XX revised)

| ID | Business Rule |
|----|--------------|
| BR-RESULT-01 | Result Hub screen show CTA "Tra kết quả ngay" → mở `result.5bib.com` qua **WebView in-app** (default) HOẶC external browser (option). |
| BR-RESULT-02 | WebView mở fullscreen với close button. URL whitelist: chỉ `result.5bib.com` + subdomain. |
| BR-RESULT-03 | Pre-fill query nếu user đang xem race: `result.5bib.com/event/[raceId]` direct landing trong WebView. |
| BR-RESULT-04 | My Race History dùng endpoint `/athlete/result` (auth, own user) ở `api.5bib.com` core — KHÔNG dùng `/rr/find`. |
| BR-RESULT-05 | Mỗi entry trong My History có button "Xem chi tiết" → mở `result.5bib.com/event/[raceId]/bib/[bib]` trong WebView. |
| BR-RESULT-06 | KHÔNG cache result data trong app — luôn fresh từ WebView. |
| BR-RESULT-07 | Offline: My History show cached entries (BR-GLOBAL-02). Result Hub show "Cần kết nối mạng để xem kết quả". |

---

## 🖥️ Per-Screen Spec

### S-RESULT-01: Result Hub (Redirect)

**Route:** `/result` — accessed từ:
- Home tab → action button "Tra kết quả"
- Bottom nav → result icon (nếu có)
- Deep link `bib5://result` or `bib5://result?raceId=X&bib=Y`
- Race detail (status `FINISHED`) → "Xem kết quả" button

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ← Tra cứu kết quả                   │
├─────────────────────────────────────┤
│                                     │
│       [Trophy illustration]         │
│                                     │
│   Tra cứu kết quả giải đấu          │  ← heading.h2
│                                     │
│   Xem bảng xếp hạng, tải             │  ← body.md
│   certificate và chia sẻ kết quả    │
│   tại result.5bib.com               │
│                                     │
│   [Mở trang kết quả →]              │  ← primary lg full
│                                     │
│   [Mở trong trình duyệt khác]       │  ← ghost md
│                                     │
│   ── Hoặc xem nhanh ─────────────── │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 🔍 Nhập BIB hoặc chọn giải  │   │  ← shortcut input
│   └─────────────────────────────┘   │
│                                     │
│   [Tra cứu nhanh →]                 │  ← deep link result.5bib.com với query
│                                     │
└─────────────────────────────────────┘
```

**All States:**

| State | Spec |
|-------|------|
| Initial | Static content, 2 CTA buttons enabled |
| Offline | Banner top "Cần kết nối mạng để xem kết quả" + CTAs disabled |
| Quick search empty | Helper text "Nhập BIB number hoặc tên giải" |
| Quick search typing | Button enabled |
| Loading WebView | Brief progress bar trên top khi mở WebView |

**Components:** Header back, Illustration (trophy SVG — Lucide hoặc custom), Heading + Description, Primary CTA, Ghost CTA, Search Input shortcut, Banner (offline)

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Tap "Mở trang kết quả →" | Navigate `/result/webview` với URL `https://result.5bib.com` |
| 2 | Tap "Mở trong trình duyệt khác" | `Linking.openURL('https://result.5bib.com')` (external Safari/Chrome) |
| 3 | Type BIB/race → tap "Tra cứu nhanh" | Mở WebView với URL `https://result.5bib.com?q={query}` (backend handle query parse) |
| 4 | Tap back ← | Pop screen |

**Data:** static. No API call ở screen này.

---

### S-RESULT-01b: WebView Wrapper

**Route:** `/result/webview?url=X`

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ✕   result.5bib.com         [⤴ 🔄]│  ← close + share + refresh
├─────────────────────────────────────┤
│ ▓▓▓▓░░░░░░░░░░░░ (loading bar)      │
├─────────────────────────────────────┤
│                                     │
│       [WebView full content]        │
│       (result.5bib.com page)        │
│                                     │
└─────────────────────────────────────┘
```

**Behavior:**

1. Mount with URL từ query param
2. URL whitelist enforce: chỉ `*.5bib.com` được navigate trong WebView. External link tap → confirm dialog "Mở liên kết ngoài?" → `Linking.openURL()`
3. Loading bar progress 0→100% top
4. Back button on Android: WebView goBack nếu có history; else close screen
5. Tap ✕: close screen
6. Tap ⤴ share: share current URL (native share intent)
7. Tap 🔄 refresh: WebView reload

**Components:** Header (close + URL display + actions), Loading Progress Bar, WebView Container

**States:**
- Loading initial: progress bar + skeleton placeholder
- Loaded: full WebView visible
- Network error: full screen error + "Thử lại" + "Đóng"
- External link tap: confirm dialog modal

**Implementation note:** `react-native-webview` với `onShouldStartLoadWithRequest` để intercept URL navigation.

---

### S-RESULT-05: My Race Results History (KEEP)

**Route:** `/(tabs)/profile/race-history` (sub of Profile tab, auth required)

**Wireframe:** (same as rev1)
```
┌─────────────────────────────────────┐
│ ← Lịch sử thi đấu                   │
├─────────────────────────────────────┤
│ Tổng: 12 race · 156 km              │  ← summary stats (computed client)
├─────────────────────────────────────┤
│ ── 2026 ─────────────────────────── │  ← grouped by year DESC
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🥇 Saigon Marathon              │ │
│ │ 15/03/2026 · 5km · 23:45         │ │
│ │ Rank: #15 / 250                  │ │
│ │ [Xem chi tiết →]                 │ │  ← navigate result.5bib.com WebView
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ... entries                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ── 2025 ─────────────────────────── │
│ ...                                 │
└─────────────────────────────────────┘
```

**Actions:**

| # | User action | UI behavior |
|---|-------------|-------------|
| 1 | Tap entry "Xem chi tiết →" | Open WebView với URL `https://result.5bib.com/event/{raceId}/bib/{bib}` |
| 2 | Pull-to-refresh | Re-fetch `/athlete/result` page 1 |
| 3 | Scroll bottom | Load next page (pagination) |

**Data binding:**
- `GET /athlete/result?sortDirection=DESC&pageNo=X&pageSize=10` (auth Bearer)
- Group by year client-side from `raceDate`
- Compute summary: count + sum distance (client-side, đơn giản)

**Endpoint (KHÔNG đổi rev2):**

| Element | Spec |
|---------|------|
| Method | GET |
| Path | `/athlete/result` |
| Auth | Bearer Required |
| Backend legacy | `?pageNo=N&pageSize=M&sortDirection=DESC` |
| Response (clean SDK) | `MyResultsResponse` (normalized) |
| Status | 200 / 401 / 500 |
| Cache | SQLite cached (BR-GLOBAL-02) for offline |

```typescript
interface MyResultsInput {
  pageNo?: number;       // default 1
  pageSize?: number;     // default 10
  sortDirection?: 'ASC' | 'DESC';
}

interface MyResultsResponse {
  items: Array<{
    raceId: string;
    raceName: string;
    courseId: string;
    courseName: string;
    distance: string;            // "5km"
    distanceMeters: number;
    raceDate: string;            // ISO
    bib: string;
    finishTime: string;          // "HH:MM:SS"
    overallRank: number;
    medal?: 'gold' | 'silver' | 'bronze' | null;
  }>;
  pagination: {...};
}
```

---

## 🧪 Test Cases TC-RESULT-XX (REDUCED)

### TC-RESULT-01: Result Hub → WebView open
| User tap "Mở trang kết quả" |
| Expected: Navigate WebView screen, URL = `https://result.5bib.com` loaded |

### TC-RESULT-02: WebView whitelist enforce
| WebView inside, tap link to `https://malicious.com` |
| Expected: confirm dialog "Mở liên kết ngoài?" → if confirm → external browser; if cancel → stay in WebView |

### TC-RESULT-03: My History happy path (auth)
| GET `/athlete/result?sortDirection=DESC&pageNo=1&pageSize=10` Bearer |
| 200 + paginated entries clean shape |
| MUST NOT leak: internal `_id`, raw bib code |

### TC-RESULT-04: My History without auth
| 401 |

### TC-RESULT-05: My History pagination
| pageNo=2 | items page 2 returned |

### TC-RESULT-06: My History entry → WebView detail
| Tap entry "Xem chi tiết →" | Open WebView URL `https://result.5bib.com/event/{raceId}/bib/{bib}` |

### TC-RESULT-07: My History offline
| Airplane mode, prior cache available | Show cached entries + banner top "Offline" |

### TC-RESULT-08: Deep link to Result Hub
| External tap `bib5://result?raceId=X&bib=Y` | App open → navigate result hub → quick search pre-filled |

---

## ⚡ Performance SLA (revised)

| Metric | Target |
|--------|--------|
| Result Hub render | < 500ms (static) |
| WebView initial load `result.5bib.com` | < 3s p95 (depends external site) |
| My History fetch | < 1.5s p95 |
| Deep link cold start to WebView | < 4s end-to-end |

---

## 🛑 PAUSE Conditions (revised)

- [x] ~~PAUSE-EPIC5-01 pagination index~~ → N/A (KHÔNG dùng `/rr/find` nữa)
- [x] ~~PAUSE-EPIC5-02 categories shape~~ → N/A
- [x] ~~PAUSE-EPIC5-03 unpublished behavior~~ → N/A (handled by result.5bib.com)
- [x] ~~PAUSE-EPIC5-04 image variants~~ → N/A (handled by result.5bib.com)
- [x] ~~PAUSE-EPIC5-05 splits structure~~ → N/A
- [x] **PAUSE-EPIC5-01 (NEW):** ✅ **RESOLVED Danny 2026-05-25** — `result.5bib.com` SUPPORT cả 3 URL pattern:
  - Event leaderboard: `result.5bib.com/event/{raceId}` ✅
  - Personal: `result.5bib.com/event/{raceId}/bib/{bib}` ✅
  - Query search: `result.5bib.com?q={query}` ✅
- [ ] **PAUSE-EPIC5-02 (DEFER to test-time):** Danny "đéo biết" universal link support. **Acceptable degrade**: nếu KHÔNG có universal link → user tap link trong WebView/external browser sẽ stay trong browser, KHÔNG deep-link back về app. UX không đẹp nhưng không block functionality. Coder test khi build EPIC-5 — nếu universal link work → enhance UX; nếu không → keep as-is.

## ✅ Status

- [x] DRAFT
- [x] READY (Wave 2 rev2 — REDUCED scope per Danny 2026-05-25)

---

## 📊 Scope reduction summary

| Metric | Rev1 (full native) | Rev2 (redirect) | Saving |
|--------|--------|--------|--------|
| Screens | 5 | 2 | -60% |
| Endpoints used | 7 (`/rr/find`, `/athlete/result`, `/athlete/bib-image`, `/athlete/story-image`, `/pub/athlete-result`, `/pub/pdf-2-image`, `/rr/category-drop-down`) | 1 (`/athlete/result`) | -86% |
| BR | 10 | 7 | -30% |
| TC | 11 | 8 | -27% |
| Coder effort estimate | ~5 days | ~1.5 days | -70% |
| Design effort | ~3 days | ~0.5 day | -83% |
