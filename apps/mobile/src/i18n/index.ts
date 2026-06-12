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
import AsyncStorage from '@react-native-async-storage/async-storage';

import vi from './locales/vi.json';
import en from './locales/en.json';
import de from './locales/de.json';

export const SUPPORTED_LOCALES = ['vi', 'en', 'de'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_STORAGE_KEY = '5bib.locale';

function resolveInitialLocale(): Locale {
  const device = Localization.getLocales()[0]?.languageCode ?? 'vi';
  if ((SUPPORTED_LOCALES as readonly string[]).includes(device)) return device as Locale;
  return 'vi';
}

/**
 * User-chosen locale — persists across launches and wins over the device
 * locale. Wires the previously no-op language switcher (profile row).
 */
export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // persistence is best-effort — the in-session switch already happened
  }
}

/** Apply a previously persisted locale choice (called once at startup). */
export async function restorePersistedLocale(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (
      saved &&
      (SUPPORTED_LOCALES as readonly string[]).includes(saved) &&
      saved !== i18n.language
    ) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    // fall back to device locale silently
  }
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
