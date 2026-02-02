/**
 * Usage-Based Depreciation Calculation Utility
 * 
 * Calculates vehicle depreciation using:
 * - Vehicle age from MODEL YEAR (not purchase date) for time-based depreciation
 * - Cumulative curve lookup (not linear yearly sums)
 * - Two-tier mileage model: base rate for all km + excess penalty for above-average usage
 */

export interface DepreciationInputs {
  marketValueAtPurchase: number;       // Realistic market value when acquired
  vehicleModelYear: number;            // Vehicle's production/model year
  purchaseDate: Date | string | null;  // For ownership duration display
  currentMileage: number;
  initialMileage: number;
  vehicleType?: 'car' | 'motorbike' | 'boat' | 'atv';
}

export interface DepreciationResult {
  totalDepreciation: number;
  timeDepreciation: number;
  mileageDepreciation: number;
  baseMileageDepreciation: number;     // From all km driven
  excessMileageDepreciation: number;   // Extra penalty for above-average usage
  estimatedCurrentValue: number;
  depreciationPercentage: number;
  vehicleAge: number;                  // Years since model year
  yearsOwned: number;                  // For UI display
  milesDriven: number;
  expectedMileage: number;
  excessMileage: number;
  timeDepreciationShare: number;       // Percentage of total from time
  mileageDepreciationShare: number;    // Percentage of total from mileage
}

// Cumulative time-based depreciation curve (industry-aligned)
// Based on vehicle age from MODEL YEAR, not ownership
const TIME_DEPRECIATION_CURVE: Record<number, number> = {
  0: 0.00,    // Brand new
  1: 0.20,    // 1 year old: 20% lost
  2: 0.32,    // 2 years: 32% lost
  3: 0.42,    // 3 years: 42% lost
  4: 0.48,    // 4 years: 48% lost
  5: 0.52,    // 5 years: 52% lost
  6: 0.55,    // 6 years: 55% lost
  7: 0.58,    // 7 years: 58% lost
  8: 0.60,    // 8 years: 60% lost
  9: 0.62,    // 9 years: 62% lost
  10: 0.65,   // 10+ years: 65% cap
};

// Base mileage rate: ALL kilometers reduce value
const BASE_RATE_PER_KM: Record<string, number> = {
  car: 0.015,       // €0.015 per km (all usage)
  motorbike: 0.01,
  boat: 0.008,
  atv: 0.012,
};

// Excess mileage rate: additional penalty for above-average usage
const EXCESS_RATE_PER_KM: Record<string, number> = {
  car: 0.025,       // +€0.025 per excess km
  motorbike: 0.015,
  boat: 0.01,
  atv: 0.02,
};

// Average annual mileage by vehicle type (km/year)
const AVERAGE_ANNUAL_MILEAGE: Record<string, number> = {
  car: 12000,       // 12,000 km/year
  motorbike: 6000,  // 6,000 km/year
  boat: 2000,       // 2,000 km/year (proxy)
  atv: 4000,        // 4,000 km/year
};

const MINIMUM_RESIDUAL_PERCENTAGE = 0.20; // 20% floor value

/**
 * Calculate time-based depreciation using cumulative curve lookup.
 * Uses smooth interpolation for fractional years with damping.
 */
function calculateTimeDepreciation(marketValue: number, vehicleAge: number): number {
  // Cap at 10 years for curve lookup
  const cappedAge = Math.min(Math.max(0, vehicleAge), 10);
  
  const lowerYear = Math.floor(cappedAge);
  const upperYear = Math.min(Math.ceil(cappedAge), 10);
  const fraction = cappedAge - lowerYear;
  
  const lowerLoss = TIME_DEPRECIATION_CURVE[lowerYear] ?? 0;
  const upperLoss = TIME_DEPRECIATION_CURVE[upperYear] ?? TIME_DEPRECIATION_CURVE[10];
  
  // Smooth interpolation with 50% damping for partial years
  // This prevents aggressive depreciation from fractional years
  const interpolatedRate = lowerLoss + (upperLoss - lowerLoss) * fraction * 0.5;
  
  return marketValue * interpolatedRate;
}

/**
 * Calculate mileage depreciation using two-tier model:
 * - Base: all kilometers contribute to value loss
 * - Excess: above-average usage adds extra penalty
 */
