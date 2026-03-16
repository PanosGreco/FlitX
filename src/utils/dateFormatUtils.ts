import { format } from "date-fns";
import { getDateFnsLocale } from "./localeMap";

/**
 * Format a date to European format (DD/MM/YYYY)
 */
export function formatDateEuropean(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format a date with time in European format (24-hour)
 */
export function formatDateTimeEuropean(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm");
}

/**
 * Format a date in short European format (dd MMM yyyy)
 */
export function formatDateShortEuropean(date: Date | string, language: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy", { locale: getDateFnsLocale(language) });
}

/**
 * Format a date in long European format with locale support
 */
export function formatDateLongEuropean(date: Date | string, language: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMMM yyyy", { locale: getDateFnsLocale(language) });
}

/**
 * Format month and year
 */
export function formatMonthYear(date: Date | string, language: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMMM yyyy", { locale: getDateFnsLocale(language) });
}

/**
 * Format time in 24-hour format (HH:mm)
 */
export function formatTime24h(time: string | null): string | null {
  if (!time) return null;
  // If already in HH:mm format, return as is
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return time.substring(0, 5);
  }
  // Parse time string and format
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes?.padStart(2, '0') || '00'}`;
}

/**
 * Format time from Date object in 24-hour format
 */
export function formatTimeFrom24h(date: Date): string {
  return format(date, "HH:mm");
}
