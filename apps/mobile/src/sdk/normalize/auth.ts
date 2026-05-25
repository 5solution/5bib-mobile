/**
 * apps/mobile/src/sdk/normalize/auth.ts
 *
 * Pure normalization functions for auth/user responses.
 * Backend → Clean shape.
 *
 * Source: 01-ba-prd-overview.md Normalization Mapping Table.
 */
import type { LoginResponse, User } from '../models';

interface LegacyRole {
  id: number;
  name: string;
  newRolePermissions?: unknown[];
}

interface LegacyLoginResponse {
  user_id: number | string;
  access_token: string;
  refresh_token?: string;
  role: LegacyRole;
  email: string | null;
  username: string;
  avatar?: string | null;
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  address?: string;
  locale?: 'vi' | 'en' | 'de';
  full_name?: string;
}

/**
 * Normalize legacy login response → clean LoginResponse.
 *
 * Field mapping:
 *   access_token  → token
 *   refresh_token → refreshToken
 *   user_id       → user.id (stringified)
 *   username      → user.fullName (fallback to email if missing)
 *   role.name     → user.role (flattened string)
 *   email         → user.email
 */
export function normalizeLoginResponse(
  raw: LegacyLoginResponse,
): LoginResponse {
  return {
    token: raw.access_token,
    refreshToken: raw.refresh_token,
    user: {
      id: String(raw.user_id),
      email: raw.email ?? '',
      fullName: raw.full_name ?? raw.username ?? raw.email ?? '',
      role: raw.role?.name ?? 'ROLE_NORMAL_USER',
      avatar: raw.avatar ?? null,
      locale: raw.locale ?? 'vi',
      phone: raw.phone,
      dob: raw.dob,
      gender: raw.gender,
      nationality: raw.nationality,
      address: raw.address,
    },
  };
}

/**
 * Normalize a backend user object (e.g. from /users/user-info) → clean User.
 * Accepts both legacy snake_case and partially-clean payloads defensively.
 */
export function normalizeUser(raw: unknown): User {
  const r = (raw ?? {}) as Record<string, unknown> & {
    role?: string | LegacyRole;
  };

  const id = String(r.id ?? r.user_id ?? '');
  const fullName = String(
    r.fullName ?? r.full_name ?? r.username ?? r.name ?? r.email ?? '',
  );

  let role = 'ROLE_NORMAL_USER';
  if (typeof r.role === 'string') {
    role = r.role;
  } else if (r.role && typeof r.role === 'object') {
    role = (r.role as LegacyRole).name ?? role;
  }

  return {
    id,
    email: String(r.email ?? ''),
    fullName,
    role,
    avatar: (r.avatar as string | null | undefined) ?? null,
    locale: (r.locale as User['locale']) ?? 'vi',
    phone: r.phone as string | undefined,
    dob: (r.dob as string | undefined) ?? (r.date_of_birth as string | undefined),
    gender: r.gender as User['gender'],
    nationality: r.nationality as string | undefined,
    address: r.address as string | undefined,
  };
}
