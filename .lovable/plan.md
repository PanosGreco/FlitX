

# Vehicle Depreciation Logic - Complete Overhaul

## Problem Summary

The current depreciation model has multiple fundamental flaws causing unrealistic results:

1. **Linear yearly application** - Each year's rate is applied to the original market value and summed, causing rapid over-depreciation
2. **Ownership vs Vehicle Age confusion** - Depreciation is based on when YOU bought the car, not how old the car actually is
3. **Excess-only mileage model** - Normal usage shows zero mileage impact, which users perceive as "driving 25,000 km caused no value loss"
4. **Fractional years too aggressive** - Partial years behave almost like full depreciation years

---

## Core Conceptual Fixes

### Fix 1: Vehicle Age vs Ownership Duration

**Current (Wrong):**
```
vehicleAge = currentDate - purchaseDate
```

**Correct:**
```
vehicleAge = currentDate - vehicleModelYear
```

The vehicle's `year` column (model/production year) determines market aging. A 2020 car bought in 2024 has already lost 4 years of value - you don't get "first-year" depreciation again.

### Fix 2: Cumulative Curve, Not Linear Sum

**Current (Wrong):**
```typescript
// Each year's % applied to original value and summed
depreciation += marketValue * tier.rate * portion;  // Year 1: 18%
depreciation += marketValue * tier.rate * portion;  // Year 2: 12%
// Results in: 18% + 12% + 10% + 8% + 6% = 54% at year 5
```

**Correct:**
Use a lookup table with cumulative maximum loss values:

| Vehicle Age | Max Time-Based Loss |
|-------------|-------------------|
| 1 year      | 20%               |
| 2 years     | 32%               |
| 3 years     | 42%               |
| 4 years     | 48%               |
| 5 years     | 52%               |
| 6 years     | 55%               |
| 7 years     | 58%               |
| 8+ years    | 60-65% (cap)      |

Formula: `timeDepreciation = marketValue * curvePercentage`

### Fix 3: Mileage Always Matters

**Current (Wrong):**
```typescript
excessMileage = max(0, milesDriven - expectedMileage);
mileageDepreciation = excessMileage * ratePerKm;  // Often = 0
```

**Correct:**
```typescript
baseMileageLoss = totalMileageDriven * baseRatePerKm;        // Always applies
excessPenalty = max(0, milesDriven - expectedMileage) * extraRate;  // Extra penalty
mileageDepreciation = baseMileageLoss + excessPenalty;
```

Rates:
- Base rate: €0.015/km (all kilometers reduce value)
- Excess rate: +€0.025/km (above-average usage adds penalty)

### Fix 4: Smooth Fractional Years

**Current (Wrong):**
```typescript
// 5.8 years = 5 full tiers + 0.8 × 6% = aggressive
```

**Correct:**
```typescript
// Interpolate between curve brackets smoothly
const lowerYear = Math.floor(vehicleAge);
const upperYear = Math.ceil(vehicleAge);
const fraction = vehicleAge - lowerYear;
const lowerLoss = TIME_CURVE[lowerYear];
const upperLoss = TIME_CURVE[upperYear];
const interpolatedLoss = lowerLoss + (upperLoss - lowerLoss) * fraction * 0.5; // Damped
```

---

## Technical Implementation

### File: `src/utils/depreciationUtils.ts`

#### Updated Interface

```typescript
export interface DepreciationInputs {
  marketValueAtPurchase: number;
  vehicleModelYear: number;          // NEW: The vehicle's production year
  purchaseDate: Date | string | null; // For ownership duration display
  currentMileage: number;
  initialMileage: number;
  vehicleType?: 'car' | 'motorbike' | 'boat' | 'atv';
}

export interface DepreciationResult {
  totalDepreciation: number;
  timeDepreciation: number;
  mileageDepreciation: number;
  baseMileageDepreciation: number;    // NEW: From all km
  excessMileageDepreciation: number;  // NEW: Extra penalty
  estimatedCurrentValue: number;
  depreciationPercentage: number;
  vehicleAge: number;                 // NEW: Years since model year
  yearsOwned: number;                 // For UI display
  milesDriven: number;
  expectedMileage: number;
  excessMileage: number;
  timeDepreciationShare: number;
  mileageDepreciationShare: number;
}
```

#### New Constants

```typescript
// Cumulative time-based depreciation curve (industry-aligned)
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

// Mileage rates (two-tier model)
const BASE_RATE_PER_KM: Record<string, number> = {
  car: 0.015,       // €0.015 per km (all usage)
  motorbike: 0.01,
  boat: 0.008,
  atv: 0.012,
};

const EXCESS_RATE_PER_KM: Record<string, number> = {
  car: 0.025,       // +€0.025 per excess km
  motorbike: 0.015,
  boat: 0.01,
  atv: 0.02,
};
```

