# Analytics — State Management

This document explains where state lives, how it propagates, and how updates trigger re-renders.

---

## 1. State Architecture Overview

```
Finance.tsx (page-level state)
│
├── financialRecords: FinancialRecord[]    ← All records, fetched from DB
├── vehicles: Vehicle[]                     ← All vehicles (including sold)
├── isLoading: boolean                      ← Loading indicator
├── isAddFinanceOpen: boolean               ← Add Record dialog state
├── Form state: recordType, amount, date, notes, selectedVehicleId,
│               expenseCategory, expenseSubcategory, incomeSourceType,
│               incomeSourceSpecification, vatEnabled, etc.
│
└── Passes to FinanceDashboard:
     financialRecords, isLoading, onAddRecord, onRecordDeleted

FinanceDashboard.tsx (dashboard-level state)
│
├── timeframe: TimeframeType                ← 'week' | 'month' | 'year' | 'all' | 'custom'
├── customRange: DateRange | undefined      ← Start/end dates for custom timeframe
├── filteredRecords: FinancialRecord[]      ← DERIVED (useMemo from financialRecords + timeframe)
├── allTransactions: FinancialRecord[]      ← DERIVED (useMemo, ALL records sorted by created_at)
├── vehicleProfitRanking: VehicleProfitRank[] ← DERIVED (useMemo, ALL records)
├── vehicles: Vehicle[]                     ← Fetched independently (includes type, vehicle_type)
├── showAllTransactions: boolean            ← View All dialog toggle
├── deleteTransactionId: string | null      ← Delete confirmation state
├── isRecurringOpen: boolean                ← Recurring modal toggle
├── profileData: { name, company_name, avatar_url }
│
└── Passes to children:
     filteredRecords → BarChart, LineChart, IncomeBreakdown, ExpenseBreakdown
     vehicles → IncomeBreakdown, ExpenseBreakdown
     vehicleProfitRanking → IncomeBreakdown (top 5), ExpenseBreakdown (bottom 5)
```

---

## 2. Data Fetching

### Finance.tsx

| Data | Trigger | Method |
|---|---|---|
| `financialRecords` | Mount, language change, real-time event | `fetchFinancialRecords()` → `supabase.from('financial_records').select('*')` |
| `vehicles` | Mount, language change | `fetchVehicles()` → `supabase.from('vehicles').select('id, make, model, year, fuel_type, is_sold')` |

### FinanceDashboard.tsx

| Data | Trigger | Method |
|---|---|---|
| `vehicles` | Mount (user change) | `fetchVehicles()` → `supabase.from('vehicles').select('id, make, model, year, type, vehicle_type, created_at')` |
| `profileData` | Mount (user change) | `fetchProfile()` → `supabase.from('profiles').select(...)` |
| Recurring processing | Mount (fire-and-forget) | `supabase.functions.invoke('process-recurring-transactions')` |

**Note:** `FinanceDashboard` fetches vehicles separately from `Finance.tsx` because it needs additional fields (`type`, `vehicle_type`, `created_at`) that the parent doesn't fetch.

---

## 3. Derived State (useMemo)

### filteredRecords
```typescript
const filteredRecords = useMemo(() => {
  return filterByCalendarTimeframe(financialRecords, timeframe, customRange);
}, [financialRecords, timeframe, customRange]);
```
**Dependencies:** `financialRecords` (from parent), `timeframe` (local), `customRange` (local)
**Impact:** Drives all charts and breakdowns

### allTransactions
```typescript
const allTransactions = useMemo(() => {
  return [...financialRecords].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}, [financialRecords]);
```
**Dependencies:** `financialRecords` only
**Impact:** Transaction list (ALWAYS shows all records, independent of timeframe)

### vehicleProfitRanking
```typescript
const vehicleProfitRanking = useMemo(() => {
  // Aggregates ALL records by vehicle, calculates avgProfitPerDay
}, [financialRecords, vehicles]);
```
**Dependencies:** `financialRecords` + `vehicles`
**Impact:** Top/bottom vehicle lists in IncomeBreakdown and ExpenseBreakdown

---

## 4. Filter Propagation

```
User selects timeframe → setTimeframe(value)
  │
  ├─ If 'custom': user sets customStartDate + customEndDate
  │    → useEffect creates customRange: DateRange
  │    → filteredRecords recomputed
  │
  ├─ If not 'custom': customRange cleared
  │    → filteredRecords recomputed with getCalendarDateRange()
  │
  └─ filteredRecords change triggers:
       ├─ Summary cards recalculate (totalIncome, totalExpenses, netProfit)
       ├─ BarChart re-renders with new aggregated data
       ├─ LineChart re-renders cumulative from new data
       ├─ IncomeBreakdown re-aggregates source/category data
       └─ ExpenseBreakdown re-aggregates category data
```

**Important:** Transaction list is NOT affected by timeframe changes.

---

## 5. Real-time Updates

```typescript
// Finance.tsx, useEffect on mount
const channel = supabase
  .channel('financial_records_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'financial_records' }, 
    (payload) => {
      fetchFinancialRecords(); // Full refetch
    }
  )
  .subscribe();
```

**Behavior:**
- Any INSERT, UPDATE, or DELETE on `financial_records` triggers a full refetch
- New `financialRecords` array flows down to `FinanceDashboard`
- All derived state (filteredRecords, allTransactions, vehicleProfitRanking) recompute
- All charts and breakdowns re-render

**Limitation:** Full refetch on every change. No incremental updates.

---

## 6. VAT Settings Persistence

```
useVatSettings() hook
  │
  ├─ State: vatRate (number)
  ├─ Storage: localStorage key 'fleetx_vat_rate'
  ├─ Default: 10 (%)
  └─ Not persisted to database — per-browser setting
```

The VAT rate is read on component mount from localStorage and survives page refreshes, but does not sync across devices.

---

## 7. Asset Widget State

```
useUserAssets() hook
  │
  ├─ categories: AssetCategory[]  ← from user_asset_categories
  ├─ assets: UserAsset[]          ← from user_assets
  ├─ loading: boolean
  │
  └─ Methods: addCategory, deleteCategory, upsertAsset, deleteAsset
       All update local state optimistically + sync to DB
```

**Debouncing:** Inline edits use `setTimeout(upsertAsset, 600)` to avoid writing to DB on every keystroke.

---

## 8. Update Trigger Summary

| User Action | State Change | Components Re-rendered |
|---|---|---|
| Change timeframe | `timeframe` → `filteredRecords` | Summary cards, BarChart, LineChart, IncomeBreakdown, ExpenseBreakdown |
| Add record (manual) | DB insert → real-time event → `financialRecords` | Everything |
| Create booking | DB insert → real-time event → `financialRecords` | Everything |
| Delete transaction | DB delete + cascade → real-time event → `financialRecords` | Everything |
| Edit asset value | Debounced DB update → local state update | AssetTrackingWidget only |
| Change language | `language` context → re-fetch + re-render | Everything (translation keys) |
