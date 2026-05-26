/**
 * apps/mobile/src/sdk/index.ts
 *
 * Barrel export for `@5bib/sdk` mobile consumer surface.
 *
 * Usage:
 *   import { user, race, ticket, order, PaymentMethod, loginSchema } from '@/sdk';
 */

// --- Core (HTTP client + bootstrap) ---
export {
  Fetcher,
  FetcherError,
  FETCHER_EVENTS,
  initFetcher,
  network,
} from './core';
export type {
  FetcherAdapter,
  FetcherEvent,
  FetcherListener,
  RequestOptions,
  ApiEnvelope,
} from './core';

// --- Models (clean DTOs) ---
export * from './models';

// --- Services ---
export { user } from './services/user';
export type {
  LoginInput,
  RegisterInput,
  ResetInput,
  UpdateUserInput,
} from './services/user';

export { race } from './services/race';
export type { ListRacesParams } from './services/race';

export { raceCourse } from './services/race-course';

export { order } from './services/order';
export type {
  ListMyOrdersParams,
  ListMyOrdersResponse,
} from './services/order';

export { ticket } from './services/ticket';
export type {
  ListUserTicketsParams,
  ListUserTicketsResponse,
} from './services/ticket';

export { athlete } from './services/athlete';
export type { ListResultsResponse } from './services/athlete';

export { profile } from './services/profile';
export type {
  CreateProfileInput,
  UpdateProfileInput,
} from './services/profile';

export { eWaiver } from './services/e-waiver';

export { upload, initUploadClient } from './services/upload';
export type { UploadFile } from './services/upload';

export { priceRule } from './services/priceRule';
export type { PriceRule } from './services/priceRule';

export { payment } from './services/payment';

export { property } from './services/property';
export type { PropertyResponse } from './services/property';

export { province } from './services/province';

export { result } from './services/result';
export type { ListMyResultsParams } from './services/result';

export { request } from './services/request';
export type { ReportDnfInput, RequestType } from './services/request';

// --- Normalizers (exported for tests + advanced consumers) ---
export { normalizeLoginResponse, normalizeUser } from './normalize/auth';
export type { LegacyLoginResponse } from './normalize/auth';
export { normalizeOrder } from './normalize/order';
export { normalizeTicket } from './normalize/ticket';

// --- Validation schemas ---
export {
  loginSchema,
  registerSchema,
  forgotSchema,
  resetSchema,
} from './validations/auth';
export type {
  LoginInput as LoginFormInput,
  RegisterInput as RegisterFormInput,
  ForgotInput,
  ResetInput as ResetFormInput,
} from './validations/auth';

export {
  vatSchema,
  getAthleteSchema,
  delegatorSchema,
  getGuardianSchema,
} from './validations/checkout';
export type {
  VatInput,
  AthleteInput,
  DelegatorInput,
  GuardianInput,
} from './validations/checkout';

export { transferTicketSchema } from './validations/transfer';
export type { TransferTicketInput } from './validations/transfer';

export {
  requestSigningOtpSchema,
  verifySigningOtpSchema,
  signDisclaimerSchema,
  delegatorSigningSchema,
} from './validations/e-waiver';
export type {
  RequestSigningOtpInput,
  VerifySigningOtpInput,
  SignDisclaimerInput,
  DelegatorSigningInput,
} from './validations/e-waiver';

// --- Constants ---
export {
  PaymentMethod,
  paymentOptions,
  devPaymentOptions,
  qrOptions,
} from './constants/payment';
export type { PaymentOption } from './constants/payment';

export {
  ATHLETE_STATUS,
  ATHLETE_STATUS_ACTIONS,
  ATHLETE_STATUS_LABELS,
  ATHLETE_ACTION_LABELS,
} from './constants/athlete-status';
export type {
  AthleteStatus,
  AthleteAction,
} from './constants/athlete-status';

export {
  TRANSFER_ERROR_CODE,
  TRANSFER_ERROR_MESSAGES_VI,
  TRANSFER_ERROR_FALLBACK_VI,
  getTransferErrorMessage,
} from './constants/transfer-error-codes';
export type { TransferErrorCode } from './constants/transfer-error-codes';

export { COURSE_TYPE, COURSE_TYPE_LABEL_VI } from './constants/course-type';
export type { CourseType } from './constants/course-type';

export {
  ANIMATION,
  ASPECT,
  MODAL,
  PAGINATION,
  CACHE_TTL,
  TOUCH_TARGET,
  LIMITS,
} from './constants/app';
