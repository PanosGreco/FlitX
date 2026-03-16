import { enUS, el, it, es, de, fr } from "date-fns/locale";
import type { Locale } from "date-fns";

/**
 * Shared locale mapping for the entire application.
 * Used by date-fns formatting and toLocaleString/toLocaleDateString calls.
 */

// date-fns Locale objects
export const DATE_FNS_LOCALES: Record<string, Locale> = {
  en: enUS,
  el: el,
  it: it,
  es: es,
  de: de,
  fr: fr,
};

export function getDateFnsLocale(language: string): Locale {
  return DATE_FNS_LOCALES[language] || enUS;
}

// BCP 47 locale tags for toLocaleString / toLocaleDateString
export const BCP47_LOCALES: Record<string, string> = {
  en: 'en-GB',   // European format
  el: 'el-GR',
  it: 'it-IT',
  es: 'es-ES',
  de: 'de-DE',
  fr: 'fr-FR',
};

export function getBcp47Locale(language: string): string {
  return BCP47_LOCALES[language] || 'en-GB';
}

/**
 * Format a number as Euro currency string: €1.234,56
 */
export function formatEuroCurrency(value: number, language: string = 'en'): string {
  return `€${value.toLocaleString(getBcp47Locale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
