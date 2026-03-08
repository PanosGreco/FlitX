import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// EN
import enCommon from './locales/en/common.json';
import enFleet from './locales/en/fleet.json';
import enFinance from './locales/en/finance.json';
import enProfile from './locales/en/profile.json';
import enAuth from './locales/en/auth.json';
import enAi from './locales/en/ai.json';
import enHome from './locales/en/home.json';
import enTracking from './locales/en/tracking.json';
import enDailyProgram from './locales/en/dailyProgram.json';

// EL
import elCommon from './locales/el/common.json';
import elFleet from './locales/el/fleet.json';
import elFinance from './locales/el/finance.json';
import elProfile from './locales/el/profile.json';
import elAuth from './locales/el/auth.json';
import elAi from './locales/el/ai.json';
import elHome from './locales/el/home.json';
import elTracking from './locales/el/tracking.json';
import elDailyProgram from './locales/el/dailyProgram.json';

// IT
import itCommon from './locales/it/common.json';
import itAi from './locales/it/ai.json';

// ES
import esCommon from './locales/es/common.json';
import esAi from './locales/es/ai.json';

// DE
import deCommon from './locales/de/common.json';
import deAi from './locales/de/ai.json';

// FR
import frCommon from './locales/fr/common.json';
import frAi from './locales/fr/ai.json';

export const SUPPORTED_LANGUAGES = ['en', 'el', 'it', 'es', 'de', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  el: 'Ελληνικά',
  it: 'Italiano',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
};

export const COUNTRY_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  greece: 'el',
  italy: 'it',
  spain: 'es',
  germany: 'de',
  france: 'fr',
};

const resources = {
  en: { common: enCommon, fleet: enFleet, finance: enFinance, profile: enProfile, auth: enAuth, ai: enAi, home: enHome, tracking: enTracking, dailyProgram: enDailyProgram },
  el: { common: elCommon, fleet: elFleet, finance: elFinance, profile: elProfile, auth: elAuth, ai: elAi, home: elHome, tracking: elTracking, dailyProgram: elDailyProgram },
  it: { common: itCommon, ai: itAi },
  es: { common: esCommon, ai: esAi },
  de: { common: deCommon, ai: deAi },
  fr: { common: frCommon, ai: frAi },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'fleet', 'finance', 'profile', 'auth', 'ai', 'home', 'tracking', 'dailyProgram'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
