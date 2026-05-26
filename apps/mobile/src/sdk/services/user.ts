/**
 * apps/mobile/src/sdk/services/user.ts
 *
 * Auth + user profile service. Consumer sees CLEAN shape (camelCase, flat role).
 * Internal: legacy backend shape (snake/camel mix, query-param vs body, etc.).
 *
 * Source: docs/API_REFERENCE.md "EPIC-1 Auth & Profile" (real Postman schema).
 *         01-ba-prd-overview.md Normalization Mapping Table.
 */
import { network } from '../core';
import type {
  AppleSignInInput,
  ChangePasswordInput,
  LoginResponse,
  User,
} from '../models';
import {
  normalizeLoginResponse,
  normalizeUser,
  type LegacyLoginResponse,
} from '../normalize/auth';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  isRunner?: boolean;
}

export interface ResetInput {
  otp: string;
  email: string;
  newPassword: string;
  newPasswordConfirm: string;
}

/**
 * Clean shape consumed by mobile profile screens.
 * Maps → mixed snake/camel BaseUserDTO when sent to backend.
 */
export interface UpdateUserInput {
  fullName?: string;
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
  avatar?: string | null;
  locale?: 'vi' | 'en' | 'de';
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
}

/**
 * Map clean UpdateUserInput → backend BaseUserDTO body.
 *
 * ⚠️ Mixed snake/camel per docs/API_REFERENCE.md (intentional, not a bug).
 *   camelCase backend fields: countryCode, sosPhone, sosPhoneCountryCode,
 *                             nationality, racekit, achievements, club
 *   snake_case backend fields: first_name, last_name, id_number, city_province,
 *                              medical_info, current_medication, blood_group,
 *                              country_code (sometimes), sos_phone (sometimes)
 *
 * Sends BOTH camel + snake variants for `sosPhone` / `countryCode` to be safe
 * (matches EPIC-4 athlete-register pattern observed live).
 */
function mapUpdateUserToLegacy(
  input: UpdateUserInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (input.fullName !== undefined) out.name = input.fullName;
  if (input.firstName !== undefined) out.first_name = input.firstName;
  if (input.lastName !== undefined) out.last_name = input.lastName;
  if (input.phone !== undefined) out.phone = input.phone;
  if (input.countryCode !== undefined) {
    out.countryCode = input.countryCode;
    out.country_code = input.countryCode; // safety duplicate
  }
  if (input.dob !== undefined) out.dob = input.dob;
  if (input.gender !== undefined) out.gender = input.gender;
  if (input.nationality !== undefined) out.nationality = input.nationality;
  if (input.address !== undefined) out.address = input.address;
  if (input.cityProvince !== undefined) out.city_province = input.cityProvince;
  if (input.idNumber !== undefined) out.id_number = input.idNumber;
  if (input.avatar !== undefined) out.avatar = input.avatar;
  if (input.locale !== undefined) out.locale = input.locale;
  if (input.racekit !== undefined) out.racekit = input.racekit;
  if (input.achievements !== undefined) out.achievements = input.achievements;
  if (input.club !== undefined) out.club = input.club;
  if (input.height !== undefined) out.height = input.height;
  if (input.weight !== undefined) out.weight = input.weight;
  if (input.bloodGroup !== undefined) out.blood_group = input.bloodGroup;
  if (input.sosPhone !== undefined) {
    out.sosPhone = input.sosPhone;
    out.sos_phone = input.sosPhone; // safety duplicate
  }
  if (input.sosPhoneCountryCode !== undefined) {
    out.sosPhoneCountryCode = input.sosPhoneCountryCode;
    out.sos_phone_country_code = input.sosPhoneCountryCode;
  }
  if (input.medicalInfo !== undefined) out.medical_info = input.medicalInfo;
  if (input.currentMedication !== undefined) {
    out.current_medication = input.currentMedication;
  }

  return out;
}

