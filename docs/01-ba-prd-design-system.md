# FEATURE-003: PRD Design System — Mobile App 5BIB

**Status:** 🔵 DRAFT
**Author:** 5bib-po-ba
**Wave:** 1 of 4
**Linked:** [overview](01-ba-prd-overview.md), [init](00-manager-init.md)
**Audience:** **Claude Design** (AI generate TSX components) + Coder. Đây là **single source of truth** cho design tokens + component patterns. Mọi screen spec trong các EPIC reference về đây.

---

## 🎨 Design Tokens

### Color Palette

> Lấy từ web Tailwind config + brand guideline 5BIB. Nếu Danny cấp brand book chi tiết hơn → override các token dưới đây trong Tamagui theme config.

#### Brand colors
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `brand.primary` | `#0066FF` | 0, 102, 255 | Primary CTA, links, active state |
| `brand.primary.dark` | `#0052CC` | 0, 82, 204 | Pressed state of primary |
| `brand.primary.light` | `#E6F0FF` | 230, 240, 255 | Backgrounds tints, badges |
| `brand.secondary` | `#FF6B35` | 255, 107, 53 | Race day accent, urgent badges |
| `brand.accent` | `#FFB800` | 255, 184, 0 | Gold medal, achievement |

> ⚠️ **PAUSE-brand:** màu trên là PROPOSAL. Coder lấy chính xác từ `apps/web/tailwind.config.js` và logo 5BIB chính thức để override Tamagui theme. BA không có quyền truy cập brand book.

#### Semantic colors
| Token | Hex Light | Hex Dark (Phase 2) | Usage |
|-------|-----------|--------------------|---------|
| `semantic.success` | `#10B981` | `#34D399` | Toast success, paid status, check-in success |
| `semantic.warning` | `#F59E0B` | `#FBBF24` | Pending payment, cooldown |
| `semantic.error` | `#EF4444` | `#F87171` | Error toast, validation, cancel |
| `semantic.info` | `#3B82F6` | `#60A5FA` | Info banner, hint |

#### Neutral palette
| Token | Hex | Usage |
|-------|-----|-------|
| `neutral.50` | `#F9FAFB` | Background subtle |
| `neutral.100` | `#F3F4F6` | Background card |
| `neutral.200` | `#E5E7EB` | Border subtle, divider |
| `neutral.300` | `#D1D5DB` | Border default |
| `neutral.400` | `#9CA3AF` | Placeholder, disabled text |
| `neutral.500` | `#6B7280` | Secondary text |
| `neutral.600` | `#4B5563` | Helper text |
| `neutral.700` | `#374151` | Body text |
| `neutral.800` | `#1F2937` | Heading |
| `neutral.900` | `#111827` | Primary text, near-black |
| `neutral.white` | `#FFFFFF` | Card surface light |
| `neutral.black` | `#000000` | Reserved (avoid pure black on iOS) |

#### Surface colors
| Token | Hex | Usage |
|-------|-----|-------|
| `surface.background` | `#FFFFFF` | Screen background |
| `surface.card` | `#FFFFFF` | Card, modal, sheet |
| `surface.elevated` | `#FFFFFF` + shadow | Floating elements (FAB, dropdown) |
| `surface.overlay` | `rgba(0,0,0,0.5)` | Modal backdrop |

---

### Typography

#### Font family

| Platform | Body font | Heading font |
|----------|-----------|--------------|
| iOS | `SF Pro Text` (system) | `SF Pro Display` (system) |
| Android | `Roboto` (system) | `Roboto` (system) |

**KHÔNG dùng custom font** trong Phase 1 (giảm bundle size + tránh font loading flash). Phase 2 cân nhắc custom font cho branding.

#### Type scale