#### New Time Depreciation Function

```typescript
function calculateTimeDepreciation(marketValue: number, vehicleAge: number): number {
  // Cap at 10 years for curve lookup
  const cappedAge = Math.min(vehicleAge, 10);
  
  const lowerYear = Math.floor(cappedAge);
  const upperYear = Math.min(Math.ceil(cappedAge), 10);
  const fraction = cappedAge - lowerYear;
  
  const lowerLoss = TIME_DEPRECIATION_CURVE[lowerYear] ?? 0;
  const upperLoss = TIME_DEPRECIATION_CURVE[upperYear] ?? TIME_DEPRECIATION_CURVE[10];
  
  // Smooth interpolation with 50% damping for partial years
  const interpolatedRate = lowerLoss + (upperLoss - lowerLoss) * fraction * 0.5;
  
  return marketValue * interpolatedRate;
}
```

#### New Mileage Depreciation Function

```typescript
function calculateMileageDepreciation(
  milesDriven: number,
  vehicleAge: number,
  vehicleType: string
): { base: number; excess: number; total: number } {
  const baseRate = BASE_RATE_PER_KM[vehicleType] ?? BASE_RATE_PER_KM.car;
  const excessRate = EXCESS_RATE_PER_KM[vehicleType] ?? EXCESS_RATE_PER_KM.car;
  const avgAnnual = AVERAGE_ANNUAL_MILEAGE[vehicleType] ?? 12000;
  
  // Base depreciation: all kilometers contribute
  const baseLoss = milesDriven * baseRate;
  
  // Excess penalty: only above-average usage
  const expectedMileage = vehicleAge * avgAnnual;
  const excessMileage = Math.max(0, milesDriven - expectedMileage);
  const excessLoss = excessMileage * excessRate;
  
  return {
    base: baseLoss,
    excess: excessLoss,
    total: baseLoss + excessLoss
  };
}
```

#### Updated Main Function

```typescript
export function calculateUsageDepreciation(inputs: DepreciationInputs): DepreciationResult | null {
  const { 
    marketValueAtPurchase, 
    vehicleModelYear,
    purchaseDate, 
    currentMileage, 
    initialMileage, 
    vehicleType = 'car' 
  } = inputs;

  // Validate
  if (!marketValueAtPurchase || marketValueAtPurchase <= 0 || !vehicleModelYear) {
    return null;
  }

  // Calculate vehicle age from MODEL YEAR (not purchase date)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const vehicleAge = Math.max(0, currentYear - vehicleModelYear + currentMonth / 12);

  // Calculate ownership duration (for display only)
  let yearsOwned = 0;
  if (purchaseDate) {
    const purchaseDateObj = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate;
    const now = new Date();
    yearsOwned = Math.max(0, (now.getTime() - purchaseDateObj.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  // Mileage driven since purchase
  const milesDriven = Math.max(0, currentMileage - initialMileage);

  // Time depreciation (curve-based)
  const timeDepreciation = calculateTimeDepreciation(marketValueAtPurchase, vehicleAge);

  // Mileage depreciation (two-tier)
  const mileageResult = calculateMileageDepreciation(milesDriven, yearsOwned, vehicleType);

  // Combine (additive but realistic)
  const rawTotal = timeDepreciation + mileageResult.total;

  // Floor protection (20% residual)
  const floorValue = marketValueAtPurchase * MINIMUM_RESIDUAL_PERCENTAGE;
  const estimatedCurrentValue = Math.max(marketValueAtPurchase - rawTotal, floorValue);
  const totalDepreciation = marketValueAtPurchase - estimatedCurrentValue;

  // Shares for display
  const totalRaw = timeDepreciation + mileageResult.total;
  const timeShare = totalRaw > 0 ? (timeDepreciation / totalRaw) * 100 : 0;
  const mileageShare = totalRaw > 0 ? (mileageResult.total / totalRaw) * 100 : 0;

  return {
    totalDepreciation,
    timeDepreciation,
    mileageDepreciation: mileageResult.total,
    baseMileageDepreciation: mileageResult.base,
    excessMileageDepreciation: mileageResult.excess,
    estimatedCurrentValue,
    depreciationPercentage: (totalDepreciation / marketValueAtPurchase) * 100,
    vehicleAge,
    yearsOwned,
    milesDriven,
    expectedMileage: yearsOwned * (AVERAGE_ANNUAL_MILEAGE[vehicleType] ?? 12000),
    excessMileage: Math.max(0, milesDriven - yearsOwned * (AVERAGE_ANNUAL_MILEAGE[vehicleType] ?? 12000)),
    timeDepreciationShare: timeShare,
    mileageDepreciationShare: mileageShare,
  };
}
```

