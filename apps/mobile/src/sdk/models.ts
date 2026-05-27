/**
 * apps/mobile/src/sdk/models.ts
 *
 * Clean SDK DTO shapes used by mobile screens.
 * Source of truth: 01-ba-prd-overview.md "SDK Normalization Strategy" + per-EPIC contracts.
 *
 * These types match `@5bib/sdk` clean (post-normalization) DTOs. Mobile code
 * NEVER touches the legacy snake_case backend shape — that's the SDK adapter's job.
 */

// ---------------------------------------------------------------------------
// Auth (EPIC-1)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  fullName: string;
  /** Defaults to `'ROLE_NORMAL_USER'` when backend omits role. */
  role: string;
  avatar: string | null;
  locale: 'vi' | 'en' | 'de';
  // Profile fields (BaseUserDTO from EPIC-1) — all optional, may be absent on initial login
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other' | 'MALE' | 'FEMALE' | 'UNKNOWN';
  nationality?: string;
  address?: string;
  cityProvince?: string;
  idNumber?: string;
  racekit?: string;
  achievements?: string;
  club?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  sosPhone?: string;
  sosPhoneCountryCode?: string;
  medicalInfo?: string;
  currentMedication?: string;
  stravaId?: number | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Apple Sign-In input shape. Mobile native SDK gives `identityToken` directly;
 * backend uses OAuth `authorizationCode` flow as fallback. SDK adapter tries
 * 3 variants — see services/user.ts `appleLogin`.
 */
