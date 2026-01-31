
# Vehicle Depreciation Enhancement - Implementation Plan

## Summary

This plan refines the vehicle depreciation system to use **Car Market Value at Time of Purchase** (instead of purchase price) as the depreciation baseline, implements a **tiered time-based depreciation model** that reflects real market behavior, and improves the UI with clearer labels, better fallback states, and proper separation between the Add Vehicle and Edit Vehicle flows.

---

## Database Changes

### New Column: `market_value_at_purchase`

Add a new column to the `vehicles` table to store the market value:

```sql
ALTER TABLE public.vehicles 
ADD COLUMN market_value_at_purchase numeric DEFAULT NULL;
```

**Rationale:**
- `purchase_price` remains as the **actual price paid** (for ROI calculations)
- `market_value_at_purchase` is the **depreciation baseline** (realistic market value when acquired)
- These are intentionally separate concepts for financial accuracy

---

## File-by-File Changes

### 1. Depreciation Utility Refactor

**File:** `src/utils/depreciationUtils.ts`

**Changes:**

#### A. Update Interface
```typescript
export interface DepreciationInputs {
  marketValueAtPurchase: number;  // NEW: Replaces purchasePrice
  purchaseDate: Date | string | null;
  currentMileage: number;
  initialMileage: number;
  vehicleType?: 'car' | 'motorbike' | 'boat' | 'atv';  // NEW: For type-specific rates
}
```

#### B. Tiered Time-Based Depreciation (Industry-Aligned)

Replace flat 10% annual rate with tiered model:

```text
Year 1:     18% depreciation
Year 2:     12% depreciation  
Year 3:     10% depreciation
Year 4:      8% depreciation
Year 5+:     6% per year (linear)
```

**Implementation Logic:**
```typescript
function calculateTimeDepreciation(marketValue: number, yearsOwned: number): number {
  const tiers = [
    { year: 1, rate: 0.18 },
    { year: 2, rate: 0.12 },
    { year: 3, rate: 0.10 },
    { year: 4, rate: 0.08 },
  ];
  const laterYearRate = 0.06;

  let depreciation = 0;
  let remainingYears = yearsOwned;

  for (const tier of tiers) {
    if (remainingYears <= 0) break;
    const portion = Math.min(1, remainingYears);
    depreciation += marketValue * tier.rate * portion;
    remainingYears -= 1;
  }

  // Years 5+: 6% per year
  if (remainingYears > 0) {
    depreciation += marketValue * laterYearRate * remainingYears;
  }

  return depreciation;
}
```

This results in:
- 1 year: ~18% lost
- 3 years: ~40% lost (18+12+10)
- 5 years: ~48% lost (matches industry 45-50% expectation)
- 10 years: ~78% lost (but floor protects at 80%)

#### C. Mileage Depreciation Rate Update

Use per-km value loss (additive model, not weighted):

```typescript
const DEPRECIATION_PER_KM = {
  car: 0.05,       // €0.05 per km
  motorbike: 0.03, // €0.03 per km
  boat: 0.02,      // €0.02 per km (usage hours would be better, but km is proxy)
  atv: 0.04,       // €0.04 per km
};
```

**Formula:**
```typescript
mileageDepreciation = (currentMileage - initialMileage) * ratePerKm;
```

#### D. Additive Model (Not Weighted)

Per the requirements, use additive combination:

```typescript
totalDepreciation = timeDepreciation + mileageDepreciation;
```

This mirrors real-world resale pricing where both factors independently reduce value.

#### E. Minimum Residual Floor

Keep the 20% floor (configurable):

```typescript
const MINIMUM_RESIDUAL_PERCENTAGE = 0.20;
const floorValue = marketValueAtPurchase * MINIMUM_RESIDUAL_PERCENTAGE;
const estimatedCurrentValue = Math.max(
  marketValueAtPurchase - totalDepreciation,
  floorValue
);
```

---

### 2. Add Vehicle Flow Enhancement

**File:** `src/pages/Fleet.tsx`

**Changes:**

#### A. New Form State Variables
```typescript
const [marketValueAtPurchase, setMarketValueAtPurchase] = useState("");
const [purchaseDateAdd, setPurchaseDateAdd] = useState("");
const [initialMileageAdd, setInitialMileageAdd] = useState("");
```

#### B. Add Depreciation Data Section (After License Plate/Daily Rate)

Add a visual divider and optional section at the bottom of the Add Vehicle form:

