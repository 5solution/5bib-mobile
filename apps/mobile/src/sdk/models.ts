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
  role: string;
  avatar: string | null;
  locale: 'vi' | 'en' | 'de';
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  address?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

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
  courseId: string;
  athlete: AthleteCreatePayload;
  delegator?: DelegatorPayload;
  guardian?: GuardianPayload;
  discountCode?: string;
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
  status: 'ACTIVE' | 'TRANSFERRED' | 'CANCELLED';
  athleteStatus: 'ACTIVE' | 'CHECKED_IN' | 'NOT_REGISTERED';
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
  athleteBasicInfo?: any;
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

// ---------------------------------------------------------------------------
// Waiver (EPIC-6)
// ---------------------------------------------------------------------------

export interface SigningRace {
  raceId: string;
  title: string;
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