function calculateMileageDepreciation(
  milesDriven: number,
  yearsOwned: number,
  vehicleType: string
): { base: number; excess: number; total: number; expectedMileage: number; excessMileage: number } {
  const baseRate = BASE_RATE_PER_KM[vehicleType] ?? BASE_RATE_PER_KM.car;
  const excessRate = EXCESS_RATE_PER_KM[vehicleType] ?? EXCESS_RATE_PER_KM.car;
  const avgAnnual = AVERAGE_ANNUAL_MILEAGE[vehicleType] ?? 12000;
  
  // Base depreciation: all kilometers contribute
  const baseLoss = milesDriven * baseRate;
  
  // Excess penalty: only above-average usage for ownership period
  const expectedMileage = yearsOwned * avgAnnual;
  const excessMileage = Math.max(0, milesDriven - expectedMileage);
  const excessLoss = excessMileage * excessRate;
  
  return {
    base: baseLoss,
    excess: excessLoss,
    total: baseLoss + excessLoss,
    expectedMileage,
    excessMileage
  };
}

/**
 * Calculate usage-based depreciation for a vehicle.
 * 
 * Key principles:
 * 1. Vehicle age is based on MODEL YEAR (not purchase date)
 * 2. Time depreciation uses cumulative curve lookup (not linear yearly sums)
 * 3. Mileage always matters: base rate for all km + excess penalty
 * 4. 20% residual floor to prevent zero valuations
 */
export function calculateUsageDepreciation(inputs: DepreciationInputs): DepreciationResult | null {
  const { 
    marketValueAtPurchase, 
    vehicleModelYear,
    purchaseDate, 
    currentMileage, 
    initialMileage, 
    vehicleType = 'car' 
  } = inputs;

  // Validate required inputs
  if (!marketValueAtPurchase || marketValueAtPurchase <= 0 || !vehicleModelYear) {
    return null;
  }

  // Calculate vehicle age from MODEL YEAR (not purchase date)
  // This is the key fix: depreciation follows market age, not ownership duration
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const vehicleAge = Math.max(0, currentYear - vehicleModelYear + currentMonth / 12);

  // Calculate ownership duration (for mileage calculation and UI display)
  let yearsOwned = 0;
  if (purchaseDate) {
    const purchaseDateObj = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate;
    const diffMs = now.getTime() - purchaseDateObj.getTime();
    yearsOwned = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));
  }

  // Mileage driven since purchase (protect against negative values)
  const milesDriven = Math.max(0, currentMileage - initialMileage);

  // Time depreciation: curve-based on vehicle age
  const timeDepreciation = calculateTimeDepreciation(marketValueAtPurchase, vehicleAge);

  // Mileage depreciation: two-tier model based on ownership period
  const mileageResult = calculateMileageDepreciation(milesDriven, yearsOwned, vehicleType);

  // Additive combination: time + mileage
  const rawTotalDepreciation = timeDepreciation + mileageResult.total;

  // Floor protection (20% residual)
  const floorValue = marketValueAtPurchase * MINIMUM_RESIDUAL_PERCENTAGE;
  const rawCurrentValue = marketValueAtPurchase - rawTotalDepreciation;
  const estimatedCurrentValue = Math.max(rawCurrentValue, floorValue);
  
  // Actual depreciation respecting the floor
  const totalDepreciation = marketValueAtPurchase - estimatedCurrentValue;
  const depreciationPercentage = (totalDepreciation / marketValueAtPurchase) * 100;

  // Sanity checks (logged for debugging)
  if (vehicleAge <= 5 && depreciationPercentage > 60) {
    console.warn(`Depreciation ${depreciationPercentage.toFixed(1)}% exceeds 60% for vehicle under 5 years`);
  }
  if (vehicleAge <= 7 && depreciationPercentage > 70) {
    console.warn(`Depreciation ${depreciationPercentage.toFixed(1)}% exceeds 70% for vehicle under 7 years`);
  }

  // Calculate shares for breakdown display
  const totalRaw = timeDepreciation + mileageResult.total;
  const timeDepreciationShare = totalRaw > 0 ? (timeDepreciation / totalRaw) * 100 : 0;
  const mileageDepreciationShare = totalRaw > 0 ? (mileageResult.total / totalRaw) * 100 : 0;

  return {
    totalDepreciation,
    timeDepreciation,
    mileageDepreciation: mileageResult.total,
    baseMileageDepreciation: mileageResult.base,
    excessMileageDepreciation: mileageResult.excess,
    estimatedCurrentValue,
    depreciationPercentage,
    vehicleAge,
    yearsOwned,
    milesDriven,
    expectedMileage: mileageResult.expectedMileage,
    excessMileage: mileageResult.excessMileage,
    timeDepreciationShare,
    mileageDepreciationShare,
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

/**
 * Format vehicle age as a human-readable string
 */
export function formatVehicleAge(years: number, language: string = 'en'): string {
  const wholeYears = Math.floor(years);
  if (wholeYears === 0) {
    return language === 'el' ? 'Νέο' : 'New';
  }
  return language === 'el' ? `${wholeYears} ετών` : `${wholeYears} yr${wholeYears !== 1 ? 's' : ''} old`;
}
