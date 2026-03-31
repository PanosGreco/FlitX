

# Plan: Depreciation System Redesign — Mileage-Only Model

## Overview
Replace the two-factor depreciation model (time curve + mileage tiers) with a simpler mileage-only model. Remove the `market_value_at_purchase` UI field, auto-set `initial_mileage` from mileage at creation, and replace the "Value Loss Over Time" card with a new mileage depreciation card.

---

## Part 1: Remove Old System

### 1A. Delete `src/utils/depreciationUtils.ts`

### 1B. Fleet.tsx — Remove Depreciation Data section
- Remove state vars: `marketValueAtPurchase`, `purchaseDate`, `initialMileage` and their setters
- Remove the entire "Depreciation Data" section (lines 802–888): the divider, market value input, purchase date input, initial mileage input
- Keep `purchasePrice` input (above the section)
- In `handleSubmitNewVehicle` insert object: remove `market_value_at_purchase`, `purchase_date`; set `initial_mileage: mileage ? parseInt(mileage) : 0` automatically
- Update `resetForm()` to remove the three deleted states

### 1C. EditVehicleDialog.tsx — Remove deprecated fields
- Remove state vars: `marketValueAtPurchase`, `purchaseDate`, `initialMileage` and their UI (lines 424–463: the depreciation divider + 3 fields)
- Remove from `handleSave` update object: `market_value_at_purchase`, `purchase_date`, `initial_mileage`
- Remove from `resetForm` equivalent
- Keep `purchasePrice`, `mileage` fields

### 1D. Finance.tsx — Remove unused import
- Remove line 206: `const { calculateUsageDepreciation } = await import("@/utils/depreciationUtils");`

---

## Part 2: New Utility

### 2A. Create `src/utils/mileageDepreciation.ts`
Tiered percentage model as specified:
- 0–30k km: 0.40% per 1,000 km
- 30k–80k km: 0.25% per 1,000 km
- 80k–150k km: 0.15% per 1,000 km
- 150k+ km: 0.08% per 1,000 km
- 10% residual floor

---

## Part 3: New UI in VehicleFinanceTab

### 3A. Update imports and props
- Replace old import with `import { calculateMileageDepreciation } from "@/utils/mileageDepreciation"`
- Remove `marketValueAtPurchase` and `purchaseDate` from `VehicleFinanceTabProps` interface and destructuring
- Remove `formatYearsOwned` import
- Remove lines 239–248 (old `usageDepreciation` computation)

### 3B. New depreciation computation
```typescript
const mileageDepreciation = (purchaseValue && purchaseValue > 0)
  ? calculateMileageDepreciation({
      purchasePrice: purchaseValue,
      initialMileage: initialMileage || 0,
      currentMileage: currentMileage || 0,
    })
  : null;
```

### 3C. Replace "Value Loss Over Time" card (lines 414–448)
New card in same `h-[106px]` slot:
- Header: TrendingDown icon + "MILEAGE DEPRECIATION" label + info tooltip
- Left: `-€X,XXX` in orange + "estimated loss" label
- Right: `€X,XXX` + "estimated value" label
- Progress bar showing depreciation percentage
- Bottom: `"X% depreciated · X,XXX km driven"` in muted text
- Empty state when no purchase price
- Zero-km state when kmDriven === 0

### 3D. Update VehicleDetails.tsx
- Remove `marketValueAtPurchase` and `purchaseDate` props from `<VehicleFinanceTab>` call (lines 433–434)
- Remove `market_value_at_purchase` from the vehicle interface default values (line 120)

---

## Part 4: Translations

### Add keys (all 6 locales)
`mileageDepreciation`, `estimatedLoss`, `estimatedValue`, `kmDriven`, `noMileageRecorded`, `mileageDepreciationTooltip`, `addPurchasePrice`

### Remove deprecated keys (all 6 locales)
`depreciationData`, `depreciationDataDesc`, `marketValueAtPurchase`, `marketValueTooltip`, `purchaseDate`, `purchaseDateTooltip`, `mileageAtPurchase`, `mileageAtPurchaseTooltip`, `valueLossOverTime`, `valueLossTooltip`

---

## Files Modified
1. `src/utils/depreciationUtils.ts` — **DELETE**
2. `src/utils/mileageDepreciation.ts` — **CREATE**
3. `src/pages/Fleet.tsx` — Remove depreciation section, auto-set initial_mileage
4. `src/components/fleet/EditVehicleDialog.tsx` — Remove 3 deprecated fields
5. `src/components/fleet/VehicleFinanceTab.tsx` — New card, updated imports/props
6. `src/components/fleet/VehicleDetails.tsx` — Remove 2 props from VehicleFinanceTab call
7. `src/pages/Finance.tsx` — Remove unused import
8. `src/i18n/locales/{en,el,de,fr,it,es}/fleet.json` — Add/remove keys

## Not Modified
- Finance.tsx sale logic (purchase_price - netIncome)
- Purchase value card / ROI circular progress
- Booking, task, financial record logic
- Database columns (no migrations)

