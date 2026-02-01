

# Fix: Time-Based Depreciation Over-Calculation

## Problem Summary

The current depreciation model produces unrealistic results:
- 5-year-old car: showing ~80-85% value loss
- 7-year-old car with €30,000 market value: showing €22,000+ loss

**Root Cause:** The additive model treats time and mileage as fully independent factors, causing double-counting. A car owned for 5 years with average mileage loses value twice - once for aging, once for the kilometers that naturally come with that age.

---

## Current Calculation (Flawed)

For a 5-year-old car, €30,000 market value, 75,000 km driven:

| Factor | Calculation | Result |
|--------|-------------|--------|
| Time (Years 1-5) | 18% + 12% + 10% + 8% + 6% | €16,200 (54%) |
| Mileage | 75,000 × €0.05 | €3,750 (12.5%) |
| **Raw Total** | | **€19,950 (66.5%)** |
| After 20% floor | | €19,950 capped |

This seems reasonable, but for **high-mileage** vehicles it compounds badly:
- 150,000 km × €0.05 = €7,500 additional loss
- Combined with time: 54% + 25% = 79% loss

---

## Solution: Excess-Mileage Model

Instead of treating all kilometers as depreciation, only penalize **above-average usage**.

### Industry Reference: Average Annual Mileage
- Cars: ~12,000-15,000 km/year (use 12,000 as baseline)
- Motorcycles: ~5,000-8,000 km/year (use 6,000)
- ATVs: ~3,000-5,000 km/year (use 4,000)
- Boats: ~100-200 hours/year (use km as proxy, ~2,000)

### New Formula

```text
Expected Mileage = Years Owned × Average Annual Mileage
Excess Mileage = max(0, Actual Mileage - Expected Mileage)
Mileage Depreciation = Excess Mileage × Rate Per Km
```

This way:
- A car driven 15,000 km/year for 5 years (75,000 km) = 0 excess mileage = 0 mileage penalty
- A car driven 25,000 km/year for 5 years (125,000 km) = 65,000 km excess = €3,250 penalty

---

## Technical Changes

### File: `src/utils/depreciationUtils.ts`

#### 1. Add Average Annual Mileage Constants

```typescript
const AVERAGE_ANNUAL_MILEAGE: Record<string, number> = {
  car: 12000,       // 12,000 km/year
  motorbike: 6000,  // 6,000 km/year
  boat: 2000,       // 2,000 km/year (proxy)
  atv: 4000,        // 4,000 km/year
};
```

#### 2. Reduce Per-Km Rate (Only for Excess)

Since we're now only penalizing excess mileage, the rate can remain or be slightly reduced:

```typescript
const DEPRECIATION_PER_KM: Record<string, number> = {
  car: 0.04,       // €0.04 per excess km (was 0.05)
  motorbike: 0.025,// €0.025 per excess km
  boat: 0.015,     // €0.015 per excess km
  atv: 0.03,       // €0.03 per excess km
};
```

#### 3. Update Mileage Depreciation Calculation

Replace:
```typescript
const mileageDepreciation = milesDriven * ratePerKm;
```

With:
```typescript
const averageAnnualKm = AVERAGE_ANNUAL_MILEAGE[vehicleType] ?? AVERAGE_ANNUAL_MILEAGE.car;
const expectedMileage = yearsOwned * averageAnnualKm;
const excessMileage = Math.max(0, milesDriven - expectedMileage);
const mileageDepreciation = excessMileage * ratePerKm;
```

#### 4. Cap Time Depreciation at 65%

Add a maximum cap for time-based loss to prevent runaway depreciation for very old vehicles:

```typescript
const MAX_TIME_DEPRECIATION_PERCENTAGE = 0.65;  // 65% max from time alone

function calculateTimeDepreciation(marketValue: number, yearsOwned: number): number {
  let depreciation = 0;
  let remainingYears = yearsOwned;

  for (const tier of TIME_DEPRECIATION_TIERS) {
    if (remainingYears <= 0) break;
    const portion = Math.min(1, remainingYears);
    depreciation += marketValue * tier.rate * portion;
    remainingYears -= 1;
  }

  if (remainingYears > 0) {
    depreciation += marketValue * LATER_YEAR_RATE * remainingYears;
  }

  // Cap time depreciation at 65%
  const maxTimeDepreciation = marketValue * MAX_TIME_DEPRECIATION_PERCENTAGE;
  return Math.min(depreciation, maxTimeDepreciation);
}
```

