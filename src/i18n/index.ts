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
import itFleet from './locales/it/fleet.json';
import itFinance from './locales/it/finance.json';
import itHome from './locales/it/home.json';
import itDailyProgram from './locales/it/dailyProgram.json';
import itAuth from './locales/it/auth.json';
import itProfile from './locales/it/profile.json';
import itTracking from './locales/it/tracking.json';

// ES
import esCommon from './locales/es/common.json';
import esAi from './locales/es/ai.json';
import esFleet from './locales/es/fleet.json';
import esFinance from './locales/es/finance.json';
import esHome from './locales/es/home.json';
import esDailyProgram from './locales/es/dailyProgram.json';
import esAuth from './locales/es/auth.json';
import esProfile from './locales/es/profile.json';
import esTracking from './locales/es/tracking.json';

// DE
import deCommon from './locales/de/common.json';
import deAi from './locales/de/ai.json';
import deFleet from './locales/de/fleet.json';
import deFinance from './locales/de/finance.json';
import deHome from './locales/de/home.json';
import deDailyProgram from './locales/de/dailyProgram.json';
import deAuth from './locales/de/auth.json';
import deProfile from './locales/de/profile.json';
import deTracking from './locales/de/tracking.json';

// FR
import frCommon from './locales/fr/common.json';
import frAi from './locales/fr/ai.json';
import frFleet from './locales/fr/fleet.json';
import frFinance from './locales/fr/finance.json';
import frHome from './locales/fr/home.json';
import frDailyProgram from './locales/fr/dailyProgram.json';
import frAuth from './locales/fr/auth.json';
import frProfile from './locales/fr/profile.json';
import frTracking from './locales/fr/tracking.json';

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
  it: { common: itCommon, ai: itAi, fleet: itFleet, finance: itFinance, home: itHome, dailyProgram: itDailyProgram, auth: itAuth, profile: itProfile, tracking: itTracking },
  es: { common: esCommon, ai: esAi, fleet: esFleet, finance: esFinance, home: esHome, dailyProgram: esDailyProgram, auth: esAuth, profile: esProfile, tracking: esTracking },
  de: { common: deCommon, ai: deAi, fleet: deFleet, finance: deFinance, home: deHome, dailyProgram: deDailyProgram, auth: deAuth, profile: deProfile, tracking: deTracking },
  fr: { common: frCommon, ai: frAi, fleet: frFleet, finance: frFinance, home: frHome, dailyProgram: frDailyProgram, auth: frAuth, profile: frProfile, tracking: frTracking },
};

export const ALL_NAMESPACES = ['common', 'fleet', 'finance', 'profile', 'auth', 'ai', 'home', 'tracking', 'dailyProgram'] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...ALL_NAMESPACES],
    fallbackNS: [...ALL_NAMESPACES],
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
