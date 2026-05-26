/**
 * apps/mobile/src/sdk/services/upload.ts
 *
 * File upload service (multipart/form-data).
 * Mobile passes RN file blob: `{ uri, name, type }` (NOT browser `File`).
 *
 * Source: docs/API_REFERENCE.md "EPIC-7 Metadata + Config" (upload sub-endpoints).
 *
 * NOTE: `uploadAvatar` lives on `user` service (services/user.ts) per P0
 * scope — because it carries the `type=BACK_HASH` form field + the
 * post-upload `updateUserInfo` chain.
 *
 * Two clients here:
 *   - `network()` (core Fetcher) for endpoints that need bearer auth
 *   - `initUploadClient(...)` (separate axios) preserved for legacy callers
 *     who want a longer 30s timeout + different defaults
 */
import axios, { AxiosInstance } from 'axios';
import { network } from '../core';

/** File descriptor accepted from RN (expo-image-picker / expo-document-picker). */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

let uploadClient: AxiosInstance | null = null;

/**
 * Initialize the multipart client. Optional — only needed if caller wants the
 * legacy 30s-timeout axios path. Most callers should use `upload.*` methods
 * which go through the core Fetcher.
 */
export function initUploadClient(baseURL: string): AxiosInstance {
  uploadClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return uploadClient;
}

/** Build a FormData for RN multipart upload. */
function buildForm(file: UploadFile, extraFields?: Record<string, string>): FormData {
  const form = new FormData();
  // RN FormData accepts the `{ uri, name, type }` object directly
  form.append('file', file as unknown as Blob);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      form.append(k, v);
    }
  }
  return form;
}

/** Pluck URL from the various response envelopes backend returns. */
function pickUrl(data: { url?: string } | string | undefined): string {
  if (typeof data === 'string') return data;
  return data?.url ?? '';
}

export const upload = {
  /**
   * POST /upload/free — anonymous upload (e.g. waiver signature).
   * Returns the uploaded file URL.
   */
  async uploadFree(file: UploadFile): Promise<{ url: string }> {
    const raw = await network().post<{ data: { url?: string } | string }>(
      '/upload/free',
      buildForm(file),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        noRetry: true,
      },
    );
    return { url: pickUrl(raw.data) };
  },

  /**
   * POST /upload/image — generic image upload (with backend processing).
   */
  async uploadImage(file: UploadFile): Promise<{ url: string }> {
    const raw = await network().post<{ data: { url?: string } | string }>(
      '/upload/image',
      buildForm(file),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        noRetry: true,
      },
    );
    return { url: pickUrl(raw.data) };
  },

  /**
   * POST /upload/image/url-decode — upload an image from base64 string.
   * Payload: `{ image: "<base64>" }` (assumed — probe live to confirm field name).
   */
  async uploadImageBase64(base64: string): Promise<{ url: string }> {
    const raw = await network().post<{ data: { url?: string } | string }>(
      '/upload/image/url-decode',
      { image: base64 },
      { noRetry: true },
    );
    return { url: pickUrl(raw.data) };
  },

  /**
   * POST /upload/id_card_image — KYC ID document upload.
   */
  async uploadIdCard(file: UploadFile): Promise<{ url: string }> {
    const raw = await network().post<{ data: { url?: string } | string }>(
      '/upload/id_card_image',
      buildForm(file),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        noRetry: true,
      },
    );
    return { url: pickUrl(raw.data) };
  },
};
