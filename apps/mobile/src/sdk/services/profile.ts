/**
 * apps/mobile/src/sdk/services/profile.ts
 *
 * Profile (saved persona) service. Lets a user save reusable athlete personas
 * (family members, kids) for quick-fill across race registrations.
 *
 * ⚠️ NOT the same as user account! `deleteProfile` removes only one persona,
 *    `user.deleteAccount` is the HARD account-delete (see services/user.ts).
 *
 * Source: docs/API_REFERENCE.md "EPIC-4 Tickets / BIB / Athlete"
 *         (profile/* sub-endpoints).
 */
import { network } from '../core';
import type { Profile } from '../models';

export interface CreateProfileInput {
  name: string;
  email: string;
  phoneNumber?: string;
  /** Free-form extra fields (e.g. medical info, BIB preferences). */
  detail?: Record<string, unknown>;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phoneNumber?: string;
  detail?: Record<string, unknown>;
}

function normalizeProfile(raw: unknown): Profile {
  const r = (raw ?? {}) as Record<string, unknown>;
  let detail: Profile['detail'];
  const rawDetail = r.detail;
  if (typeof rawDetail === 'string') {
    try {
      detail = JSON.parse(rawDetail) as Record<string, unknown>;
    } catch {
      detail = rawDetail;
    }
  } else if (rawDetail && typeof rawDetail === 'object') {
    detail = rawDetail as Record<string, unknown>;
  }

  return {
    id: String(r.id ?? r.profile_id ?? ''),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    phoneNumber:
      (r.phone_number as string | undefined) ??
      (r.phoneNumber as string | undefined),
    detail,
  };
}

/** Clean input → backend body (stringify detail JSON, snake-case phone). */
function toLegacyProfile(
  input: CreateProfileInput | UpdateProfileInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.email !== undefined) out.email = input.email.trim().toLowerCase();
  if (input.phoneNumber !== undefined) out.phone_number = input.phoneNumber;
  if (input.detail !== undefined) {
    out.detail =
      typeof input.detail === 'string'
        ? input.detail
        : JSON.stringify(input.detail);
  }
  return out;
}

export const profile = {
  /**
   * POST /profile/create — create a new saved athlete persona.
   */
  async createProfile(input: CreateProfileInput): Promise<Profile> {
    const raw = await network().post<{ data: unknown }>(
      '/profile/create',
      toLegacyProfile(input),
      { noRetry: true },
    );
    return normalizeProfile(raw.data);
  },

  /**
   * GET /profile/find — list current user's saved profiles.
   */
  async findMyProfiles(): Promise<Profile[]> {
    const raw = await network().get<{ data: unknown[] | { list?: unknown[] } }>(
      '/profile/find',
    );
    const list = Array.isArray(raw.data) ? raw.data : (raw.data?.list ?? []);
    return list.map(normalizeProfile);
  },

  /**
   * PUT /profile/update?profile_id=X — update a specific persona.
   */
  async updateProfile(
    profileId: string,
    input: UpdateProfileInput,
  ): Promise<Profile> {
    const raw = await network().put<{ data: unknown }>(
      '/profile/update',
      toLegacyProfile(input),
      { params: { profile_id: profileId }, noRetry: true },
    );
    return normalizeProfile(raw.data);
  },

  /**
   * DELETE /profile/delete?profile_id=X — delete a saved persona.
   * ⚠️ NOT the same as `user.deleteAccount` (which removes user account).
   */
  async deleteProfile(profileId: string): Promise<void> {
    await network().delete('/profile/delete', undefined, {
      params: { profile_id: profileId },
      noRetry: true,
    });
  },
};