export interface AppleSignInInput {
  identityToken: string;
  authorizationCode?: string;
  fullName?: { givenName?: string; familyName?: string };
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * Confirmation payload for `deleteAccount`. Mobile UI BẮT BUỘC double-confirm
 * (type phrase + re-enter password). See BR-AUTH-19/20/21/22.
 */
export interface DeleteAccountConfirm {
  /** User must re-type the phrase shown in UI (e.g. "XOA TAI KHOAN"). */
  confirmPhrase: string;
  /** User's current password for re-authentication. */
  password: string;
}

/**
 * Payment gateway IDs (lowercase canonical form used by backend URL path).
 * Distinct from `PaymentMethod` enum (which carries UI option granularity).
 */
export type PaymentGateway = 'vnpay' | 'payx' | 'payoo' | 'onepay';

// ---------------------------------------------------------------------------
// Race / Browsing (EPIC-2)
// ---------------------------------------------------------------------------

export type RaceStatus = 'OPEN_FOR_SALE' | 'COMING_SOON' | 'CLOSED' | 'FINISHED';

export interface RaceCourse {
  id: string;
  raceId?: string;
  name: string;
  distance: string;
  distanceMeters?: number;
  price: number;
  currency?: 'VND';
  availableSlots?: number | null;
  totalSlots?: number;
  saleOpenAt?: string;
  saleCloseAt?: string;
  description?: string;
  elevationGain?: number;
  elevationLoss?: number;
  cutOffMinutes?: number;
  mapImageUrl?: string;
  coordinates?: { lat: number; lng: number }[];
}

export interface Race {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImageUrl: string | null;
  startDate: string;
  endDate?: string;
  location?: string;
  city?: string;
  isHighlight: boolean;
  bibSetUp: boolean;
  status: RaceStatus;
  raceType?: string;
  courses?: RaceCourse[];
  schedule?: { time: string; description: string }[];
  racekitImages?: string[];
  latitude?: number;
  longitude?: number;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount?: number;
}

export interface ListRacesResponse {
  items: Race[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Order / Checkout (EPIC-3)
// ---------------------------------------------------------------------------

export interface AthleteCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  idNumber: string;
  tshirtSize: string;
  racekit: string;
  nameOnBib: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodType?: string;
  medicalInformation?: string;
  currentMedication?: string;
  address?: string;
  club?: string;
  achievements?: string;
}

export interface DelegatorPayload {
  name: string;
  phone: string;
  email: string;
  cccd: string;
}

export interface GuardianPayload {
  name: string;
  dob: string;
  identity: string;
  email: string;
  phone: string;
  relation: string;
}

export interface OrderCreateInput {
  raceId: string;
  courseId: string;             // legacy: also used as variantId; see ticketTypeId below
  ticketTypeId?: string;        // from /pub/ticket-type/by-variant (optional, backend tolerates undefined)
  athlete: AthleteCreatePayload;
  delegator?: DelegatorPayload;
  guardian?: GuardianPayload;
  discountCode?: string;
  includedInsurance?: boolean;  // Igloo insurance toggle (default false)
}

export interface OrderCreateResponse {
  orderId: string;
  totalAmount: number;
  status: 'pending';
}

export interface Order {
  id: string;
  orderNumber: string;
  raceId: string;
  raceName: string;
  courseId: string;
  courseName: string;
  athleteName: string;
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  financialStatus: 'paid' | 'pending' | 'voided' | 'failed';
  internalStatus: string;
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  ticketId?: string;
  bib?: string;
}

export interface DiscountCheckResponse {
  valid: boolean;
  discountAmount?: number;
  discountPercent?: number;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'EXCEEDED_USAGE' | 'INVALID_RACE';
}

// ---------------------------------------------------------------------------
// Ticket (EPIC-4)
// ---------------------------------------------------------------------------

export interface Ticket {
  id: string;
  value: string;
  /** Widened to string — backend may return values outside the 3 documented ones. */
  status: 'ACTIVE' | 'TRANSFERRED' | 'CANCELLED' | string;
  /**
   * Widened to string — backend returns 8 enum values per BR-TICKETS-01
   * (NEW, REGISTER, REMIND_CHECK_IN, CHECK_IN/CHECKED_IN, FINISH, DNF, DNS, DSQ,
   *  TRANSFERRING, RACEKIT_RECEIVED, RACEKIT_NOT_RECEIVED, CANCELLED).
   * Screens must tolerate the wider set; classification is done via string compare.
   */
  athleteStatus: string;
  bib?: string;
  raceCourseDistance?: string;
  raceCourseName?: string;
  athleteName?: string;
  receiptEmail?: string;
  orderId?: string;
  createdOn?: string;
  modifiedOn?: string;
  availableToChangeCourse: boolean;
  race?: Race;
  basicInfo?: {
    value: string;
    courseId: string;
    courseName: string;
    raceName: string;
    closeForSaleDateTime?: string;
    openForSaleDateTime?: string;
    courseType?: string;
    courseDistance: string;
    bib?: string;
    rollingBibLastTime?: string;
    rollingBibValidUntil?: string;
    availableToRoll?: boolean;
  };
  athleteBasicInfo?: Record<string, unknown>;
  disclaimerStatus?: boolean;
}

export interface EstimateChangeResponse {
  changeCourseFee: number;
  finalValue: number;
  note: string;
}

// ---------------------------------------------------------------------------
// Result (EPIC-5)
// ---------------------------------------------------------------------------

export interface MyResultItem {
  raceId: string;
  raceName: string;
  courseId: string;
  courseName: string;
  distance: string;
  distanceMeters: number;
  raceDate: string;
  bib: string;
  finishTime: string;
  overallRank: number;
  medal?: 'gold' | 'silver' | 'bronze' | null;
}

/** Clean result row from `GET /athlete/result`. */
export interface RaceResultRow {
  id: string;
  athleteId?: string;
  raceId?: string;
  courseId?: string;
  bib?: string;
  finishTime?: string;
  rank?: number;
  rankAgeGroup?: number;
  status?: string;
  certificateUrl?: string;
  raceName?: string;
  courseName?: string;
  raceDate?: string;
}

export interface MedalItem {
  id: string;
  raceId?: string;
  imageUrl: string;
  earnedAt?: string;
  raceName?: string;
}

// ---------------------------------------------------------------------------
// Waiver (EPIC-6)
// ---------------------------------------------------------------------------

export interface SigningRace {
  raceId: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Profile (saved personas for quick-fill, EPIC-4)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  /** Backend stores extra fields as stringified JSON. */
  detail?: Record<string, unknown> | string;
}

// ---------------------------------------------------------------------------
// Province (VN address, EPIC-3 + EPIC-4)
// ---------------------------------------------------------------------------

export interface Province {
  /** Province name (canonical key for downstream district/ward queries). */
  name: string;
  /** Numeric or string code (varies by env). */
  code?: string;
}

export interface District {
  name: string;
  code?: string;
  province?: string;
}

export interface Ward {
  name: string;
  code?: string;
  district?: string;
  province?: string;
}

// ---------------------------------------------------------------------------
// Athlete (clean) — used by /athlete/by-ticket-code etc.
// ---------------------------------------------------------------------------

export interface Athlete {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  contactPhone?: string;
  idNumber?: string;
  nationality?: string;
  cityProvince?: string;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  dob?: string;
  racekit?: string;
  sosPhone?: string;
  club?: string;
  nameOnBib?: string;
  medicalInfo?: string;
  currentMedication?: string;
  isRepresent?: boolean;
  bib?: string;
  disclaimerStatus?: boolean;
}

export interface SigningTicket {
  id: string;
  name?: string;
  email?: string;
  codeValue?: string;
  signPath?: string;
  disclaimerStatus: boolean;
  athleteSubInfo?: {
    contactPhone?: string;
    dob?: string;
    disclaimerStatus?: boolean;
  };
  courseInfo?: {
    raceName?: string;
    courseName?: string;
    ticketImage?: string;
  };
}
