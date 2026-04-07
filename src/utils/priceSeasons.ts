export interface PriceSeason {
  id: string;
  name: string;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
  mode: 'automatic' | 'manual';
  is_active: boolean;
}

export interface PriceSeasonRule {
  id: string;
  season_id: string;
  scope: 'category' | 'vehicle';
  vehicle_category: string | null;
  vehicle_id: string | null;
  adjustment_type: 'percentage' | 'fixed' | 'absolute';
  adjustment_value: number;
}

/**
 * Check if a given date falls within a season's month/day range.
 * Handles cross-year ranges (e.g., Nov 15 to Feb 28).
 */
export function isDateInSeason(date: Date, season: PriceSeason): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const startVal = season.start_month * 100 + season.start_day;
  const endVal = season.end_month * 100 + season.end_day;
  const dateVal = month * 100 + day;

  if (startVal <= endVal) {
    return dateVal >= startVal && dateVal <= endVal;
  } else {
    return dateVal >= startVal || dateVal <= endVal;
  }
}

/**
 * Find all currently active seasons for a given date.
 */
export function getActiveSeasonsForDate(
  seasons: PriceSeason[],
  date: Date = new Date()
): PriceSeason[] {
  return seasons.filter(season => {
    if (!season.is_active) return false;
    if (season.mode === 'manual') return true;
    if (season.mode === 'automatic') return isDateInSeason(date, season);
    return false;
  });
}

/**
 * Calculate the effective daily rate for a vehicle considering active seasons.
 */
export function getEffectiveRate(
  baseDailyRate: number,
  vehicleId: string,
  vehicleCategory: string,
  activeSeasons: PriceSeason[],
  allRules: PriceSeasonRule[]
): { effectiveRate: number; adjustment: PriceSeasonRule | null; seasonName: string | null } {
  if (activeSeasons.length === 0) {
    return { effectiveRate: baseDailyRate, adjustment: null, seasonName: null };
  }

  for (const season of activeSeasons) {
    const seasonRules = allRules.filter(r => r.season_id === season.id);

    // Priority 1: Vehicle-specific override
    const vehicleRule = seasonRules.find(
      r => r.scope === 'vehicle' && r.vehicle_id === vehicleId
    );
    if (vehicleRule) {
      return {
        effectiveRate: applyAdjustment(baseDailyRate, vehicleRule),
        adjustment: vehicleRule,
        seasonName: season.name,
      };
    }

    // Priority 2: Category rule
    const categoryRule = seasonRules.find(
      r => r.scope === 'category' &&
           r.vehicle_category?.toLowerCase() === vehicleCategory?.toLowerCase()
    );
    if (categoryRule) {
      return {
        effectiveRate: applyAdjustment(baseDailyRate, categoryRule),
        adjustment: categoryRule,
        seasonName: season.name,
      };
    }
  }

  return { effectiveRate: baseDailyRate, adjustment: null, seasonName: null };
}

function applyAdjustment(baseRate: number, rule: PriceSeasonRule): number {
  switch (rule.adjustment_type) {
    case 'percentage':
      return Math.max(0, baseRate * (1 + rule.adjustment_value / 100));
    case 'fixed':
      return Math.max(0, baseRate + rule.adjustment_value);
    case 'absolute':
      return Math.max(0, rule.adjustment_value);
    default:
      return baseRate;
  }
}