```text
──────────────────────────────────────────────
📊 Depreciation Data (Optional)

This data is used to estimate vehicle value loss over time and mileage.
You can add a vehicle without filling this section.

┌────────────────────────────────────────────┐
│ Market Value at Purchase (€)               │
│ [____________] (Estimated market value)    │
├────────────────────────────────────────────┤
│ Purchase Date                              │
│ [____________]                             │
├────────────────────────────────────────────┤
│ Mileage at Purchase (km)                   │
│ [____________]                             │
└────────────────────────────────────────────┘
```

**Bilingual Labels:**
- "Depreciation Data (Optional)" / "Δεδομένα Απόσβεσης (Προαιρετικό)"
- "Market Value at Purchase" / "Αξία Αγοράς στην Αγορά"

#### C. Update Insert Query

Include new fields in the Supabase insert:

```typescript
.insert({
  // ... existing fields
  market_value_at_purchase: marketValueAtPurchase ? parseFloat(marketValueAtPurchase) : null,
  purchase_date: purchaseDateAdd || null,
  initial_mileage: initialMileageAdd ? parseInt(initialMileageAdd) : 0,
})
```

---

### 3. Edit Vehicle Flow Enhancement

**File:** `src/components/fleet/EditVehicleDialog.tsx`

**Changes:**

#### A. Update Props Interface
```typescript
vehicle: {
  // ... existing
  market_value_at_purchase?: number | null;  // NEW
}
```

#### B. Add State for Market Value
```typescript
const [marketValueAtPurchase, setMarketValueAtPurchase] = useState<string>(
  vehicle.market_value_at_purchase?.toString() ?? ''
);
```

#### C. Create Depreciation Section (Separate from Other Fields)

Add a collapsible or clearly separated section:

```text
──────────────────────────────────────────────
📊 Depreciation Data

┌────────────────────────────────────────────┐
│ Market Value at Purchase (€)  ⓘ            │
│ The realistic market value when acquired   │
│ [____________]                             │
├────────────────────────────────────────────┤
│ Purchase Date  ⓘ                           │
│ [____________]                             │
├────────────────────────────────────────────┤
│ Mileage at Purchase (km)  ⓘ                │
│ [____________]                             │
└────────────────────────────────────────────┘
```

#### D. Update Save Query

Include `market_value_at_purchase` in the update:

```typescript
.update({
  // ... existing fields
  market_value_at_purchase: marketValueAtPurchase ? parseFloat(marketValueAtPurchase) : null,
})
```

---

### 4. Finance Tab UI Enhancement

**File:** `src/components/fleet/VehicleFinanceTab.tsx`

**Changes:**

#### A. Update Props Interface
```typescript
interface VehicleFinanceTabProps {
  vehicleId: string;
  vehicleName: string;
  purchasePrice?: number | null;          // Keep for ROI metrics
  marketValueAtPurchase?: number | null;  // NEW: For depreciation
  purchaseDate?: string | null;
  currentMileage?: number;
  initialMileage?: number;
  vehicleType?: string;                   // NEW: For type-specific rates
}
```

#### B. Rename Box Title

Change:
- "Usage Depreciation" → **"Vehicle Value Loss Over Time"**
- Greek: "Απόσβεση Χρήσης" → **"Μείωση Αξίας Οχήματος με τον Χρόνο"**

#### C. Update Depreciation Calculation Call

```typescript
const usageDepreciation = calculateUsageDepreciation({
  marketValueAtPurchase: marketValueAtPurchase ?? 0,
  purchaseDate,
  currentMileage,
  initialMileage,
  vehicleType: vehicleType as 'car' | 'motorbike' | 'boat' | 'atv',
});
```

#### D. Missing Data Fallback State

When depreciation data is incomplete, show:

```text
┌────────────────────────────────────────────┐
│ Vehicle Value Loss Over Time               │
│                                            │
│        ⚠️ Unavailable                       │
│                                            │
│ Add depreciation data to calculate         │
│ vehicle value loss.                        │
│                                            │
│ [Edit Vehicle →]                           │
└────────────────────────────────────────────┘
```

**Condition for showing fallback:**
```typescript
const hasDepreciationData = marketValueAtPurchase && marketValueAtPurchase > 0;
```

#### E. Display Breakdown Inside Box

Format breakdown clearly (no tooltip required, show inline):

