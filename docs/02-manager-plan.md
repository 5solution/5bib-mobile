# FEATURE-003: Plan Review — Wave 1+2+3 PRD COMPLETE

**Status:** ✅ **APPROVED rev3 (2026-05-25)** — Danny bộ 6 EPIC PRD ready cho Claude Design generate UI.

> **DECISION LOG 2026-05-25:** Danny chốt **Option A** cho SDK normalization strategy. FEATURE-002 scope expanded để include normalization layer (xem [FEATURE-002 00-manager-init.md "SCOPE EXPANSION"](../FEATURE-002-extract-sdk-monorepo/00-manager-init.md#-scope-expansion-2026-05-25-danny-chốt-option-a-từ-feature-003-plan-review)). BA fix Wave 1 PRD theo Option A: spec clean DTOs cho mobile + reference SDK normalization mapping table.
>
> **REV3 MANAGER VERDICT 2026-05-25 (lần 3 — Wave 2+3):** PRD COMPLETE cho 6 EPIC.
>
> **Spot-check Wave 2+3 (independent Manager verify, KHÔNG rubber-stamp BA):**
> - ✅ EPIC-6 e-waiver endpoints verified — `/pub/signing-race-dropdown` (line 83), `/pub/signing-request` (line 106), `/pub/signing-request-result` (line 126) trong `src/services/e-waiver/index.ts`
> - ✅ EPIC-6 deep link entry — `getSkipLiabilityCode` exists tại `src/services/ticket/index.ts:118` cho entry C deep link
> - ✅ EPIC-3 OnePay endpoint MISSING confirmed — PAUSE-EPIC3-06 BA flag chính xác (KHÔNG có handler riêng trong `checkoutUrl()`, default fallback `/${method}/payment` cho OnePay)
> - ✅ EPIC-4 ↔ EPIC-6 cross-ref: "Tap Ký E-Waiver → Navigate `/e-waiver?code=<value>` (EPIC-6)" khớp entry point C (deep link với code)
> - ✅ EPIC-2 + EPIC-4 ↔ EPIC-5 cross-ref: race CLOSED/FINISHED → WebView `result.5bib.com/event/{raceId}` (EPIC-5 rev2 pattern)
> - ✅ Group Buy properly excluded — KHÔNG có ref nào trong epic-2/3/4
> - ✅ EPIC-5 reduced scope đã apply: `/rr/find` removed, redirect pattern WebView wrapper
> - ✅ EPIC-6 spot-check finding important: web KHÔNG có canvas signature inline (sign qua external `signPath`) — BA correctly adapt mobile pattern (KHÔNG cần `react-native-signature-canvas` lib)
>
> **Minor cleanup (non-blocking):** [epic-4 line 714](.5bib-workflow/features/FEATURE-003-mobile-app-rn-expo/01-ba-prd-epic-4-tickets.md) còn obsolete text "Wave 3 (EPIC-6 + EPIC-7 Check-in)" — EPIC-7 đã DROP. BA cleanup khi có time.
>
> **28 PAUSE conditions tổng cộng** đã legit, defer backend/Danny clarify trước `/5bib-code`:
> - EPIC-2: 5, EPIC-3: 8, EPIC-4: 8, EPIC-5: 2 (rev2), EPIC-6: 6 (NEW) - chưa tính Wave 1 PAUSE (17)
>
> → Manager APPROVE PRD complete. Sẵn sàng Claude Design.
>
> **Ack Danny note (post-Design iteration):** Claude Design có khả năng generate UI patterns "hay ho" (creative variations) → có thể trigger PRD iteration round 2 để align spec với visual output. Acceptable workflow — PRD rev hiện tại là baseline đủ cho Design start.
>
> ---
>
> **PRIOR REV2 MANAGER VERDICT 2026-05-25 (lần 2 — Wave 1 only):** BA đã fix tất cả 4 CRITICAL findings + 1 minor + Figma cleanup theo Manager direction. Verified:
> - ✅ Finding #1: overview.md có section "SDK Normalization Strategy" với mapping table 5 endpoint + implementation pattern. epic-1-auth LoginResponse có inline mapping table chi tiết.
> - ✅ Finding #2: Google login + Forgot có rõ "Backend legacy format: query param" + "SDK adapter convert internally". Apple Sign-In spec với recommend body JSON pattern.
> - ✅ Finding #3: RegisterDto KEEP `confirmPassword` (required), `isRunner?` (optional, Phase 2), `agreeTerms` FRONTEND-ONLY (KHÔNG gửi backend), phone REMOVED khỏi register (update sau ở Profile).
> - ✅ Finding #4: ResetDto camelCase clean + SDK rename → snake_case backend. BR-AUTH-16 added cho confirmPassword == newPassword.
> - ✅ Finding #5: epic-9-infra retry pattern note exponential strategy + ack code thật hiện tại constant 1s, SDK extract upgrade.
> - ✅ Figma cleanup: 15 ref strip xong, không còn "Designer vẽ Figma" / "Figma library" / "Asset export Figma". Replace bằng "Claude Design generate TSX" / "UI deliverables" / "Coder source Lucide".
> - ✅ +3 BR-AUTH mới (16/17/18) cho confirmPassword + agreeTerms gate.
> - ✅ All 4 Wave 1 file đã flip status → 🔵 READY (rev2).
>
> **Còn 3 open question từ BA (KHÔNG block — defer ở FEATURE-002 PRD):**
> 1. SDK auto-hydrate `/users/user-info` sau `/login`? (BA recommend yes)
> 2. `isRunner` toggle MVP register hay defer Phase 2?
> 3. `/forgot` anti-enumeration policy (200 always vs 404)?
>
> → Manager APPROVE Wave 1 rev2. BA unblock viết Wave 2 (EPIC-2/3/4/5). 3 open question chuyển sang Danny review trong PRD FEATURE-002 hoặc trả lời lúc Wave 2 BA flag thêm.
**Reviewed:** 2026-05-25
**Reviewer:** 5bib-manager
**Wave:** 1 of 4 (Overview + Design System + EPIC-1 Auth + EPIC-9 Infra)
**Linked:** [00-manager-init.md](00-manager-init.md), [overview](01-ba-prd-overview.md), [design-system](01-ba-prd-design-system.md), [epic-1-auth](01-ba-prd-epic-1-auth.md), [epic-9-infra](01-ba-prd-epic-9-infra.md)

---

## 📌 Pre-flight check (Manager đã làm)

- [x] Đọc `00-manager-init.md` đầy đủ (decision lock: RN Expo + SDK monorepo, Full minus Group Buy, 4 require no-tester)
- [x] Đọc 4 PRD files Wave 1 đầy đủ
- [x] Đối chiếu memory: `codebase-map.md`, `architecture.md`, `conventions.md`, `known-issues.md`
- [x] **🔬 SPOT-CHECK CODE THẬT (4 files):**
  - `src/services/user/index.ts` — verify 7 auth endpoints
  - `src/services/core/index.ts` — verify Fetcher pattern + retry + 401 handler
  - `src/services/upload/index.ts` — verify upload pattern (multipart)
  - `src/services/order/index.ts` — verify shape pattern domain khác để confirm convention chung

---

## ✓ PRD Validation Checklist (16 mục)

### Completeness — ✅ PASS
- [x] User Stories đầy đủ với Persona chuẩn (Athlete, Race Organizer Staff, Race Buyer, Anonymous) — overview personas + EPIC-1 US-AUTH-01-09
- [x] Business Rules có ID (15 BR-GLOBAL + 15 BR-AUTH) — testable + cụ thể
- [x] Tất cả PAUSE conditions Manager (file 00) đã được BA trả lời — section "Answers to Manager's PAUSE"
- [x] UI states đầy đủ — 11 screens × 8 states matrix (Initial/Loading/Empty/Filled/Error/Success/Submitting/Offline)

### Technical correctness vs codebase — ❌ FAIL (3 critical mismatches)
- [❌] **Endpoint shape mismatch** — xem Finding #1
- [❌] **Endpoint param pattern mismatch** — xem Finding #2
- [❌] **DTO field name mismatch** — xem Finding #3
- [⚠️] Retry pattern spec exponential nhưng code thật constant 1s — minor, xem Finding #4

### Security — ✅ PASS
- [x] Auth Bearer header — pattern khớp Fetcher
- [x] IDOR check spec rõ TC-AUTH-15
- [x] Role check N/A cho EPIC-1 (no admin)
- [x] Sensitive field redact (Sentry beforeSend strip Authorization)
- [x] Token storage `expo-secure-store` only (BR-GLOBAL-06)

### Performance — ✅ PASS
- [x] SLA số cụ thể: cold start < 3s, login < 2s, profile fetch < 800ms, …
- [x] Cache strategy có TTL — offline ticket cache, SQLite
- [N/A] Migration plan — mobile không DB

### Testability — ✅ PASS
- [x] Unhappy paths cụ thể — TC-AUTH-01-20 đầy đủ status code + body
- [x] Concurrency test — N/A epic-1 (auth không concurrency); epic-9 staged rollout
- [x] 10x flaky test plan — Maestro E2E 5 critical flow + staged rollout
- [x] Manager 4 require no-tester đầy đủ (unit ≥80%, E2E, staged, auto-rollback)

### Design-oriented checks (Claude Design consumable) — ✅ PASS
- [x] Wireframe text đủ chi tiết — ASCII art layout + sections + components placement cho 11 screens
- [x] Form fields table với regex cụ thể — Login/Register/Profile fields có pattern + error msg VN
- [x] Buttons spec table — Default/Disabled/Loading/Action per button
- [x] TC-XX format input/output explicit — 20 TC-AUTH + 14 TC-INFRA
- [x] PAUSE conditions đầy đủ — 17 PAUSE (PAUSE-01 → PAUSE-17)
- [x] Component patterns library — 20 components với variants × states

---

## 🔬 Spot-check Code Reality vs PRD — Findings

### 🔴 Finding #1 (CRITICAL): LoginResponseDto shape KHÔNG khớp code thật

**PRD epic-1-auth section "Endpoint POST /login":**
```typescript
class LoginResponseDto {
  token!: string;                          // ← BA spec
  refreshToken?: string;
  user!: {
    id: string;                             // ← BA spec
    email: string;
    fullName: string;                       // ← BA spec
    avatar: string | null;
    locale: 'vi' | 'en' | 'de';
  };
}
```

**Code thật `src/services/user/index.ts:9-19`:**
```typescript
return network.post<{
  user_id: number;          // ← snake_case, number not string
  access_token: string;     // ← NOT "token"
  role: { id, name, newRolePermissions };
  email: null;
  username: string;         // ← NOT "fullName"
}>('/login', data, configs);
```

**Impact:** Coder làm theo PRD sẽ assume `response.token` + `response.user.fullName` — runtime undefined. Backend KHÔNG có `id`, `fullName`, `avatar`, `locale` fields trong response.

**Fix options:**
- **Option A (BA preferred — clean):** Document rõ rằng `@5bib/sdk` (FEATURE-002) sẽ normalize legacy `access_token` → `token`, `user_id` → `id`, `username` → `fullName` qua adapter layer. BA thêm section "SDK Normalization Mapping" trong overview.
- **Option B (pragmatic):** BA update PRD DTOs để khớp code thật (giữ snake_case + nested role). Mobile code sẽ messy nhưng đúng contract.
- **Manager recommend Option A** vì cleaner long-term, nhưng BLOCK cho đến khi BA xác nhận strategy.

### 🔴 Finding #2 (CRITICAL): Endpoint param pattern KHÔNG khớp

**PRD spec endpoints:**
- `POST /auth/google/login` body `{ idToken: string }`
- `POST /forgot` body `{ email }`

**Code thật:**
- `src/services/user/index.ts:41` — `loginWithGoogle`: `network.post('/auth/google/login', null, { params: { token } })` → **query param** `?token=...`, body null
- `src/services/user/index.ts:60` — `forgot`: `network.post('/forgot', null, { params: { email } })` → **query param** `?email=...`, body null

**Impact:** Coder gọi POST với body → backend nhận empty params → 400/500.

**Fix:** BA update PRD epic-1-auth để spec đúng query param thay vì body cho `/auth/google/login` + `/forgot`. (Hoặc note rằng SDK normalize sang body shape — backend phải accept cả 2 = unlikely.)

### 🔴 Finding #3 (CRITICAL): RegisterDto field name mismatch

**PRD spec `RegisterDto`:**
```typescript
{ fullName, email, phone?, password, agreeTerms }
```

**Code thật `src/services/user/index.ts:21-29`:**
```typescript
interface PayloadRegister {
  password: string;
  confirmPassword: string;    // ← BA bỏ qua
  name: string;               // ← BA spec là "fullName"
  email: string;
  isRunner?: boolean;         // ← BA bỏ qua
  passwordValid?: boolean;
  confirmPasswordMatch?: boolean;
}
```

**Impact:**
- BA bỏ field `confirmPassword` — backend có thể require, sẽ 400
- BA bỏ `isRunner` — có thể là business field merchant onboarding flag
- BA spec `phone` nhưng code thật KHÔNG có phone field trong register payload
- Field `name` thay vì `fullName`

**Fix:** BA align với code thật HOẶC đề xuất API redesign (backend phải update endpoint, KHÔNG phải mobile choice).

### 🔴 Finding #4 (CRITICAL): Reset password DTO mismatch

**PRD spec:**
```typescript
class ResetDto { email, otp, newPassword }
```

**Code thật `src/services/user/index.ts:62-69`:**
```typescript
network.post('/reset', { otp, email, new_password, new_password_confirm })
```

**Impact:** BA bỏ `new_password_confirm` + dùng camelCase. Backend reject.

### 🟡 Finding #5 (MINOR): Retry pattern mismatch

**PRD overview BR-GLOBAL-04 + epic-9-infra section 9.1:**
> Retry 3 lần, delay exponential 1s, 2s, 4s

**Code thật `src/services/core/index.ts:127-138`:**
```typescript
for (let i = 0; i < RETRIES; i++) {
  // ... fetch
  await new Promise(resolve => setTimeout(resolve, 1000));   // ← constant 1s
}
```

**Impact:** Minor — BA propose better pattern (exponential), code hiện tại constant. SDK extract có thể upgrade. Manager đề xuất giữ exponential (BA proposal tốt hơn), document rằng SDK extract sẽ upgrade retry logic.

### 🟡 Finding #6 (MINOR): Hardcoded fallback domain inconsistency

**Code thật `src/services/core/index.ts:7`:**
```typescript
const DOMAIN = 'https://dapi.5bib.com';  // hardcoded fallback dev
```

**vs `core/index.ts:198`:**
```typescript
network.defaults.baseURL = Env.NEXT_PUBLIC_DOMAIN_BASE_URL;  // env
```

**Impact:** 2 đường dẫn config baseURL inconsistent. SDK extract (FEATURE-002) phải clean up — chỉ dùng env injection, KHÔNG hardcode.

### 🟢 Finding #7 (POSITIVE): TD-008 Apple Sign-In endpoint correctly flagged

BA đã flag `POST /auth/apple/login` là endpoint MỚI cần backend build (PAUSE-06). Code thật KHÔNG có endpoint này — confirmed. ✅

### 🟢 Finding #8 (POSITIVE): Fetcher 401 + auto signOut KHỚP

**PRD BR-GLOBAL-03 + epic-9-infra section 9.1:** `onUnauthorized: () => eventBus.emit('AUTH_EXPIRED')`

**Code thật `core/index.ts:145-148`:**
```typescript
if (response?.status === 401) {
  toast.error('Phiên hết hạn, vui lòng đăng nhập lại.');
  signOut({ redirect: false });
}
```

Pattern khớp intent ✅. Adapter chỉ cần wrap callback thay vì hardcoded `signOut`.

---

## 🎨 Figma References Cleanup (KHÔNG block, nhưng cần fix)

Vì Danny dùng **Claude Design** (AI agent), KHÔNG cần human designer + Figma. BA reference đến Figma cần strip:

### `01-ba-prd-overview.md`
- Line ~"Figma có sẵn chưa" trong Answers section → đổi thành "Claude Design tự generate từ wireframe spec"
- Line "designer parallel work" → "Claude Design generate UI parallel"

### `01-ba-prd-design-system.md`
- Section "Designer làm trên Figma" → "Claude Design + Coder generate components từ spec này"
- Section "Designer dùng list này để vẽ component library trong Figma" → "Claude Design consume list này để generate UI components"
- Section "Designer deliverables expected" → đổi tên thành "UI deliverables from Claude Design + Coder"
- Section "Foundation library / Components library / Asset export" — note rằng Claude Design output là TSX components, không phải Figma file

### `01-ba-prd-epic-1-auth.md`
- Mọi mention "Designer: cần X SVG", "Designer: illustration" → đổi "Asset (SVG): cần ai design hoặc Claude generate"
- Section "Next" → strip "Designer vẽ 11 screens trên Figma"

### `01-ba-prd-epic-9-infra.md`
- Line "Designer chỉ cần đọc section..." → "UI deliverables team (Claude Design + Coder)"

→ BA refactor batch cleanup. KHÔNG nhiều — ~10-15 line edits.

---

## 📊 Cross-check với memory

### Architecture impact
PRD KHÔNG break architecture hiện tại. Mobile là client mới của `api.5bib.com`, dùng cùng endpoint. Architecture diagram đã có placeholder "Mobile (future)" — sẽ activate sau ship.

### Convention impact
PRD propose nhiều convention MỚI cho mobile (Expo Router, Tamagui, Zustand, expo-secure-store) — chưa có precedent trong codebase. Đây là expected (mobile = greenfield). Manager sẽ append "Mobile conventions" vào `conventions.md` sau FEATURE-003 deploy.

### Known issues impact
PRD reference TD-006, TD-007, TD-008, TD-009 (đã flag trong known-issues). ✅
PRD raise mới: 17 PAUSE conditions — tất cả đều legit, BLOCK production nhưng KHÔNG block code start.

---

## 📋 Files Scope Lock (preliminary — sẽ finalize sau APPROVED + Wave 2-4 done)

Vì Wave 1 chỉ là spec, KHÔNG có code change ngay. Code start sau FEATURE-002 deploy + Wave 1-4 APPROVED.

**Pre-allocate folder structure (Coder sẽ tạo):**
```
apps/mobile/                              ← NEW folder root
├── app/                                  ← Expo Router routes
├── src/components/, hooks/, stores/, adapters/, theme/, utils/, constants/
├── assets/
├── app.json, eas.json, babel.config.js, tsconfig.json, package.json
```

Scope Lock chi tiết per epic sẽ định trong `02-manager-plan.md` cập nhật sau Wave 2-4 complete.

---

## 🛑 PAUSE points cho BA (fix Wave 1 trước khi Wave 2)

- 🛑 **CRITICAL Finding #1-4:** BA confirm strategy SDK normalize (Option A) hoặc align code thật (Option B). Manager recommend Option A — BA + Danny align với backend team về clean shape mới (có thể tạo FEATURE-002.5 hoặc backend feature riêng để clean response shape).
- 🛑 **Figma cleanup:** BA batch edit ~15 line refs trong 4 PRD files
- 🛑 **Finding #5 retry:** BA confirm exponential pattern + note SDK upgrade
- 🛑 Trước khi viết Wave 2 (EPIC-2/3/4/5), BA phải fix tất cả CRITICAL findings — KHÔNG được tiếp tục Wave 2 với pattern PRD-vs-code mismatch

---

## 🧪 Unit test BẮT BUỘC (Coder phải viết khi code start)

> Sẽ áp dụng khi `/5bib-code` chạy. Wave 1 chỉ là spec.

- [ ] Auth store (Zustand) — login/logout/refresh action
- [ ] SDK adapter — `getToken`/`setToken`/`onUnauthorized` callback
- [ ] Form validation schema `loginSchema`, `registerSchema`, `resetSchema` (zod)
- [ ] Each screen logic test (focus event handlers, không snapshot)
- [ ] Offline ticket cache (SQLite query) — write/read/clear
- [ ] i18n switch locale + persist

---

## 📊 Verdict

> ### 🟡 **NEEDS_REVISION**
>
> Wave 1 PRD scope + depth là EXCELLENT — đầy đủ 9 EPIC breakdown, 15 BR-GLOBAL + 15 BR-AUTH, 20 components library, 17 PAUSE conditions, design tokens chuẩn, NFR có số cụ thể. Đặc biệt EPIC-1 đầy đủ 11 screen với wireframe + states + form fields + buttons + 20 test cases — Claude Design consume được ngay.
>
> **BLOCK:** 4 CRITICAL findings về endpoint contract mismatch giữa PRD và code web hiện tại (auth response shape, Google login param pattern, Register DTO fields, Reset DTO fields). Nếu Coder code theo PRD raw → runtime undefined fields → app break.
>
> **Cần BA fix:**
> 1. ✋ **Finding #1-4 (CRITICAL):** Confirm SDK normalization strategy (Manager recommend Option A) + document mapping table trong `overview.md` section "SDK Normalization Strategy". HOẶC align PRD DTOs với code thật snake_case.
> 2. ✋ **Finding #5 (MINOR):** Confirm exponential retry pattern + note SDK upgrade
> 3. ✋ **Figma cleanup:** Batch edit ~15 line refs sang "Claude Design" / "UI deliverables team"
>
> **Estimate effort BA fix:** 1-2 giờ.

---

## ✅ Sẵn sàng cho `/5bib-code`?

- [ ] **NO** — Wave 1 chưa APPROVED. Còn cần:
  1. BA fix 4 CRITICAL findings (Finding #1-4)
  2. BA cleanup Figma refs
  3. BA re-submit Wave 1 → Manager re-run `/5bib-plan`
  4. Wave 2-4 BA viết tiếp + Manager review (~2-3 tuần work)
  5. FEATURE-002 (SDK extract) phải deploy trước `/5bib-code` FEATURE-003

---

## 🎯 NHƯNG sẵn sàng cho Claude Design CONSUMER NGAY?

Tao đánh giá riêng:

**Design-oriented quality:** ✅ Wave 1 ĐÃ ĐỦ chi tiết cho Claude Design generate UI từ PRD:
- Design tokens hoàn chỉnh (color/typo/spacing/radius/shadow/icon)
- 20 component patterns với states matrix
- 11 screen wireframe ASCII art + sections + components placement
- Tất cả UI states defined (Initial/Loading/Empty/Filled/Error/Success/Submitting/Offline)
- Form fields table với validation regex
- Buttons spec table

**→ Danny CÓ THỂ feed `design-system.md` + `epic-1-auth.md` vào Claude Design NGAY** để generate UI components/screens song song với BA fix endpoint contract issues. UI code Claude Design generate KHÔNG phụ thuộc endpoint contract (UI chỉ care wireframe + state).

→ **Pragmatic recommendation:** Danny:
1. Pass `design-system.md` + `epic-1-auth.md` cho Claude Design generate UI components NGAY (parallel work)
2. Cho BA 1-2 giờ fix 4 CRITICAL findings + Figma cleanup
3. Re-run `/5bib-plan` → APPROVE → BA viết Wave 2

---

## 🔗 Next step

**BA action (immediate):**
1. Fix Finding #1: Decide SDK normalization strategy với Danny → document trong overview
2. Fix Finding #2-4: Update epic-1-auth endpoint specs (query param vs body, register DTO, reset DTO)
3. Fix Finding #5: Note retry exponential trong epic-9-infra
4. Cleanup Figma refs trong 4 files (~15 edits)
5. Re-submit → Danny chạy lại `/5bib-plan`

**Danny action (parallel):**
1. **OK feed `design-system.md` + `epic-1-auth.md` cho Claude Design ngay** — generate UI components không bị block bởi endpoint contract issues
2. Decide SDK normalization strategy (Option A vs B) — manager khuyến nghị **Option A** (SDK normalize legacy backend shape sang clean DTOs cho mobile)
3. Sau khi BA fix Wave 1 → tiếp tục Wave 2 (EPIC-2/3/4/5)
4. Song song setup PAUSE-09/10/11/12 (EAS, Sentry, Firebase, FB) — không block by PRD

**Manager note:**
Vì NO TESTER, Manager đặc biệt nghiêm với endpoint contract mismatch (Finding #1-4). Nếu lọt vào code → bug rate cao, không có ai catch ngoài user prod → khổ. Đây là chính xác lúc Manager review value-add.
