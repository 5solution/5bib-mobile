/**
 * apps/mobile/src/sdk/services/province.ts
 *
 * VN province / district / ward lookup. Uses BACKEND's own endpoints,
 * NOT external `provinces.open-api.vn` (which selling-web uses) — backend
 * cache is faster and removes external dependency.
 *
 * Source: docs/API_REFERENCE.md "EPIC-7 Metadata + Config" provinces section.
 */
import { network } from '../core';
import type { District, Province, Ward } from '../models';

function toProvince(raw: unknown): Province {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(r.name ?? r.province ?? ''),
    code: r.code != null ? String(r.code) : undefined,
  };
}

function toDistrict(raw: unknown): District {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(r.name ?? r.district ?? ''),
    code: r.code != null ? String(r.code) : undefined,
    province: (r.province as string | undefined) ?? undefined,
  };
}

function toWard(raw: unknown): Ward {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(r.name ?? r.ward ?? ''),
    code: r.code != null ? String(r.code) : undefined,
    district: r.district as string | undefined,
    province: r.province as string | undefined,
  };
}

/** Unwrap list payload — backend uses array OR `{list: [...]}`. */
function unwrapList(data: unknown[] | { list?: unknown[] } | undefined): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.list ?? [];
}

export const province = {
  /** GET /province — all VN provinces. */
  async listProvinces(): Promise<Province[]> {
    const raw = await network().get<{
      data: unknown[] | { list?: unknown[] };
    }>('/province');
    return unwrapList(raw.data).map(toProvince);
  },

  /** GET /province/district?province=Tỉnh+X — districts of a province. */
  async listDistricts(provinceName: string): Promise<District[]> {
    const raw = await network().get<{
      data: unknown[] | { list?: unknown[] };
    }>('/province/district', { params: { province: provinceName } });
    return unwrapList(raw.data).map(toDistrict);
  },

  /** GET /province/v2/ward?province=Tỉnh+X — wards (v2 = newer enum). */
  async listWards(provinceName: string): Promise<Ward[]> {
    const raw = await network().get<{
      data: unknown[] | { list?: unknown[] };
    }>('/province/v2/ward', { params: { province: provinceName } });
    return unwrapList(raw.data).map(toWard);
  },

  /** GET /province/detail?province=Tỉnh+X — full province metadata. */
  async getProvinceDetail(provinceName: string): Promise<unknown> {
    const raw = await network().get<{ data: unknown }>('/province/detail', {
      params: { province: provinceName },
    });
    return raw.data;
  },
};
