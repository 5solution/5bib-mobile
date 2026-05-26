/**
 * apps/mobile/src/sdk/services/request.ts
 *
 * DNF / refund / racekit-pickup request service.
 *
 * Source: docs/API_REFERENCE.md "EPIC-7 Metadata + Config" request section.
 */
import { network } from '../core';

export type RequestType = 'DNF' | 'REFUND' | 'OTHER';

export interface ReportDnfInput {
  bib: string;
  courseId: string;
  description: string;
  proofImages?: string[];
  requestType: RequestType;
}

export const request = {
  /**
   * POST /request/report — submit DNF / refund / other race-day report.
   * Body fields are snake_case. `proof_images` is array of pre-uploaded URLs
   * (use `upload.uploadImage` first to get URLs).
   */
  async reportDnf(input: ReportDnfInput): Promise<void> {
    await network().post(
      '/request/report',
      {
        bib: input.bib,
        course_id: Number(input.courseId),
        description: input.description,
        proof_images: input.proofImages ?? [],
        request_type: input.requestType,
      },
      { noRetry: true },
    );
  },

  /**
   * GET /request/racekit/check?code_value=X — check racekit pickup status.
   * Returns the backend's status enum (TBD exact values — probe live).
   */
  async checkRacekitPickup(codeValue: string): Promise<{ status: string }> {
    const raw = await network().get<{
      data: { status?: string } | string;
    }>('/request/racekit/check', { params: { code_value: codeValue } });
    const data = raw.data;
    const status = typeof data === 'string' ? data : (data?.status ?? 'UNKNOWN');
    return { status };
  },
};
