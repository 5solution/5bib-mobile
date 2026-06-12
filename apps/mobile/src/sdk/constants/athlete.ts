/**
 * apps/mobile/src/sdk/constants/athlete.ts
 *
 * Shared athlete-form option sets (web parity:
 * selling-web src/services/athlete/useAthleteField.tsx).
 */

/**
 * Fallback shirt-size list when the race has no
 * `race_extenstion.t_shirt_sizes` configured — verbatim web `optionsSize`.
 */
export const DEFAULT_TSHIRT_SIZES: ReadonlyArray<string> = [
  '3XL',
  '2XL',
  'XL',
  'L',
  'M',
  'S',
  'XS',
  'XXS',
  '15T',
  '13T',
  '11T',
  '9T',
  '7T',
  '5T',
  '3T',
];

/**
 * Guardian relation options. VALUES are the Vietnamese strings the backend
 * stores (web sends `guardian_relation.value` verbatim); labels are web's
 * bilingual strings so every locale can read them without extra i18n keys.
 */
export const GUARDIAN_RELATIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: 'Bố', label: 'Bố/Father' },
  { value: 'Mẹ', label: 'Mẹ/Mother' },
  { value: 'Cô/Dì', label: 'Cô/Dì/Aunt' },
  { value: 'Chú', label: 'Chú/Uncle' },
  { value: 'Bác', label: 'Bác/Uncle' },
  { value: 'Người bảo hộ', label: 'Người bảo hộ/Guardian' },
  { value: 'Anh/chị', label: 'Anh/chị/Sibling' },
];
