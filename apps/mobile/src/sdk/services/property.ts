/**
 * apps/mobile/src/sdk/services/property.ts
 *
 * App config / feature flag service via backend `/props/by-key`.
 *
 * Source: docs/API_REFERENCE.md "EPIC-7 Metadata + Config".
 *
 * Suggested keys to probe (backend has no list — try and see):
 *   - `mobile_min_version_ios`, `mobile_min_version_android` (force update)
 *   - `mobile_maintenance_mode` (bool)
 *   - `mobile_feature_flags` (JSON)
 *   - `tnc_url`, `privacy_url` (legal page links)
 *
 * ⚠️ Backend returns error code `1958323296` "No key" when key not found
 *    (200 status + success:false). We treat that as null (key doesn't exist).
 */
import { FetcherError, network } from '../core';

/** Backend's "no such key" error code from API_REFERENCE. */
const NO_KEY_ERROR_CODE = 1958323296;

export interface PropertyResponse<T = unknown> {
  /** The raw value (string / number / bool / parsed-JSON). */
  value: T;
}

/** Try to parse JSON; return original on parse failure. */
function tryParseJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export const property = {
  /**
   * GET /props/by-key?key=X — fetch a property value.
   * Returns `null` if the key doesn't exist (backend `No key` error code).
   *
   * Auto JSON-parses string values when possible (so callers handling
   * `mobile_feature_flags: '{"a":true}'` get the parsed object back).
   */
  async getProp<T = unknown>(key: string): Promise<PropertyResponse<T> | null> {
    try {
      const raw = await network().get<{
        data?: unknown;
        success?: boolean;
        error?: { code?: number; message?: string };
      }>('/props/by-key', { params: { key }, noRetry: true });

      if (raw.success === false) {
        if (raw.error?.code === NO_KEY_ERROR_CODE) return null;
        // Other business error — return null to keep the API simple
        return null;
      }
      if (raw.data === undefined || raw.data === null) return null;
      return { value: tryParseJson(raw.data) as T };
    } catch (err) {
      // Backend `No key` may also surface as a 4xx FetcherError
      if (err instanceof FetcherError) {
        const body = err.response as
          | { error?: { code?: number } }
          | undefined;
        if (body?.error?.code === NO_KEY_ERROR_CODE) return null;
      }
      throw err;
    }
  },
};
