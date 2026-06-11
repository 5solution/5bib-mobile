/**
 * apps/mobile/src/utils/date.ts
 *
 * Date-of-birth format helpers.
 *
 * Backend reality (verified live 2026-06-11 on /athlete/simple-edit):
 *   - The athlete-edit DTO deserializes `dob` as Java LocalDate with pattern
 *     dd/MM/yyyy. Sending ISO "1997-08-09" → 400 "could not be parsed at
 *     index 2". Web converts via formatDateToDDMMYYYY before every edit.
 *   - Stored `athlete_sub_info.dob` is a verbatim string, so records contain
 *     a MIX of "09/08/1997" (web-created) and "1997-08-09" (older mobile
 *     orders). Normalizers must tolerate both.
 *
 * Convention inside the app: keep dates ISO (YYYY-MM-DD) in state/models,
 * convert to DD/MM/YYYY only at the wire (and for display).
 */

const ISO_RX = /^(\d{4})-(\d{2})-(\d{2})/;
const DDMM_RX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Tolerant parse of either "YYYY-MM-DD" or "DD/MM/YYYY" → ISO, else ''. */
export function toIsoDate(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  const iso = ISO_RX.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dm = DDMM_RX.exec(v);
  if (dm) {
    const [, d, m, y] = dm;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  return '';
}

/** ISO (or DD/MM/YYYY passthrough) → "DD/MM/YYYY" for display + wire, else ''. */
export function toDDMMYYYY(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  if (DDMM_RX.test(v)) {
    // Re-pad to 2 digits for consistency.
    const [, d, m, y] = DDMM_RX.exec(v)!;
    return `${d!.padStart(2, '0')}/${m!.padStart(2, '0')}/${y}`;
  }
  const iso = ISO_RX.exec(v);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return '';
}