| Token | Size | Line height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `display.lg` | 32sp | 40sp | 700 Bold | Splash heading, big numbers |
| `display.md` | 28sp | 36sp | 700 Bold | Race title page |
| `heading.h1` | 24sp | 32sp | 700 Bold | Screen title |
| `heading.h2` | 20sp | 28sp | 600 SemiBold | Section title |
| `heading.h3` | 18sp | 26sp | 600 SemiBold | Card title |
| `heading.h4` | 16sp | 24sp | 600 SemiBold | Subsection |
| `body.lg` | 16sp | 24sp | 400 Regular | Body default |
| `body.md` | 14sp | 22sp | 400 Regular | Body secondary |
| `body.sm` | 12sp | 18sp | 400 Regular | Caption, helper text |
| `label.lg` | 16sp | 20sp | 600 SemiBold | Button label primary |
| `label.md` | 14sp | 18sp | 600 SemiBold | Button label secondary |
| `label.sm` | 12sp | 16sp | 600 SemiBold | Tag, badge |
| `mono.md` | 14sp | 20sp | 400 Regular | BIB number, code, OTP |

**iOS Dynamic Type:** Body scales với user preference. Heading clamp tối đa +20%.

#### Text colors

| Use | Color token |
|-----|-------------|
| Primary | `neutral.900` |
| Secondary | `neutral.600` |
| Disabled | `neutral.400` |
| Link | `brand.primary` |
| Error | `semantic.error` |
| On primary BG (white text) | `neutral.white` |

---

### Spacing scale

> 4pt grid. Mọi padding/margin/gap PHẢI dùng token này, KHÔNG hardcode random number.

| Token | Value |
|-------|-------|
| `space.0` | 0 |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.7` | 32 |
| `space.8` | 40 |
| `space.9` | 48 |
| `space.10` | 64 |

**Common patterns:**
- Screen horizontal padding: `space.4` (16)
- Card padding: `space.4` (16)
- Section gap: `space.6` (24)
- Item gap in list: `space.3` (12)
- Form field gap: `space.4` (16)
- Bottom tab safe area extra: `space.5` (20)

---

### Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.none` | 0 | Hard edge |
| `radius.sm` | 4 | Tag, chip |
| `radius.md` | 8 | Input, small card |
| `radius.lg` | 12 | Card, button default |
| `radius.xl` | 16 | Modal, large card |
| `radius.2xl` | 24 | Bottom sheet handle area |
| `radius.full` | 9999 | Pill button, avatar, badge |

---

### Elevation / Shadow

| Token | Spec | Usage |
|-------|------|-------|
| `elevation.0` | none | Flat |
| `elevation.1` | `shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {0,2}, elevation: 2` | Card subtle |
| `elevation.2` | `shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: {0,4}, elevation: 4` | Floating button, dropdown |
| `elevation.3` | `shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: {0,8}, elevation: 8` | Modal, bottom sheet |
| `elevation.4` | `shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: {0,12}, elevation: 12` | Picker, native dropdown |

**iOS:** shadowColor `#000000`, shadowOpacity per token.
**Android:** elevation per token (Material).

---

### Iconography

