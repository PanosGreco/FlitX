# Analytics — Component Tree & Responsibilities

This document details every component in the Analytics section, its responsibilities, data inputs, and rendering logic.

---

## Component Hierarchy

```
Finance.tsx (page — /finances route)
│
├── AppLayout (shared layout wrapper)
│
├── FinanceDashboard.tsx (main dashboard orchestrator)
│   ├── Profile Header (avatar, company name)
│   ├── Timeframe Selector (week/month/year/all/custom)
│   ├── Summary Cards ×3 (Income / Expenses / Net Income)
│   ├── BarChart (Income vs Expenses by time bucket)
│   ├── LineChart (Cumulative trend over time)
│   ├── IncomeBreakdown.tsx
│   │   ├── Source table (walk_in, collaboration, other, additional costs)
│   │   ├── Vehicle category breakdown table
│   │   ├── Income pie chart (with <5% grouping)
│   │   └── Top 5 most profitable vehicles (avg profit/day)
│   ├── ExpenseBreakdown.tsx
│   │   ├── Category + subcategory expansion table
│   │   ├── Vehicle category breakdown table
│   │   ├── Expense pie chart (with <5% grouping and parent-based colors)
│   │   └── Top 5 least profitable vehicles (avg profit/day)
│   ├── AssetTrackingWidget.tsx
│   │   └── useUserAssets hook → user_asset_categories + user_assets
│   ├── Transaction List (inline, last 5 + "View All" dialog)
│   ├── RecurringTransactionsModal.tsx
│   │   ├── Income/Expense split view
│   │   ├── Fixed cost badge
│   │   ├── Generate button (manual trigger)
│   │   └── AddRecurringTransactionDialog.tsx
│   └── Delete confirmation (AlertDialog)
│
├── Add Record Dialog
│   ├── Income form (source selector, amount, date, vehicle, VAT toggle)
│   ├── Expense form (category, subcategory, amount, date, vehicle)
│   ├── Vehicle Sale form (vehicle selector, sale price, date)
│   ├── IncomeSourceSelector component
│   └── VatControl.tsx (VAT toggle + rate input)
│
└── VatControl.tsx (localStorage-persisted VAT settings)
```

---

## Finance.tsx (Page Component)

**File:** `src/pages/Finance.tsx` (~970 lines)

**Responsibilities:**
- **State owner:** `financialRecords`, `vehicles`, `isLoading`
- **Data fetching:** `fetchFinancialRecords()` and `fetchVehicles()` on mount
- **Real-time subscription:** Listens to `postgres_changes` on `financial_records` table
- **Add Record dialog:** Manages form state for income, expense, and vehicle sale entries
- **Form submission:** `handleSubmitFinanceRecord()` and `handleSubmitVehicleSale()`
- **VAT handling:** When enabled, auto-creates a matching tax expense record
- **Maintenance sync:** When expense category is `maintenance`, also inserts into `vehicle_maintenance`

**Key behaviors:**
- Fetches ALL vehicles (including sold) for the Add Record dialog
- Re-fetches data when `language` context changes (to update translations)
- Real-time channel ensures dashboard stays current across browser tabs

---

## FinanceDashboard.tsx (Main Dashboard)

**File:** `src/components/finances/FinanceDashboard.tsx` (~849 lines)

**Props:**
```typescript
interface FinanceDashboardProps {
  onAddRecord?: () => void;          // Opens Add Record dialog
  financialRecords?: FinancialRecord[]; // All records from Finance.tsx
  isLoading?: boolean;
  onRecordDeleted?: () => void;      // Triggers re-fetch after delete
}
```

**Responsibilities:**
- **Filter state:** Owns `timeframe` and `customRange`, computes `filteredRecords` via `useMemo`
- **Summary cards:** Computes `totalIncome`, `totalExpenses`, `netProfit` from `filteredRecords`
- **Vehicle profit ranking:** Computes `vehicleProfitRanking` (avg profit/day) from ALL records (not filtered)
- **Transaction list:** Uses `allTransactions` (ALL records, sorted by `created_at` desc) — independent of timeframe
- **Delete cascade:** `handleDeleteTransaction()` handles all delete scenarios
- **Profile header:** Fetches and displays company name + avatar
- **Recurring trigger:** Invokes `process-recurring-transactions` edge function on mount (fire-and-forget)

**Critical design decisions:**
- `filteredRecords` drives charts and breakdowns (timeframe-aware)
- `allTransactions` drives the transaction list (always ALL records)
- `vehicleProfitRanking` uses ALL records (lifetime metric, not timeframe-dependent)

---

## IncomeBreakdown.tsx

**File:** `src/components/finances/IncomeBreakdown.tsx` (~438 lines)

**Props:** `financialRecords` (pre-filtered), `vehicles`, `lang`, `timeframe`, `vehicleProfitRanking`

**Layout:** 12-column grid — Source table (5 cols) | Vehicle category (2 cols) | Pie + Top vehicles (5 cols)

**Income source aggregation logic:**
- Records are grouped by a composite key:
  - `walk_in` → "Direct Booking"
  - `collaboration` + specification → "Collaboration (Partner Name)"
  - `other` + specification → specification as standalone label
  - `additional` category → parsed from description pattern: `"Insurance - Full Coverage (Additional Cost)"`