```text
┌────────────────────────────────────────────┐
│ 📉 Vehicle Value Loss Over Time      ⓘ    │
│                                            │
│         -€8,400                            │
│         42% loss                           │
│                                            │
│   ├─ €6,200 from time (74%)               │
│   └─ €2,200 from mileage (26%)            │
│                                            │
│ ─────────────────────────────────────────  │
│ Estimated Current Value                    │
│         €11,600                            │
│                                            │
│ 3 yrs, 4 mo • 44,000 km added             │
└────────────────────────────────────────────┘
```

#### F. Improved Tooltip Content

Keep tooltip instant (already using TooltipProvider) and update text:

```text
"These values are estimates based on time and usage patterns. 
They are intended for internal tracking and decision-making 
and do not represent guaranteed market resale values."
```

---

### 5. VehicleDetail Page Data Passing

**File:** `src/pages/VehicleDetail.tsx`

**Changes:**

#### A. Fetch `market_value_at_purchase` from Database

Update the select query to include the new column:

```typescript
.select('*, market_value_at_purchase')
```

#### B. Pass to VehicleFinanceTab

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
/>
```

---

### 6. VehicleDetails Component Update

**File:** `src/components/fleet/VehicleDetails.tsx`

**Changes:**

Update the data structure passed to `EditVehicleDialog`:

```typescript
vehicle={{
  // ... existing fields
  market_value_at_purchase: vehicle.market_value_at_purchase,
}}
```

---

## Calculation Examples

### Example 1: 3-Year-Old Car

**Inputs:**
- Market Value at Purchase: €20,000
- Purchase Date: 3 years ago
- Mileage at Purchase: 30,000 km
- Current Mileage: 75,000 km (45,000 km driven)

**Calculation:**
```text
Time Depreciation:
  Year 1: €20,000 × 18% = €3,600
  Year 2: €20,000 × 12% = €2,400
  Year 3: €20,000 × 10% = €2,000
  Total: €8,000

Mileage Depreciation:
  45,000 km × €0.05 = €2,250

Total Depreciation: €8,000 + €2,250 = €10,250

Floor Value: €20,000 × 20% = €4,000

Estimated Current Value: max(€20,000 - €10,250, €4,000) = €9,750

Depreciation %: 51.25%
```

### Example 2: New Vehicle (6 Months)

**Inputs:**
- Market Value at Purchase: €35,000
- Purchase Date: 6 months ago
- Mileage at Purchase: 0 km
- Current Mileage: 8,000 km

**Calculation:**
```text
Time Depreciation:
  0.5 years × 18% = 9% = €3,150

Mileage Depreciation:
  8,000 km × €0.05 = €400

Total: €3,550

Estimated Current Value: €35,000 - €3,550 = €31,450

Depreciation %: 10.14%
```

---

## Recalculation Triggers

Depreciation automatically updates when:

1. **Mileage Update** - Immediate recalculation on save in Edit Vehicle
2. **Time Progression** - Automatic on page load (uses current date vs. purchase date)
3. **Market Value Change** - Immediate recalculation when user edits this field

No manual refresh button needed.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No market value set | Show "Unavailable" fallback with prompt to add data |
| No purchase date | Still calculate mileage-based depreciation only |
| No initial mileage | Assume 0 (common for new vehicle purchases) |
| Future purchase date | Treat as 0 years owned (prevent negative depreciation) |
| Current mileage < initial | Treat as 0 km driven (data entry error protection) |
| Depreciation exceeds floor | Cap at 20% residual value |

---

## Backward Compatibility

- Existing vehicles with only `purchase_price` continue to work (no display until `market_value_at_purchase` is added)
- Migration does not require data backfill
- UI gracefully handles missing data with clear prompts
- No data loss or corruption

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| Database Migration | Add `market_value_at_purchase` column |
| `src/utils/depreciationUtils.ts` | Tiered depreciation, additive model, new interface |
| `src/pages/Fleet.tsx` | Add depreciation section to Add Vehicle form |
| `src/components/fleet/EditVehicleDialog.tsx` | Add market value field, update save logic |
| `src/components/fleet/VehicleFinanceTab.tsx` | New title, breakdown display, fallback state |
| `src/pages/VehicleDetail.tsx` | Fetch and pass new column |
| `src/components/fleet/VehicleDetails.tsx` | Pass market value to edit dialog |

---

## UI/UX Notes

- All monetary values: Rounded, no decimals, € prefix
- Percentage: Whole numbers only (e.g., "42%", not "42.35%")
- Time display: "X yrs, Y mo" format (compact)
- Mileage display: "XX,XXX km added" format
- Icons: Use Clock (time) and Gauge (mileage) - no emojis
- Colors: Orange for value loss (consistent with current implementation)