**Icon set:** [Lucide Icons](https://lucide.dev) (open source, comprehensive, RN package `lucide-react-native`).

**Sizes:**
| Token | Size | Usage |
|-------|------|-------|
| `icon.xs` | 12 | Inline với text small |
| `icon.sm` | 16 | Inline với body |
| `icon.md` | 20 | Default UI icon |
| `icon.lg` | 24 | Button icon, tab icon |
| `icon.xl` | 32 | Hero icon, empty state |
| `icon.2xl` | 48 | Splash, illustration accent |

**Color rule:** icon mặc định `neutral.600`. Active state `brand.primary`. Disabled `neutral.400`. Semantic icon (success/error/warning/info) lấy color tương ứng.

**5BIB-specific icons cần custom (designer vẽ):**
- BIB number tag icon
- Race medal icon (gold/silver/bronze)
- Finish line icon
- Stopwatch icon
- E-waiver pen icon

---

## 🧩 Component Patterns

> Claude Design consume list này để generate component library (TSX). Mỗi component có spec đủ states để generated output bao phủ tất cả case.

### 1. Button

**Variants:**
- `primary` — solid `brand.primary` background, white text
- `secondary` — solid `neutral.100` background, `neutral.900` text
- `outline` — transparent + 1px border `neutral.300`, `neutral.900` text
- `ghost` — transparent, `brand.primary` text
- `destructive` — solid `semantic.error` background, white text

**Sizes:**
| Size | Height | Padding H | Font | Icon |
|------|--------|-----------|------|------|
| `sm` | 32 | 12 | `label.sm` | `icon.sm` |
| `md` | 40 | 16 | `label.md` | `icon.md` |
| `lg` | 48 | 20 | `label.lg` | `icon.md` |
| `xl` | 56 | 24 | `label.lg` | `icon.lg` |

**States:** Default / Pressed (10% opacity overlay) / Disabled (50% opacity + neutral.300 text) / Loading (spinner + label "Đang xử lý..." hoặc giữ label + small spinner)

**Layout:**
- Icon-only: padding equal H/V
- Icon + label: `icon | space.2 | label`
- Full width vs auto width (prop)

---

### 2. Input (Text field)

**Anatomy:**
```
┌─────────────────────────────────────────┐
│ Label *                                  │  ← label.md weight semi
├─────────────────────────────────────────┤
│ [icon] Placeholder text         [clear] │  ← body.lg, height 48
├─────────────────────────────────────────┤
│ Helper text or error message            │  ← body.sm
└─────────────────────────────────────────┘
```

**States:**
- `default` — border `neutral.300`, BG `surface.background`
- `focused` — border `brand.primary` 2px, BG `surface.background`
- `filled` — same as default with value
- `error` — border `semantic.error`, helper text → error message in red
- `disabled` — BG `neutral.100`, text `neutral.400`, border `neutral.200`
- `read-only` — BG `neutral.50`, no border, no caret

**Variants:**
- `text` — default
- `password` — toggle eye icon to reveal
- `email` — keyboardType email
- `phone` — keyboardType phone, prefix `+84`
- `number` — keyboardType numeric
- `otp` — 6 segmented boxes (xem OTP Input component riêng)
- `search` — leading icon search, trailing clear, no label
- `textarea` — multiline, min height 80, max height 200, char counter

**Affixes:**
- Leading icon (vd: 🔒 cho password)
- Trailing icon (vd: 👁 cho show password, ✕ cho clear)
- Suffix text (vd: "VNĐ" cho currency input)

---

### 3. OTP Input (6 digit)

```
┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐
│ 1│ │ 2│ │ 3│ │ 4│ │ 5│ │ 6│
└──┘ └──┘ └──┘ └──┘ └──┘ └──┘
  ↑ focused (border brand.primary 2px)
```

- Each box: 48×56, radius `radius.md`, font `display.md`
- Auto-advance focus when type
- Auto-fill iOS (SMS code suggestion)
- Auto-fill Android (SMS Retriever API or autocomplete)
- States: empty / filled / focused / error (all boxes red) / success (all boxes green flash before submit)

---

### 4. Card

**Anatomy:**
```
┌─────────────────────────────────────┐
│ [optional cover image]              │
├─────────────────────────────────────┤
│ Title (heading.h3)                  │
│ Subtitle / meta (body.sm)           │
│ Body content...                     │
├─────────────────────────────────────┤
│ [action buttons or chevron]         │
└─────────────────────────────────────┘
```

- BG: `surface.card`
- Border: `1px solid neutral.200` HOẶC `elevation.1` (chọn 1 pattern toàn app — BA recommend elevation cho clean)
- Radius: `radius.lg` (12)
- Padding: `space.4` (16)
- Tappable card: add pressed state với `neutral.50` overlay

**Variants:**
- `default` — standard
- `race` — có cover image, title, distance + date meta, status badge
- `ticket` — có BIB number prominent, race name, date, QR thumbnail
- `order` — order ID, status badge, total, date
- `result` — finish time prominent, pace, rank

---

### 5. Badge

| Variant | Color BG | Color text |
|---------|----------|-----------|
| `default` | `neutral.100` | `neutral.700` |
| `success` | `semantic.success` + 10% alpha | `semantic.success` |
| `warning` | `semantic.warning` + 10% alpha | `semantic.warning` |
| `error` | `semantic.error` + 10% alpha | `semantic.error` |
| `info` | `semantic.info` + 10% alpha | `semantic.info` |
| `brand` | `brand.primary` + 10% alpha | `brand.primary` |

- Height: 24
- Padding H: 8
- Radius: `radius.full`
- Font: `label.sm`

---

### 6. Bottom Sheet

Pattern thay thế modal trên mobile (more native):

```
┌─────────────────────────────────────┐
│             ━━━━ (drag handle)      │
│                                     │
│  Title (heading.h2)                 │
│  ─────────────────────────────────  │
│                                     │
│  Content...                          │
│                                     │
│                                     │
│  [Primary CTA full width]            │
└─────────────────────────────────────┘
```

- Drag handle: 40×4 rounded `neutral.300` at top, padded `space.3` from top
- BG: `surface.card`
- Radius top: `radius.2xl` (24), bottom 0
- Backdrop: `surface.overlay`
- Height: auto content, max 90% screen
- Dismiss: swipe down, tap backdrop, tap close icon
- Snap points: `[40%, 90%]` cho list dài, hoặc fixed cho form

**Use cases:** Filter race list, choose payment method, share options, select course

---

### 7. Modal (only when full-screen needed)

```
┌─────────────────────────────────────┐
│ ← Title                       [✕]   │
├─────────────────────────────────────┤
│                                     │
│  Content...                          │
│                                     │
│  [CTA]                               │
└─────────────────────────────────────┘
```

- Full screen takeover
- Close icon top-right or back arrow top-left (one or the other, not both)
- Use cases: WebView payment, signature canvas, QR scan camera

---

### 8. Toast / Snackbar

```
┌─────────────────────────────────────┐
│ ✓ Đăng nhập thành công              │  ← floating bottom
└─────────────────────────────────────┘
```

- Position: bottom, above bottom tab if visible, padding `space.4` from edge
- Width: screen width - `space.4 * 2`, max 480 on large devices
- BG: `surface.elevated` light theme; `neutral.800` dark theme (Phase 2)
- Border: `1px solid neutral.200` light; none dark
- Padding: `space.3` V, `space.4` H
- Radius: `radius.lg`
- Elevation: `elevation.2`
- Auto-dismiss: 3s default, 5s for error
- Manual dismiss: swipe down or tap X (optional)
- Stack: max 1 visible, queue if multiple

**Variants:** success (✓ green icon), error (✕ red), warning (⚠ amber), info (ⓘ blue), neutral

---

### 9. Empty State

```
┌─────────────────────────────────────┐
│                                     │
│         [Illustration / Icon]       │
│                                     │
│        Title (heading.h3)           │
│        Description (body.md center) │
│                                     │
│        [Primary CTA]                │
│                                     │
└─────────────────────────────────────┘
```

- Vertical center in container
- Icon `icon.2xl` HOẶC small illustration (custom drawing — designer)
- Title + description text center align
- Optional CTA below
- Color icon: `neutral.400`

**Common empty states:**
- "Bạn chưa có vé nào" + CTA "Tìm giải đấu" (My Tickets empty)
- "Không tìm thấy giải nào" + CTA "Xoá bộ lọc" (Filter empty)
- "Chưa có kết quả" + (no CTA — wait) (Result not yet published)
- "Không có kết nối mạng" + CTA "Thử lại" (Offline)

---

### 10. Loading State

**Variants:**
1. **Skeleton** — preferred cho list/grid
   - Shape: same as final content silhouette
   - Animation: shimmer left-to-right, 1.5s loop
   - Color: `neutral.100` base, `neutral.200` highlight
2. **Spinner** — for action buttons, small inline
   - Size: `icon.md` default, configurable
   - Color: match text color of context
3. **Full screen** — only for initial app load
   - Centered spinner + small loading text "Đang tải..."
4. **Pull-to-refresh** — native `RefreshControl`
   - Tint color: `brand.primary`

**Rule:** Loading state phải render trong 100ms sau trigger (BR-GLOBAL-09).

---

### 11. Error State

**Inline error (form field):**
- Error message below field, `body.sm`, color `semantic.error`
- Field border `semantic.error`
- Icon ⚠ optional inline với message

**Full screen error:**
```
┌─────────────────────────────────────┐
│                                     │
│         [Error illustration]        │
│                                     │
│  Có lỗi xảy ra (heading.h3)         │
│  [Description what happened]        │
│                                     │
│  [Thử lại] [Về trang chủ]           │
│                                     │
└─────────────────────────────────────┘
```

**Banner error:** persistent banner top of screen, color `semantic.error` 10% alpha, icon ⚠, dismissable

---

### 12. Tab Bar (Bottom Navigation)

```
┌─────────────────────────────────────┐
│                                     │
│         Content                     │
│                                     │
├─────────────────────────────────────┤
│  [Home] [Tickets] [Orders] [Profile]│  ← height 56 + safe area
└─────────────────────────────────────┘
```

- Height: 56 + bottom safe area
- BG: `surface.card`
- Top border: `1px solid neutral.200`
- 4 tabs (KHÔNG 5+ — too crowded mobile):
  1. **Home** (🏠 house icon) — race feed, search
  2. **Tickets** (🎫 ticket icon) — my BIB
  3. **Orders** (📋 list icon) — my orders + history
  4. **Profile** (👤 user icon) — profile, settings, logout
- Active state: icon + label `brand.primary`, top accent line 2px brand
- Inactive: icon + label `neutral.500`
- Badge support: small dot on icon for new notifications

---

### 13. Header (Stack screen)

```
┌─────────────────────────────────────┐
│ [←]  Screen Title         [⋯] [🔔] │  ← height 56 + status bar
└─────────────────────────────────────┘
```

- Height: 56 + status bar safe area
- BG: `surface.background`
- Bottom border: `1px solid neutral.200` HOẶC none + elevation `0.5` on scroll (BA recommend none + elevation on scroll for modern feel)
- Title: center align mặc định (iOS style)
- Leading: back arrow (← icon `icon.lg`) hoặc close ✕
- Trailing: 0-2 icon actions, ưu tiên menu (⋯) cho overflow actions

**Variants:**
- `default` — title only
- `with-subtitle` — title + small subtitle below
- `with-search` — title morphs into search input on focus
- `large-title` — iOS-style large title that collapses on scroll (heading.h1 → body.lg)
- `transparent` — overlay on hero image (race detail page)

---

### 14. List Item (row)

```
┌─────────────────────────────────────┐
│ [icon/avatar]  Title       [chev]   │  ← single line, 56 height
│                Subtitle              │  ← double line, 72 height
└─────────────────────────────────────┘
```

- Padding H: `space.4`, V: `space.3`
- Min height: 56 single line, 72 double line, 88 triple line
- Leading: 40×40 icon/avatar with `space.3` margin right
- Trailing: chevron icon for navigation, switch/checkbox for setting, badge for status
- Divider: `1px solid neutral.100` between items (optional in cards)

---

### 15. Form Layout

```
┌─────────────────────────────────────┐
│ Section Title (heading.h3)          │
│                                     │
│ [Input field 1]                     │
│                                     │
│ [Input field 2]                     │
│                                     │
│ [Input field 3]                     │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ [Primary CTA full width]            │
│ [Secondary CTA full width]          │
└─────────────────────────────────────┘
```

- Vertical gap between fields: `space.4`
- Section gap: `space.6`
- CTA fixed bottom for short forms, in-flow bottom for long forms
- Keyboard avoiding view: `KeyboardAvoidingView` iOS, `windowSoftInputMode` Android
- Scroll on small screens: `KeyboardAwareScrollView` to keep focused field visible

---

### 16. QR Display Card (CRITICAL — ticket show)

```
┌─────────────────────────────────────┐
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │       [QR CODE 240×240]     │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   BIB: A1234 (mono.md large)        │
│   Race name (heading.h2)            │
│   Course distance · Date            │
│                                     │
│   [● Trực tuyến] / [● Ngoại tuyến] │  ← online/offline indicator
│                                     │
└─────────────────────────────────────┘
```

- Center QR, padding `space.6` all sides
- QR size: 240×240 (large enough for scanner to read from arm distance)
- Brightness boost: when QR card visible, force screen brightness to 100% (`expo-brightness`)
- Screen always on: prevent screen lock (`expo-keep-awake`)
- Background must be `surface.card` (white) for max QR contrast
- Offline indicator: subtle dot + text bottom of card

---

### 17. Payment Method Picker (Bottom Sheet)

```
┌─────────────────────────────────────┐
│             ━━━━                    │
│  Chọn phương thức thanh toán        │
│  ─────────────────────────────────  │
│  ◯ [VNPay logo]  VNPay              │
│  ◯ [PayX logo]   PayX               │
│  ◯ [Payoo logo]  Payoo              │
│  ◯ [OnePay logo] OnePay             │
│                                     │
│  [Tiếp tục]                          │
└─────────────────────────────────────┘
```

- List item with radio + payment gateway logo + name
- Logos cần designer chuẩn bị 4 SVG cho 4 gateway
- Selected state: highlight `brand.primary.light` background, radio filled
- Primary CTA disabled until 1 method selected

---

### 18. Camera View (QR Scan)

```
┌─────────────────────────────────────┐
│ [✕]                                 │  ← close, top left
├─────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░╔══════════════════════════╗░░░  │  ← scan box overlay
│ ░░░║                          ║░░░  │     (transparent inside)
│ ░░░║   Camera preview          ║░░░  │
│ ░░░║                          ║░░░  │
│ ░░░╚══════════════════════════╝░░░  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                     │
│  Đưa mã QR vào khung               │  ← instruction
│                                     │
│              [⚡ flash]              │  ← torch toggle
└─────────────────────────────────────┘
```

- Full screen camera
- Overlay: black 60% alpha outside scan box
- Scan box: 280×280 transparent with corner brackets `brand.primary`
- Animated scan line moving up/down inside box (subtle)
- Top-left close button (X icon)
- Bottom torch toggle
- Instruction text bottom center
- Permission denied state: full screen với icon + message + "Mở cài đặt" CTA

---

### 19. Signature Pad (E-waiver)

```
┌─────────────────────────────────────┐
│ ← Ký xác nhận                       │
├─────────────────────────────────────┤
│ Vui lòng ký vào khung bên dưới       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │  ← signature canvas
│ │   (transparent BG, gray line)   │ │     ~300 height
│ │                                 │ │
│ │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │ │  ← signature line
│ └─────────────────────────────────┘ │
│                                     │
│  [Xoá] [Hoàn tác]                   │
│                                     │
│  [Xác nhận chữ ký]                  │
└─────────────────────────────────────┘
```

- Canvas full width, height 300
- Stroke color: `neutral.900`
- Stroke width: 2-3px (auto adjust pressure)
- Background: `neutral.50` for contrast
- Signature line: dashed `neutral.300` to guide
- Empty state: placeholder text "Ký tên ở đây"
- Filled state: hide placeholder when stroke detected
- Submit converts canvas to base64 PNG → upload via `@5bib/sdk/services/upload`

---

### 20. WebView (Payment gateway)

```
┌─────────────────────────────────────┐
│ ✕ Thanh toán          [● VNPay]    │  ← gateway badge
├─────────────────────────────────────┤
│                                     │
│       WebView content                │
│       (3rd party gateway page)      │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

- Full screen WebView
- Restricted navigation: chỉ whitelist domain gateway (vd: `vnpayment.vn`, `payx.vn`, …)
- Loading bar at top (thin line, `brand.primary`)
- Deep link return: catch `bib5://payment-return?orderId=...&status=...` → close WebView + navigate result screen
- Close confirm: nếu user tap ✕ mid-payment → dialog "Huỷ giao dịch?"
- Timeout: 10 min idle → auto close + show "Phiên thanh toán hết hạn"

---

## 🎯 Patterns guidance cho designer

### When to use Modal vs Bottom Sheet vs Toast

| Need | Use |
|------|-----|
| Full-screen takeover (signature, camera, WebView) | **Modal** full-screen |
| Quick action choice (payment method, share, filter) | **Bottom Sheet** snap to content |
| Confirmation destructive (delete, cancel) | **Alert dialog** (native) |
| Brief status feedback (success, error) | **Toast** auto-dismiss |
| Persistent warning (offline mode) | **Banner** top of screen |

### When to use Stack vs Tab navigation

| Need | Use |
|------|-----|
| Main app sections (Home, Tickets, Orders, Profile) | **Bottom Tab** |
| Deep navigation (Race → Course → Checkout) | **Stack** push |
| Mode switch (User vs Staff) | **Drawer** (defer Phase 2) hoặc Settings screen toggle |
| Multi-step form (Checkout 3 steps) | **Stack** with progress indicator HOẶC **Stepper** UI |

### Form field grouping
- Group related fields với section header (heading.h3)
- Optional fields: label suffix `(tuỳ chọn)`
- Required fields: red asterisk `*` after label
- Field with help: info icon ⓘ inline → tap to show tooltip/bottom sheet explanation

---

## 🌗 Dark mode roadmap (Phase 2)

Phase 1 chỉ light mode. Phase 2 (sau launch + feedback):
- Token system đã design-ready cho dark (semantic colors có dark variant)
- Surface mới: `surface.background.dark` `#000000`, `surface.card.dark` `#1C1C1E` (iOS native), `#121212` (Material)
- Text: invert neutral scale
- Border: `neutral.700` / `neutral.800` thay vì `200` / `300`
- Image asset: cần dark variant cho logo + illustration
- Auto follow system: `useColorScheme()` từ RN

---

## 📐 Layout grid

- Mobile portrait: single column
- Horizontal padding: `space.4` (16) screen edge
- Content max width: full bleed (KHÔNG có max-width restriction trên phone)
- Safe area: respect iOS notch + Android navigation bar dùng `react-native-safe-area-context`
- Tablet (defer Phase 2): single column nhưng max width 600, center alignment

---

## ✅ UI deliverables expected (Claude Design + Coder output)

**Claude Design** generate TSX components từ spec này:
1. **Foundation library:** Tamagui theme config với colors, typography, spacing, shadow tokens (file `apps/mobile/src/theme/tokens.ts`)
2. **Components library:** 20 components ở trên với tất cả states (variants × states matrix) — TSX files trong `apps/mobile/src/components/`
3. **EPIC screens:** mỗi screen trong EPIC-1 đến EPIC-8 → TSX screen file trong `apps/mobile/app/` (Expo Router)
4. **Interaction logic:** mỗi screen có handler cho mọi state transition (Initial/Loading/Empty/Filled/Error/Success/Submitting/Offline)
5. **Asset SVG:** Coder source từ Lucide Icons; custom 5BIB icons (BIB tag, medal, finish line, stopwatch, e-waiver pen) — Claude Design có thể generate hoặc Coder dùng tool icon online; payment gateway logos (4 SVG: VNPay, PayX, Payoo, OnePay) — source official từ gateway docs hoặc Danny cấp
6. **App store screenshots:** 6 screenshots per size (6.5" + 5.5" iPhone, optional iPad), Play Store equivalent — generate bằng device frame mockup tool (Mockuuups, Smartmockups) sau khi UI built xong, KHÔNG cần Figma

---

## ✅ Status

- [x] DRAFT
- [x] READY (rev2 2026-05-25 — Figma cleanup, ready cho Claude Design consume)

## 🔗 Next

Claude Design consume file này → setup Tamagui theme tokens + generate 20 component library TSX files. Song song với BA viết EPIC screens spec (Wave 2-4).
