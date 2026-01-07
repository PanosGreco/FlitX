import { startOfWeek, startOfMonth, startOfYear, endOfDay } from "date-fns";

export type TimeframeType = 'week' | 'month' | 'year' | 'all' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get calendar-based date ranges (not rolling windows)
 * - This Week: From Monday of the current week until today
 * - This Month: From the 1st day of the current month until today
 * - This Year: From January 1st until today
 * - All Time: All records (no filter)
 */
export const getCalendarDateRange = (timeframe: TimeframeType, customRange?: DateRange): DateRange => {
  const now = new Date();
  const endDate = endOfDay(now);
  
  switch (timeframe) {
    case 'week':
      // From Monday of current week until today
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }), // 1 = Monday
        endDate
      };
    case 'month':
      // From 1st of current month until today
      return {
        startDate: startOfMonth(now),
        endDate
      };
    case 'year':
      // From January 1st until today
      return {
        startDate: startOfYear(now),
        endDate
      };
    case 'all':
      // All time - use a very old date
      return {
        startDate: new Date(2000, 0, 1),
        endDate
      };
    case 'custom':
      if (customRange) {
        return customRange;
      }
      // Fallback to this month
      return {
        startDate: startOfMonth(now),
        endDate
      };
    default:
      return {
        startDate: startOfMonth(now),
        endDate
      };
  }
};

/**
 * Filter records by calendar-based timeframe
 */
export const filterByCalendarTimeframe = <T extends { date: string }>(
  records: T[],
  timeframe: TimeframeType,
  customRange?: DateRange
): T[] => {
  if (timeframe === 'all') {
    return records;
  }
  
  const { startDate, endDate } = getCalendarDateRange(timeframe, customRange);
  
  return records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= endDate;
  });
};

export const TIMEFRAME_LABELS: Record<TimeframeType, { en: string; el: string }> = {
  week: { en: "This Week", el: "Αυτή η Εβδομάδα" },
  month: { en: "This Month", el: "Αυτός ο Μήνας" },
  year: { en: "This Year", el: "Αυτό το Έτος" },
  all: { en: "All Time", el: "Όλα" },
  custom: { en: "Custom Range", el: "Προσαρμοσμένο" },
};
