/**
 * Usage-Based Depreciation Calculation Utility
 * 
 * Calculates vehicle depreciation based on time elapsed and EXCESS mileage
 * using an industry-aligned tiered model. Mileage only penalizes above-average usage.
 */

export interface DepreciationInputs {
  marketValueAtPurchase: number;  // Realistic market value when acquired
  purchaseDate: Date | string | null;
  currentMileage: number;
  initialMileage: number;
  vehicleType?: 'car' | 'motorbike' | 'boat' | 'atv';
}

export interface DepreciationResult {
  totalDepreciation: number;
  timeDepreciation: number;
  mileageDepreciation: number;
  estimatedCurrentValue: number;
  depreciationPercentage: number;
  yearsOwned: number;
  milesDriven: number;
  timeDepreciationShare: number;  // Percentage of total from time
  mileageDepreciationShare: number;  // Percentage of total from mileage
  excessMileage: number;  // Only the km above expected
  expectedMileage: number;  // Expected km based on years owned
}

// Tiered annual depreciation rates (industry-aligned)
const TIME_DEPRECIATION_TIERS = [
  { year: 1, rate: 0.18 },  // Year 1: 18%
  { year: 2, rate: 0.12 },  // Year 2: 12%
  { year: 3, rate: 0.10 },  // Year 3: 10%
  { year: 4, rate: 0.08 },  // Year 4: 8%
];
const LATER_YEAR_RATE = 0.06;  // Year 5+: 6% per year

// Maximum time-based depreciation (prevents runaway for old vehicles)
const MAX_TIME_DEPRECIATION_PERCENTAGE = 0.65;  // 65% max from time alone

// Average annual mileage by vehicle type (km/year)
const AVERAGE_ANNUAL_MILEAGE: Record<string, number> = {
  car: 12000,       // 12,000 km/year
  motorbike: 6000,  // 6,000 km/year
  boat: 2000,       // 2,000 km/year (proxy)
  atv: 4000,        // 4,000 km/year
};

// Depreciation per EXCESS km by vehicle type (€)
// Only applies to mileage above expected average
const DEPRECIATION_PER_KM: Record<string, number> = {
  car: 0.04,       // €0.04 per excess km
  motorbike: 0.025, // €0.025 per excess km
  boat: 0.015,     // €0.015 per excess km
  atv: 0.03,       // €0.03 per excess km
};

const MINIMUM_RESIDUAL_PERCENTAGE = 0.20; // 20% floor value

/**
 * Calculate tiered time-based depreciation with 65% cap
 */
function calculateTimeDepreciation(marketValue: number, yearsOwned: number): number {
  let depreciation = 0;
  let remainingYears = yearsOwned;

  // Apply tiered rates for first 4 years
  for (const tier of TIME_DEPRECIATION_TIERS) {
    if (remainingYears <= 0) break;
    const portion = Math.min(1, remainingYears);
    depreciation += marketValue * tier.rate * portion;
    remainingYears -= 1;
  }

  // Years 5+: constant 6% per year
  if (remainingYears > 0) {
    depreciation += marketValue * LATER_YEAR_RATE * remainingYears;
  }

  // Cap time depreciation at 65% of market value
  const maxTimeDepreciation = marketValue * MAX_TIME_DEPRECIATION_PERCENTAGE;
  return Math.min(depreciation, maxTimeDepreciation);
}

/**
 * Calculate usage-based depreciation for a vehicle
 * Uses excess-mileage model: only penalizes km above average annual usage
 */
export function calculateUsageDepreciation(inputs: DepreciationInputs): DepreciationResult | null {
  const { marketValueAtPurchase, purchaseDate, currentMileage, initialMileage, vehicleType = 'car' } = inputs;

  // Validate required inputs
  if (!marketValueAtPurchase || marketValueAtPurchase <= 0) {
    return null;
  }

  // Calculate years since purchase
  let yearsOwned = 0;
  if (purchaseDate) {
    const purchaseDateObj = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate;
    const now = new Date();
    const diffMs = now.getTime() - purchaseDateObj.getTime();
    yearsOwned = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));
  }

  // Calculate mileage driven since purchase (protect against negative values)
  const milesDriven = Math.max(0, currentMileage - initialMileage);

  // Time-based depreciation (tiered model with 65% cap)
  const timeDepreciation = calculateTimeDepreciation(marketValueAtPurchase, yearsOwned);

  // Excess-mileage depreciation model:
  // Only penalize km ABOVE the expected average for the ownership period
  const averageAnnualKm = AVERAGE_ANNUAL_MILEAGE[vehicleType] ?? AVERAGE_ANNUAL_MILEAGE.car;
  const expectedMileage = yearsOwned * averageAnnualKm;
  const excessMileage = Math.max(0, milesDriven - expectedMileage);
  
  const ratePerKm = DEPRECIATION_PER_KM[vehicleType] ?? DEPRECIATION_PER_KM.car;
  const mileageDepreciation = excessMileage * ratePerKm;

  // Additive combination: time + excess mileage penalty
  const rawTotalDepreciation = timeDepreciation + mileageDepreciation;

  // Calculate floor value (minimum residual)
  const floorValue = marketValueAtPurchase * MINIMUM_RESIDUAL_PERCENTAGE;

  // Estimated current value with floor protection
  const rawCurrentValue = marketValueAtPurchase - rawTotalDepreciation;
  const estimatedCurrentValue = Math.max(rawCurrentValue, floorValue);

  // Actual depreciation respecting the floor
  const totalDepreciation = marketValueAtPurchase - estimatedCurrentValue;

  // Depreciation percentage
  const depreciationPercentage = (totalDepreciation / marketValueAtPurchase) * 100;

  // Calculate shares for breakdown display
  const totalRaw = timeDepreciation + mileageDepreciation;
  const timeDepreciationShare = totalRaw > 0 ? (timeDepreciation / totalRaw) * 100 : 0;
  const mileageDepreciationShare = totalRaw > 0 ? (mileageDepreciation / totalRaw) * 100 : 0;

  return {
    totalDepreciation,
    timeDepreciation,
    mileageDepreciation,
    estimatedCurrentValue,
    depreciationPercentage,
    yearsOwned,
    milesDriven,
    timeDepreciationShare,
    mileageDepreciationShare,
    excessMileage,
    expectedMileage,
  };
}

/**
 * Format years as a human-readable string
 */
export function formatYearsOwned(years: number, language: string = 'en'): string {
  if (years < 1 / 12) {
    return language === 'el' ? '< 1 μήνας' : '< 1 month';
  }
  if (years < 1) {
    const months = Math.round(years * 12);
    return language === 'el' ? `${months} μήνες` : `${months} month${months !== 1 ? 's' : ''}`;
  }
  const wholeYears = Math.floor(years);
  const remainingMonths = Math.round((years - wholeYears) * 12);
  
  if (remainingMonths === 0) {
    return language === 'el' ? `${wholeYears} έτη` : `${wholeYears} yr${wholeYears !== 1 ? 's' : ''}`;
  }
  
  if (language === 'el') {
    return `${wholeYears} έτη, ${remainingMonths} μήνες`;
  }
  return `${wholeYears} yr${wholeYears !== 1 ? 's' : ''}, ${remainingMonths} mo`;
}