---

### File: `src/components/fleet/VehicleFinanceTab.tsx`

Update the depreciation call to pass `vehicleModelYear`:

```typescript
interface VehicleFinanceTabProps {
  vehicleId: string;
  vehicleName: string;
  purchasePrice?: number | null;
  marketValueAtPurchase?: number | null;
  purchaseDate?: string | null;
  currentMileage?: number;
  initialMileage?: number;
  vehicleType?: string;
  vehicleYear: number;  // NEW: Required for age-based depreciation
}

// In component:
const usageDepreciation = hasDepreciationData ? calculateUsageDepreciation({
  marketValueAtPurchase: marketValue,
  vehicleModelYear: vehicleYear,  // NEW
  purchaseDate,
  currentMileage,
  initialMileage,
  vehicleType: vehicleType as 'car' | 'motorbike' | 'boat' | 'atv',
}) : null;
```

---

### File: `src/pages/VehicleDetail.tsx`

Pass the vehicle year to VehicleFinanceTab:

```typescript
<VehicleFinanceTab
  vehicleId={vehicle.id}
  vehicleName={`${vehicle.make} ${vehicle.model}`}
  purchasePrice={vehicle.purchase_price}
  marketValueAtPurchase={vehicle.market_value_at_purchase}
  purchaseDate={vehicle.purchase_date}
  currentMileage={vehicle.mileage}
  initialMileage={vehicle.initial_mileage}
  vehicleType={vehicle.vehicle_type}
  vehicleYear={vehicle.year}  // NEW
/>
```

---

## Expected Results After Fix

### Test Case 1: 2020 Car Bought in 2020 (5 years old)
- Market Value: €25,000
- Vehicle Age: 5 years (2020 → 2025)
- Mileage Driven: 60,000 km (average usage)

| Factor | Calculation | Result |
|--------|-------------|--------|
| Time (curve lookup) | 52% of €25,000 | €13,000 |
| Base Mileage | 60,000 × €0.015 | €900 |
| Excess Mileage | 0 km × €0.025 | €0 |
| **Total** | | **€13,900 (55.6%)** |
| **Current Value** | | **€11,100** |

### Test Case 2: 2018 Car Bought in 2018 (7 years old, high mileage)
- Market Value: €30,000
- Vehicle Age: 7 years
- Mileage Driven: 120,000 km (high usage)
- Expected for 7 years: 84,000 km

| Factor | Calculation | Result |
|--------|-------------|--------|
| Time (curve lookup) | 58% of €30,000 | €17,400 |
| Base Mileage | 120,000 × €0.015 | €1,800 |
| Excess Mileage | 36,000 × €0.025 | €900 |
| **Total** | | **€20,100 (67%)** |
| **Current Value** | | **€9,900** |

### Test Case 3: 2016 Car Bought in 2018 (9 years old)
- Already used when purchased (2 years depreciation already absorbed)
- Time depreciation based on 9-year age, not 7-year ownership

| Factor | Calculation | Result |
|--------|-------------|--------|
| Time (curve lookup) | 62% of €30,000 | €18,600 |
| (already includes first-year drop) | | |

---

## Validation Rules (Built into code)

```typescript
// Sanity checks
if (vehicleAge <= 5 && depreciationPercentage > 60) {
  console.warn('Depreciation exceeds 60% for vehicle under 5 years');
}
if (vehicleAge <= 7 && depreciationPercentage > 70) {
  console.warn('Depreciation exceeds 70% for vehicle under 7 years');
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/depreciationUtils.ts` | Complete refactor: curve-based time, two-tier mileage, vehicle age logic |
| `src/components/fleet/VehicleFinanceTab.tsx` | Add `vehicleYear` prop, pass to calculation |
| `src/pages/VehicleDetail.tsx` | Pass `vehicle.year` to VehicleFinanceTab |
| `src/components/fleet/VehicleDetails.tsx` | Ensure year is passed through props chain |

---

## Summary of Model Changes

| Aspect | Before | After |
|--------|--------|-------|
| Time anchor | Purchase date | Vehicle model year |
| Time calculation | Sum of yearly rates | Cumulative curve lookup |
| Mileage model | Excess-only | All km + excess penalty |
| Base mileage rate | N/A | €0.015/km |
| Excess mileage rate | €0.04/km | €0.025/km (additive) |
| Partial years | Aggressive proportional | Smooth interpolation (damped) |
| 5-year loss | ~54%+ | ~52-56% |
| 7-year loss | ~60%+ | ~58-62% |
| User perception | "Mileage doesn't matter" | "Every km reduces value" |

