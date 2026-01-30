/**
 * Usage-Based Depreciation Calculation Utility
 * 
 * Calculates vehicle depreciation based on time elapsed and mileage accumulated
 * using a hybrid weighted model.
 */

export interface DepreciationInputs {
  purchasePrice: number;
  purchaseDate: Date | string | null;
  currentMileage: number;
  initialMileage: number;
}

export interface DepreciationResult {
  totalDepreciation: number;
  timeDepreciation: number;
  mileageDepreciation: number;
  estimatedCurrentValue: number;
  depreciationPercentage: number;
  yearsOwned: number;
  milesDriven: number;
}

// Configuration constants
const ANNUAL_DEPRECIATION_RATE = 0.10; // 10% per year
const DEPRECIATION_PER_1000KM = 0.001; // 0.1% per 1000km (conservative)
const TIME_WEIGHT = 0.6; // 60% weight for time-based
const MILEAGE_WEIGHT = 0.4; // 40% weight for mileage-based
const MINIMUM_RESIDUAL_PERCENTAGE = 0.20; // 20% floor value

/**
 * Calculate usage-based depreciation for a vehicle
 */
export function calculateUsageDepreciation(inputs: DepreciationInputs): DepreciationResult | null {
  const { purchasePrice, purchaseDate, currentMileage, initialMileage } = inputs;

  // Validate required inputs
  if (!purchasePrice || purchasePrice <= 0) {
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

  // Calculate mileage driven since purchase
  const milesDriven = Math.max(0, currentMileage - initialMileage);

  // Time-based depreciation: purchase_price × annual_rate × years
  const timeDepreciation = purchasePrice * ANNUAL_DEPRECIATION_RATE * yearsOwned;

  // Mileage-based depreciation: (purchase_price × rate_per_1000km) × (mileage / 1000)
  const mileageDepreciation = (purchasePrice * DEPRECIATION_PER_1000KM) * (milesDriven / 1000);

  // Hybrid combination with weights to avoid over-depreciation
  const totalDepreciation = (timeDepreciation * TIME_WEIGHT) + (mileageDepreciation * MILEAGE_WEIGHT);

  // Calculate floor value (minimum residual)
  const floorValue = purchasePrice * MINIMUM_RESIDUAL_PERCENTAGE;

  // Estimated current value with floor protection
  const rawCurrentValue = purchasePrice - totalDepreciation;
  const estimatedCurrentValue = Math.max(rawCurrentValue, floorValue);

  // Actual depreciation respecting the floor
  const actualDepreciation = purchasePrice - estimatedCurrentValue;

  // Depreciation percentage
  const depreciationPercentage = (actualDepreciation / purchasePrice) * 100;

  return {
    totalDepreciation: actualDepreciation,
    timeDepreciation,
    mileageDepreciation,
    estimatedCurrentValue,
    depreciationPercentage,
    yearsOwned,
    milesDriven,
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
    return language === 'el' ? `${wholeYears} έτη` : `${wholeYears} year${wholeYears !== 1 ? 's' : ''}`;
  }
  
  if (language === 'el') {
    return `${wholeYears} έτη, ${remainingMonths} μήνες`;
  }
  return `${wholeYears} yr${wholeYears !== 1 ? 's' : ''}, ${remainingMonths} mo`;
}
