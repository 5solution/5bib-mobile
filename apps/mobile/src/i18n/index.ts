/**
 * apps/mobile/src/i18n/index.ts
 *
 * i18n setup — react-i18next with vi/en/de.
 * Default locale = device locale, fallback `vi` (BR-GLOBAL-01).
 * Per BR-AUTH-14: language change requires soft restart (clear nav stack).
 *
 * NOTE: `intl-pluralrules` polyfill MUST import before i18next init.
 * Hermes (RN) ships without full Intl.PluralRules; without the polyfill
 * `compatibilityJSON: 'v4'` falls back silently to v3 plural handling and logs
 *   "i18next::pluralResolver: Your environment seems not to be Intl API
 *    compatible..."
 * Polyfill side-effect import is intentionally BEFORE `i18next`.
 */

import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import vi from './locales/vi.json';
import en from './locales/en.json';
import de from './locales/de.json';

export const SUPPORTED_LOCALES = ['vi', 'en', 'de'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

function resolveInitialLocale(): Locale {
  const device = Localization.getLocales()[0]?.languageCode ?? 'vi';
  if ((SUPPORTED_LOCALES as readonly string[]).includes(device)) return device as Locale;
  return 'vi';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
      de: { translation: de },
    },
    lng: resolveInitialLocale(),
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });

export default i18n;
