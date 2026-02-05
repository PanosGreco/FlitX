
# Fix Average Income & Cost Per Day Calculations

## Problem Summary

The current implementation calculates **Average Income per Day** and **Average Cost per Day** using the user's registration date as the time anchor. This is incorrect because:

1. A user may have been registered for years before adding a specific vehicle
2. This inflates the day count, producing unrealistically low daily averages
3. It's inconsistent with vehicle-specific totals being divided

---

## What Stays Unchanged

**Average Rental Price** - Current logic is correct and will not be modified:
- Formula: `Total Vehicle Revenue ÷ Total Booked Days`
- Only counts days with active bookings
- Already shows `€/day` format correctly

---

## Corrected Time Range Logic

### New Rule: Use Vehicle-Specific Timeline

| Metric | Start Date | End Date |
|--------|------------|----------|
| Average Income per Day | Vehicle `created_at` | Last income record date |
| Average Cost per Day | Vehicle `created_at` | Last expense record date |

### Key Insight: Vehicle `created_at` Already Exists

Looking at the database schema, the `vehicles` table already has a `created_at` column (line 802 in types.ts):
```typescript
vehicles: {
  Row: {
    created_at: string  // ✓ Already exists!
    ...
  }
}
```

**No database migration needed** - we just need to fetch and use this existing field.

---

## Implementation Details

### 1. Update VehicleFinanceTabProps Interface

Add a new prop to pass the vehicle's creation date:

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
  vehicleYear: number;
  vehicleCreatedAt?: string | null;  // NEW: Vehicle added date
}
```

### 2. Update VehicleDetails.tsx

Pass the vehicle's `created_at` to the VehicleFinanceTab:

```typescript
<VehicleFinanceTab 
  vehicleId={vehicleId || ""} 
  vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} 
  purchasePrice={vehicle.purchase_price}
  marketValueAtPurchase={vehicle.market_value_at_purchase}
  purchaseDate={vehicle.purchase_date}
  currentMileage={vehicle.mileage}
  initialMileage={vehicle.initial_mileage}
  vehicleType={vehicle.vehicle_type}
  vehicleYear={vehicle.year}
  vehicleCreatedAt={vehicle.created_at}  // NEW
/>
```

### 3. Update VehicleDetail.tsx (Page)

Ensure the vehicle's `created_at` is included when transforming the data:

```typescript
const vehicleData: Vehicle = {
  // ... existing fields ...
  created_at: data.created_at  // NEW: Add this field
};
```

### 4. Refactor Calculation Logic in VehicleFinanceTab

**Remove**: `fetchUserRegistrationDate()` function and `userRegistrationDate` state

**Add**: Logic to find last income/expense record dates from existing `records` state

**New calculation functions**:

```typescript
// Get the last income record date from fetched records
const getLastIncomeDate = (records: FinanceRecord[]): Date | null => {
  const incomeRecords = records.filter(r => r.type === 'income');
  if (incomeRecords.length === 0) return null;
  const sortedDates = incomeRecords.map(r => new Date(r.date)).sort((a, b) => b.getTime() - a.getTime());
  return sortedDates[0];
};

// Get the last expense record date from fetched records
const getLastExpenseDate = (records: FinanceRecord[]): Date | null => {
  const expenseRecords = records.filter(r => r.type === 'expense');
  if (expenseRecords.length === 0) return null;
  const sortedDates = expenseRecords.map(r => new Date(r.date)).sort((a, b) => b.getTime() - a.getTime());
  return sortedDates[0];
};

// Calculate days between vehicle creation and last record
const getDaysForMetric = (
  vehicleCreatedAt: string | null | undefined,
  lastRecordDate: Date | null
): number => {
  if (!vehicleCreatedAt || !lastRecordDate) return 0;
  const startDate = new Date(vehicleCreatedAt);
  return Math.max(1, differenceInDays(lastRecordDate, startDate) + 1);
};
```

**Updated calculations**:

```typescript
const lastIncomeDate = getLastIncomeDate(records);
const lastExpenseDate = getLastExpenseDate(records);

const daysForIncome = getDaysForMetric(vehicleCreatedAt, lastIncomeDate);
const daysForExpense = getDaysForMetric(vehicleCreatedAt, lastExpenseDate);

// Average Income per Day = Total Income / Days from vehicle added to last income
const avgIncomePerDay = daysForIncome > 0 ? totalRevenue / daysForIncome : null;

// Average Cost per Day = Total Expenses / Days from vehicle added to last expense
const avgCostPerDay = daysForExpense > 0 ? totalExpenses / daysForExpense : null;
```

---

## UI Changes

### 1. Add "/ day" Label Consistency

Currently: `€{avgIncomePerDay.toFixed(2)}`
Updated: `€{avgIncomePerDay.toFixed(2)} / day`

Apply to both Average Income and Average Cost metrics.

### 2. Add Colored Row Accents

Add subtle left border colors to each row for visual separation:

| Metric | Accent Color |
|--------|-------------|
| Avg Rental Price | Orange (`border-l-2 border-l-orange-400`) |
| Avg Income/Day | Green (`border-l-2 border-l-green-400`) |
| Avg Cost/Day | Red (`border-l-2 border-l-red-400`) |

### 3. Handle Empty States

- If no income records: Show `—` for Avg Income/Day
- If no expense records: Show `—` for Avg Cost/Day

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/VehicleDetail.tsx` | Add `created_at` to Vehicle interface and vehicleData transformation |
| `src/components/fleet/VehicleDetails.tsx` | Pass `created_at` prop to VehicleFinanceTab |
| `src/components/fleet/VehicleFinanceTab.tsx` | Update props, remove user registration logic, add new calculation functions, update UI with `/day` labels and color accents |

---

## Expected Results

### Before (Incorrect)

Using user registration (e.g., 365 days ago):
- Total Income: €3,000
- Average Income/Day: €8.22

### After (Correct)

Using vehicle lifecycle (added 30 days ago, last income 25 days after adding):
- Total Income: €3,000
- Days counted: 26 (from vehicle added to last income record)
- Average Income/Day: €115.38

This gives a realistic, vehicle-specific performance metric.

---

## Visual Preview of Updated UI

```text
┌────────────────────────────────────────────────┐
│  Vehicle Averages                              │
├────────────────────────────────────────────────┤
│ ▌ Avg Rental Price      €85.00 / day          │  ← Orange accent
│ ▌ Avg Income/Day        €45.50 / day          │  ← Green accent
│ ▌ Avg Cost/Day          €12.30 / day          │  ← Red accent
└────────────────────────────────────────────────┘
```