---

## Expected Results After Fix

### Example 1: 5-Year-Old Car (Average Mileage)

**Inputs:**
- Market Value: €30,000
- Years Owned: 5
- Mileage Driven: 60,000 km (12,000/year = average)

**Calculation:**
| Factor | Calculation | Result |
|--------|-------------|--------|
| Time | 18%+12%+10%+8%+6% | €16,200 (54%) |
| Expected Mileage | 5 × 12,000 | 60,000 km |
| Excess Mileage | 60,000 - 60,000 | 0 km |
| Mileage Penalty | 0 × €0.04 | €0 |
| **Total Loss** | | **€16,200 (54%)** |
| **Current Value** | | **€13,800** |

### Example 2: 5-Year-Old Car (High Mileage)

**Inputs:**
- Market Value: €30,000
- Years Owned: 5
- Mileage Driven: 120,000 km (high usage)

**Calculation:**
| Factor | Calculation | Result |
|--------|-------------|--------|
| Time | 18%+12%+10%+8%+6% | €16,200 (54%) |
| Expected Mileage | 5 × 12,000 | 60,000 km |
| Excess Mileage | 120,000 - 60,000 | 60,000 km |
| Mileage Penalty | 60,000 × €0.04 | €2,400 (8%) |
| **Total Loss** | | **€18,600 (62%)** |
| **Current Value** | | **€11,400** |

### Example 3: 7-Year-Old Car

**Inputs:**
- Market Value: €30,000
- Years Owned: 7
- Mileage Driven: 100,000 km

**Calculation:**
| Factor | Calculation | Result |
|--------|-------------|--------|
| Time | 48% + 6% + 6% = 60% | €18,000 |
| Expected Mileage | 7 × 12,000 | 84,000 km |
| Excess Mileage | 100,000 - 84,000 | 16,000 km |
| Mileage Penalty | 16,000 × €0.04 | €640 (2.1%) |
| **Total Loss** | | **€18,640 (62%)** |
| **Current Value** | | **€11,360** |

### Example 4: 10-Year-Old Car (Testing Cap)

**Inputs:**
- Market Value: €20,000
- Years Owned: 10
- Mileage Driven: 150,000 km

**Calculation:**
| Factor | Calculation | Result |
|--------|-------------|--------|
| Time (uncapped) | 48% + (6×6%) = 84% | Would be €16,800 |
| Time (capped at 65%) | | €13,000 |
| Expected Mileage | 10 × 12,000 | 120,000 km |
| Excess Mileage | 150,000 - 120,000 | 30,000 km |
| Mileage Penalty | 30,000 × €0.04 | €1,200 (6%) |
| **Subtotal** | | €14,200 (71%) |
| **Floor (20%)** | €20,000 × 20% | €4,000 minimum |
| **Current Value** | | **€5,800** (71% loss) |

---

## Summary of Changes

| Change | Current | New |
|--------|---------|-----|
| Mileage model | All km penalized | Only excess km penalized |
| Per-km rate | €0.05 (car) | €0.04 (car) - for excess only |
| Time cap | None | 65% maximum |
| Average baseline | None | 12,000 km/year (car) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/depreciationUtils.ts` | Add average mileage constants, implement excess-mileage model, add 65% time cap |

No UI changes required - the display components already correctly show whatever the utility returns.

---

## Validation Criteria

After implementation, verify:

- 5-year average-mileage car: ~50-55% loss
- 7-year average-mileage car: ~58-62% loss  
- 10-year car: capped at ~65% from time + excess mileage penalty
- No vehicle should show >80% loss unless extremely high mileage
- 20% floor still enforced as final safety net

