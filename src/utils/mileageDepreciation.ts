/**
 * Mileage-Based Depreciation Calculator
 * 
 * Estimates vehicle value loss based purely on kilometers driven.
 * Uses a tiered percentage model: each tier of mileage deducts a percentage
 * of the original purchase price.
 * 
 * This is an ESTIMATE. Real market value depends on condition, market demand,
 * vehicle type, country, and many other factors.
 */

export interface MileageDepreciationInputs {
  purchasePrice: number;
  initialMileage: number;
  currentMileage: number;
}

export interface MileageDepreciationResult {
  kmDriven: number;
  totalDepreciation: number;
  depreciationPercentage: number;
  estimatedResidualValue: number;
  residualPercentage: number;
}

/**
 * Mileage depreciation tiers.
 * 
 * Each tier defines: up to X km, the vehicle loses Y% of its purchase price
 * per 1,000 km driven within that tier.
 * 
 * Based on industry data:
 * - 0–30,000 km: Vehicle is still relatively new, high impact (~0.40% per 1,000 km)
 * - 30,000–80,000 km: Mid-life, moderate depreciation (~0.25% per 1,000 km)
 * - 80,000–150,000 km: Higher mileage, depreciation slows (~0.15% per 1,000 km)
 * - 150,000+ km: Very high mileage, minimal additional loss (~0.08% per 1,000 km)
 */
const DEPRECIATION_TIERS = [
  { maxKm: 30000, ratePerThousandKm: 0.40 },
  { maxKm: 80000, ratePerThousandKm: 0.25 },
  { maxKm: 150000, ratePerThousandKm: 0.15 },
  { maxKm: Infinity, ratePerThousandKm: 0.08 },
];

const MINIMUM_RESIDUAL_PERCENTAGE = 0.10;

export function calculateMileageDepreciation(
  inputs: MileageDepreciationInputs
): MileageDepreciationResult | null {
  const { purchasePrice, initialMileage, currentMileage } = inputs;

  if (!purchasePrice || purchasePrice <= 0) return null;

  const kmDriven = Math.max(0, currentMileage - initialMileage);

  if (kmDriven === 0) {
    return {
      kmDriven: 0,
      totalDepreciation: 0,
      depreciationPercentage: 0,
      estimatedResidualValue: purchasePrice,
      residualPercentage: 100,
    };
  }

  let totalDepreciationPercentage = 0;
  let remainingKm = kmDriven;
  let previousTierMax = 0;

  for (const tier of DEPRECIATION_TIERS) {
    if (remainingKm <= 0) break;

    const tierWidth = tier.maxKm === Infinity
      ? remainingKm
      : Math.min(remainingKm, tier.maxKm - previousTierMax);

    const kmInTier = Math.max(0, tierWidth);
    totalDepreciationPercentage += (kmInTier / 1000) * tier.ratePerThousandKm;

    remainingKm -= kmInTier;
    previousTierMax = tier.maxKm === Infinity ? previousTierMax : tier.maxKm;
  }

  const maxDepreciationPercentage = (1 - MINIMUM_RESIDUAL_PERCENTAGE) * 100;
  const clampedPercentage = Math.min(totalDepreciationPercentage, maxDepreciationPercentage);

  const totalDepreciation = purchasePrice * (clampedPercentage / 100);
  const estimatedResidualValue = purchasePrice - totalDepreciation;
  const residualPercentage = (estimatedResidualValue / purchasePrice) * 100;

  return {
    kmDriven,
    totalDepreciation,
    depreciationPercentage: clampedPercentage,
    estimatedResidualValue,
    residualPercentage,
  };
}