export const user = {
  /**
   * POST /login — email + password.
   * BR-AUTH: email lowercased before sending.
   */
  async login(input: LoginInput): Promise<LoginResponse> {
    const raw = await network().post<{ data: LegacyLoginResponse }>('/login', {
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    return normalizeLoginResponse(raw.data);
  },

  /**
   * POST /auth/google/login?token=... — backend expects query param,
   * not body. SDK hides this quirk.
   */
  async googleLogin(input: { idToken: string }): Promise<LoginResponse> {
    const raw = await network().post<{ data: LegacyLoginResponse }>(
      '/auth/google/login',
      null,
      { params: { token: input.idToken } },
    );
    return normalizeLoginResponse(raw.data);
  },

  /**
   * POST /auth/apple/login — ⚠️ 3-variant fallback chain.
   *
   * Backend uses OAuth code flow (web-style), mobile native gives identityToken
   * (mobile-style). Schema not deterministically documented — see API_REFERENCE
   * "Apple Sign-In Deep Dive". Try:
   *   1. POST JSON body with identityToken (mobile-native preferred)
   *   2. POST with authorizationCode as query `code`
   *   3. GET /auth/apple/login?code=X (web-OAuth style)
   *
   * Mobile MUST verify on DEV before claim feature ready (Apple client_secret
   * JWT expired 2024-01-10 — may need backend re-sign first).
   */
  async appleLogin(input: AppleSignInInput): Promise<LoginResponse> {
    // Try 1: POST JSON body
    try {
      const raw = await network().post<{ data: LegacyLoginResponse }>(
        '/auth/apple/login',
        {
          identityToken: input.identityToken,
          fullName: input.fullName,
          email: input.email,
        },
        { noRetry: true },
      );
      return normalizeLoginResponse(raw.data);
    } catch (e1) {
      // Try 2: POST query with authorizationCode
      if (input.authorizationCode) {
        try {
          const raw = await network().post<{ data: LegacyLoginResponse }>(
            '/auth/apple/login',
            null,
            { params: { code: input.authorizationCode }, noRetry: true },
          );
          return normalizeLoginResponse(raw.data);
        } catch (_e2) {
          // Try 3: GET with code
          const raw = await network().get<{ data: LegacyLoginResponse }>(
            '/auth/apple/login',
            { params: { code: input.authorizationCode } },
          );
          return normalizeLoginResponse(raw.data);
        }
      }
      throw e1;
    }
  },

  /**
   * POST /register — `fullName` renamed to `name` for backend.
   * `confirmPassword` is camelCase (NOT confirm_password) per real Postman.
   * `agreeTerms` is FRONTEND-ONLY (BR-AUTH register), NOT sent to backend.
   */
  async register(input: RegisterInput): Promise<LoginResponse> {
    const raw = await network().post<{ data: LegacyLoginResponse }>('/register', {
      name: input.fullName,
      email: input.email.trim().toLowerCase(),
      password: input.password,
      confirmPassword: input.confirmPassword,
      ...(input.isRunner !== undefined && { isRunner: input.isRunner }),
    });
    return normalizeLoginResponse(raw.data);
  },

  /**
   * POST /forgot?email=... — backend uses query param, no body.
   */
  async forgot(input: { email: string }): Promise<void> {
    await network().post('/forgot', null, {
      params: { email: input.email.trim().toLowerCase() },
    });
  },

  /**
   * POST /reset — body fields are snake_case (per API_REFERENCE EPIC-1).
   */
  async reset(input: ResetInput): Promise<void> {
    await network().post('/reset', {
      otp: input.otp,
      email: input.email.trim().toLowerCase(),
      new_password: input.newPassword,
      new_password_confirm: input.newPasswordConfirm,
    });
  },

  /**
   * POST /resend_activation_email?email=X — query param style.
   */
  async resendActivation(input: { email: string }): Promise<void> {
    await network().post('/resend_activation_email', null, {
      params: { email: input.email.trim().toLowerCase() },
    });
  },

  /**
   * POST /logout — invalidate session on backend.
   */
  async logout(): Promise<void> {
    await network().post('/logout');
  },

  /**
   * GET /renew — refresh JWT (single-token model, no separate refresh_token).
   *
   * SDK strategy:
   *   - Proactive: schedule refresh at minute 23h after login
   *   - Reactive: on 401 → call /renew → retry original request (max 1)
   * App layer is responsible for scheduling + retry orchestration.
   */
  async refresh(): Promise<LoginResponse> {
    const raw = await network().get<{ data: LegacyLoginResponse }>('/renew');
    return normalizeLoginResponse(raw.data);
  },

  /**
   * GET /users/user-info — current user profile.
   */
  async getUserInfo(): Promise<User> {
    const raw = await network().get<{ data: unknown }>('/users/user-info');
    return normalizeUser(raw.data);
  },

  /**
   * PUT /users/{user_id} — update full BaseUserDTO.
   * Mixed snake/camel body (intentional, see `mapUpdateUserToLegacy`).
   */
  async updateUserInfo(userId: string, input: UpdateUserInput): Promise<User> {
    const body = mapUpdateUserToLegacy(input);
    const raw = await network().put<{ data: unknown }>(`/users/${userId}`, body);
    return normalizeUser(raw.data);
  },

  /**
   * POST /users/update-password — change password (authenticated).
   * Body: ALL camelCase per API_REFERENCE EPIC-1.
   * Schema: newPassword 8-20 chars, ALL 3 fields required.
   */
  async changePassword(input: ChangePasswordInput): Promise<void> {
    await network().post(
      '/users/update-password',
      {
        password: input.currentPassword,
        newPassword: input.newPassword,
        confirmNewPassword: input.confirmNewPassword,
      },
      { noRetry: true },
    );
  },

  /**
   * DELETE /users/delete/forever — 🚨 HARD DELETE, no undo.
   *
   * Backend deletes bearer-token's user IMMEDIATELY. No body, no params.
   * Mobile UI BẮT BUỘC double-confirm (type phrase + re-enter password)
   * before invoking this. See PRD EPIC-1 S-PROFILE-05 + BR-AUTH-19/20/21/22.
   *
   * Response: `{ data: { data: "Delete user successfully" }, success: true }`
   * (note the double-nested `data.data` string — backend quirk).
   */
  async deleteAccount(): Promise<{ message: string }> {
    const raw = await network().delete<{ data?: { data?: string } | string }>(
      '/users/delete/forever',
      undefined,
      { noRetry: true },
    );
    const inner = raw.data;
    let message = 'Account deleted';
    if (typeof inner === 'string') {
      message = inner;
    } else if (inner && typeof inner === 'object' && typeof inner.data === 'string') {
      message = inner.data;
    }
    return { message };
  },

  /**
   * POST /upload/avatar — multipart, requires `type=BACK_HASH` form field.
   * Returns the uploaded image URL.
   *
   * Mobile flow:
   *   1. uploadAvatar(file) → get URL
   *   2. updateUserInfo(userId, { avatar: url })
   */
  async uploadAvatar(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<{ url: string }> {
    const form = new FormData();
    // RN FormData accepts the `{ uri, name, type }` object directly
    form.append('file', file as unknown as Blob);
    form.append('type', 'BACK_HASH');
    const raw = await network().post<{ data: { url?: string } | string }>(
      '/upload/avatar',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        noRetry: true,
      },
    );
    const url =
      typeof raw.data === 'string' ? raw.data : (raw.data?.url ?? '');
    return { url };
  },

  /**
   * GET /partner/user/find?email=... — lookup user by email (e.g. transfer recipient).
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const raw = await network().get<{ data: unknown }>('/partner/user/find', {
      params: { email: email.trim().toLowerCase() },
    });
    return raw.data ? normalizeUser(raw.data) : null;
  },
};
