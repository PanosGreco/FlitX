import { format } from "date-fns";
import { enUS, el } from "date-fns/locale";

/**
 * Format a date to European format (DD/MM/YYYY)
 */
export function formatDateEuropean(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format a date with time in European format
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
  return format(d, "dd MMM yyyy", { locale: language === "el" ? el : enUS });
}

/**
 * Format a date in long European format with locale support
 */
export function formatDateLongEuropean(date: Date | string, language: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMMM yyyy", { locale: language === "el" ? el : enUS });
}

/**
 * Format month and year
 */
export function formatMonthYear(date: Date | string, language: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMMM yyyy", { locale: language === "el" ? el : enUS });
}
