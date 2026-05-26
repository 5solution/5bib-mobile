/**
 * apps/mobile/src/sdk/normalize/auth.ts
 *
 * Pure normalization functions for auth/user responses.
 * Backend → Clean shape.
 *
 * Source: 01-ba-prd-overview.md Normalization Mapping Table.
 *         docs/API_REFERENCE.md EPIC-1 (real Postman schema).
 *
 * ⚠️ Backend reality (from Postman collection):
 *   - Real /login response: { user_id, access_token, email, username } — 4 fields ONLY.
 *   - NO `refresh_token` field exists (single-token model via /renew).
 *   - NO `role` field in /login response (defaults to ROLE_NORMAL_USER).
 *   - /users/user-info may carry role inline as string (e.g. "ROLE_NORMAL_USER")
 *     OR as nested object — handle both defensively.
 */
import type { LoginResponse, User } from '../models';

/** Default role when backend omits the field entirely. */
const DEFAULT_ROLE = 'ROLE_NORMAL_USER';

interface LegacyRole {
  id?: number;
  name?: string;
  newRolePermissions?: unknown[];
}

/**
 * The REAL login response from `/login`, `/register`, `/renew`,
 * `/auth/google/login`, `/auth/apple/login`. Per API_REFERENCE EPIC-1.
 *
 * Most fields optional because:
 *   - `role` only present on some endpoints (some return user_id + token only)
 *   - extended profile fields (`avatar`, `phone`, ...) only on /users/user-info
 */
export interface LegacyLoginResponse {
  user_id: number | string;
  access_token: string;
  email: string | null;
  username: string;
  /** OPTIONAL — not in real /login response. Some legacy endpoints include it. */
  role?: LegacyRole | string;
  /** OPTIONAL profile bleed-through fields. */
  avatar?: string | null;
  phone?: string;
  dob?: string;
  gender?: User['gender'];
  nationality?: string;
  address?: string;
  locale?: 'vi' | 'en' | 'de';
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Normalize legacy login response → clean LoginResponse.
 *
 * Field mapping:
 *   access_token  → token
 *   user_id       → user.id (stringified)
 *   username      → user.fullName (fallback to email if missing)
 *   role          → user.role (default ROLE_NORMAL_USER if missing)
 *   email         → user.email
 *
 * NO `refreshToken` — backend uses single-token model + GET /renew.
 */
export function normalizeLoginResponse(
  raw: LegacyLoginResponse,
): LoginResponse {
  return {
    token: raw.access_token,
    user: {
      id: String(raw.user_id ?? ''),
      email: raw.email ?? '',
      fullName: raw.full_name ?? raw.username ?? raw.email ?? '',
      role: extractRole(raw.role),
      avatar: raw.avatar ?? null,
      locale: raw.locale ?? 'vi',
      firstName: raw.first_name,
      lastName: raw.last_name,
      phone: raw.phone,
      dob: raw.dob,
      gender: raw.gender,
      nationality: raw.nationality,
      address: raw.address,
    },
  };
}

/**
 * Normalize a backend user object (e.g. from /users/user-info, /users/{id})
 * → clean User. Accepts both legacy snake_case and partially-clean payloads
 * defensively. Maps the full BaseUserDTO (22 fields, snake/camel mix).
 */
export function normalizeUser(raw: unknown): User {
  const r = (raw ?? {}) as Record<string, unknown> & {
    role?: string | LegacyRole;
  };

  const id = String(r.id ?? r.user_id ?? '');
  const fullName = String(
    r.fullName ?? r.full_name ?? r.username ?? r.name ?? r.email ?? '',
  );

  return {
    id,
    email: String(r.email ?? ''),
    fullName,
    role: extractRole(r.role),
    avatar: (r.avatar as string | null | undefined) ?? null,
    locale: (r.locale as User['locale']) ?? 'vi',
    firstName: (r.first_name as string | undefined) ?? (r.firstName as string | undefined),
    lastName: (r.last_name as string | undefined) ?? (r.lastName as string | undefined),
    phone: (r.phone as string | undefined) ?? (r.phone_number as string | undefined),
    countryCode: (r.countryCode as string | undefined) ?? (r.country_code as string | undefined),
    dob:
      (r.dob as string | undefined) ??
      (r.date_of_birth as string | undefined),
    gender: r.gender as User['gender'],
    nationality: r.nationality as string | undefined,
    address: r.address as string | undefined,
    cityProvince: (r.city_province as string | undefined) ?? (r.cityProvince as string | undefined),
    idNumber: (r.id_number as string | undefined) ?? (r.idNumber as string | undefined),
    racekit: r.racekit as string | undefined,
    achievements: r.achievements as string | undefined,
    club: r.club as string | undefined,
    height: r.height as string | undefined,
    weight: r.weight as string | undefined,
    bloodGroup: (r.blood_group as string | undefined) ?? (r.bloodGroup as string | undefined),
    sosPhone: (r.sosPhone as string | undefined) ?? (r.sos_phone as string | undefined),
    sosPhoneCountryCode:
      (r.sosPhoneCountryCode as string | undefined) ??
      (r.sos_phone_country_code as string | undefined),
    medicalInfo: (r.medical_info as string | undefined) ?? (r.medicalInfo as string | undefined),
    currentMedication:
      (r.current_medication as string | undefined) ?? (r.currentMedication as string | undefined),
    stravaId: (r.strava_id as number | null | undefined) ?? (r.stravaId as number | null | undefined),
  };
}

/** Extract role string from any of: missing, string, or nested {name} object. */
function extractRole(role: unknown): string {
  if (typeof role === 'string' && role.length > 0) return role;
  if (role && typeof role === 'object') {
    const n = (role as LegacyRole).name;
    if (typeof n === 'string' && n.length > 0) return n;
  }
  return DEFAULT_ROLE;
}