- Each group shows: total amount, top 2 months with percentage

**Vehicle category breakdown:**
- Groups income by `vehicle.type` (SUV, Sedan, etc.)
- Skips records with no valid vehicle category
- Uses `getVehicleCategoryLabel()` for localized display

**Pie chart (<5% grouping):**
- Slices with `value < 5%` are merged into "Other (<5%)"
- Tooltip on "Other" shows constituent items
- Dominant minor slice's color is used for the grouped slice

**Top 5 vehicles:**
- Sorted by `avgProfitPerDay` descending from `vehicleProfitRanking`
- Shows vehicle name and formatted avg profit/day

---

## ExpenseBreakdown.tsx

**File:** `src/components/finances/ExpenseBreakdown.tsx` (~489 lines)

**Layout:** Identical 12-column grid as IncomeBreakdown

**Category aggregation:**
- Categories with subcategories expand: `maintenance_Oil Change`, `other_Rent`, `tax_Income Tax`
- Labels inherit parent category translations with subcategory appended
- `other` subcategories display as standalone (e.g., "Rent" not "Other (Rent)")

**Color system:**
- Parent-based: all maintenance subcategories share Red, all tax share Yellow, etc.
- Defined in `PARENT_CATEGORY_COLORS` constant
- Prevents visual fragmentation when many subcategories exist

**Fuel type breakdown table:**
- Groups expenses by `vehicle_fuel_type` from financial records
- Uses `getFuelTypeLabel()` for localized fuel type names

**Least profitable vehicles:**
- Sorted by `avgProfitPerDay` ascending from `vehicleProfitRanking`
- Shows bottom 5 vehicles

---

## AssetTrackingWidget.tsx

**File:** `src/components/finances/AssetTrackingWidget.tsx` (~311 lines)

**Hook:** `useUserAssets()` → manages `user_asset_categories` and `user_assets` tables

**Behaviors:**
- **Auto-creates vehicle categories:** On first load, creates categories for each `vehicle_type` in the fleet (Cars, Motorbikes, ATVs, etc.)
- **Vehicle assets:** Lists all non-sold vehicles under their type category with inline value editing
- **Custom categories:** User can add custom categories (e.g., "Equipment", "Property") with custom asset items
- **Debounced upsert:** `handleDebouncedUpsert()` with 600ms delay prevents rapid-fire DB writes during typing
- **Grand total:** Computed at render time by accumulating category totals (mutable `grandTotal` variable reset before render)

---

## RecurringTransactionsModal.tsx

**File:** `src/components/finances/RecurringTransactionsModal.tsx` (~467 lines)

**Layout:** Two-column split — Income rules (left, green) | Expense rules (right, red)

**Features:**
- **Card-based UI:** Each rule shows category, description, amount, frequency, dates, vehicle, fixed cost badge
- **Completed rules:** Inactive rules are dimmed (`opacity-60`) with "Completed" badge
- **Generate button:** Manual trigger for `generateDueTransactions()` — same catch-up logic as edge function
- **Fixed cost badge:** Amber badge with pin icon for `is_fixed_cost` expense rules
- **Total fixed costs:** Displayed at bottom of expense column

---

## VatControl.tsx

**File:** `src/components/finances/VatControl.tsx` (~48 lines)

**Purpose:** Checkbox toggle + rate input for VAT on income records

**Persistence:** VAT rate stored in `localStorage` via `useVatSettings()` hook (key: `fleetx_vat_rate`, default: 10%)

**Behavior:** When enabled during income entry, an automatic tax expense record is created with `amount * (vatRate / 100)`

---

## charts.tsx

**File:** `src/components/finances/charts.tsx` (~537 lines)

**Exports:** `BarChart`, `LineChart`, `PieChart`

### BarChart
- **Data:** `aggregateByTimeBuckets()` — income and expenses per time bucket
- **Bucket logic:** Daily for week/month, monthly for year/all, adaptive for custom
- **Sampling:** For month view with >15 days, shows every 3rd day; for all/custom with >20 points, samples every Nth point
- **Colors:** Income = `#22c55e` (green), Expenses = `#ef4444` (red)

### LineChart
- **Data:** `aggregateCumulative()` — running totals up to each bucket's end date
- **Lines:** Income (green), Expenses (red), Net Income (`#3b82f6` blue)
- **Rendering:** No dots, 2.5px stroke, monotone interpolation, no animation
- **Behavior:** Lines stay flat (horizontal) during periods with no new records

### PieChart
- **Data:** `aggregateByCategory()` — expense distribution by category
- **Grouping:** Categories <5% merged into "Other (<5%)"

### Time Bucket Generation (`getTimeBuckets`)

| Timeframe | Bucket Type | Label Format |
|---|---|---|
| Week | Daily | `EEE` (Mon, Tue...) |
| Month | Daily | `d` (1, 2, 3...) |
| Year | Monthly | `MMM` (Jan, Feb...) |
| All | Monthly | `MMM yy` (Jan 25...) |
| Custom ≤31d | Daily | `d MMM` |
| Custom 32-120d | Weekly | `d MMM` |
| Custom >120d | Monthly | `MMM yy` |
