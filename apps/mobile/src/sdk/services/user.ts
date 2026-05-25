/**
 * apps/mobile/src/sdk/services/user.ts
 *
 * Auth + user profile service. Consumer sees CLEAN shape (camelCase, flat role).
 * Internal: legacy backend shape (snake_case, nested role, query params).
 *
 * Source: 01-ba-prd-overview.md Normalization Mapping Table.
 */
import { network } from '../core';
import type { LoginResponse, User } from '../models';
import { normalizeLoginResponse, normalizeUser } from '../normalize/auth';

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

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  address?: string;
  avatar?: string | null;
  locale?: 'vi' | 'en' | 'de';
}

/**
 * Legacy backend login response shape. Internal only — do NOT export.
 * Note backend typo: `access_token`, `user_id`, `role: { id, name }`.
 */
interface LegacyLoginResponse {
  user_id: number;
  access_token: string;
  refresh_token?: string;
  role: {
    id: number;
    name: string;
    newRolePermissions?: unknown[];
  };
  email: string | null;
  username: string;
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
   * POST /auth/google/login — backend expects `?token=...` query param,
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
   * POST /register — `fullName` renamed to `name` for backend.
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
   * POST /forgot?email=... — backend uses query param. SDK converts.
   */
  async forgot(input: { email: string }): Promise<void> {
    await network().post('/forgot', null, {
      params: { email: input.email.trim().toLowerCase() },
    });
  },

  /**
   * POST /reset — renames camelCase → snake_case for backend.
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
   * POST /logout — invalidate session on backend.
   */
  async logout(): Promise<void> {
    await network().post('/logout');
  },

  /**
   * GET /users/user-info — current user profile.
   */
  async getUserInfo(): Promise<User> {
    const raw = await network().get<{ data: unknown }>('/users/user-info');
    return normalizeUser(raw.data);
  },

  /**
   * PUT /users/:id — update profile.
   * TODO: confirm backend accepts camelCase or requires snake_case here.
   */
  async updateUserInfo(userId: string, input: UpdateUserInput): Promise<User> {
    // TODO: map clean shape → legacy backend shape when backend confirmed
    const raw = await network().put<{ data: unknown }>(`/users/${userId}`, input);
    return normalizeUser(raw.data);
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
