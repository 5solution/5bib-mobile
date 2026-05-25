/**
 * apps/mobile/src/sdk/services/upload.ts
 *
 * File upload service (multipart/form-data).
 * Mobile passes RN file blob: `{ uri, name, type }` — different from web `File`.
 *
 * TODO: confirm multipart payload format for RN with expo-image-picker output.
 */
import axios, { AxiosInstance } from 'axios';

/** File descriptor accepted from RN (expo-image-picker / expo-document-picker). */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

let uploadClient: AxiosInstance | null = null;

/**
 * Initialize the multipart client. Called from `sdk-init.ts`.
 * Separate from core Fetcher because content-type and timeout differ.
 */
export function initUploadClient(baseURL: string): AxiosInstance {
  uploadClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return uploadClient;
}

function client(): AxiosInstance {
  if (!uploadClient) {
    throw new Error(
      '[@5bib/sdk] Upload client not initialized. Call initUploadClient() at startup.',
    );
  }
  return uploadClient;
}

export const upload = {
  /**
   * POST /upload/avatar — authenticated avatar upload.
   * Returns the uploaded file URL.
   */
  async uploadAvatar(input: {
    file: UploadFile;
    token: string;
  }): Promise<string> {
    const form = new FormData();
    // RN FormData accepts the `{ uri, name, type }` object directly
    form.append('file', input.file as unknown as Blob);
    const res = await client().post<{ data: string }>('/upload/avatar', form, {
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  /**
   * POST /upload/free — anonymous upload (e.g. signature image).
   */
  async uploadFree(file: UploadFile): Promise<string> {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    const res = await client().post<{ data: string }>('/upload/free', form);
    return res.data.data;
  },
};
