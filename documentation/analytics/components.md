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
│   │   └── Left-border color accents + bottom growth indicators
│   ├── Secondary KPI Cards ×3
│   │   ├── Total Bookings (with Avg Rental Period sub-metric)
│   │   ├── Avg Income per Booking
│   │   └── Avg Cost per Booking
│   ├── Charts Row (3-column grid on lg+)
│   │   ├── BarChart (Income vs Expenses by time bucket)
│   │   │   └── Granularity toggle (Daily/Weekly/Monthly/Yearly)
│   │   ├── LineChart (Cumulative trend over time)
│   │   │   └── Granularity toggle (Daily/Weekly/Monthly/Yearly)
│   │   └── MarketingScatterPlot (Marketing spend vs Revenue correlation)
│   │       └── Independent month/year filtering
│   ├── IncomeBreakdown.tsx
│   │   ├── Source table (%, Growth columns; 15-row limit + expansion)
│   │   ├── Vehicle category breakdown table
│   │   ├── Income pie chart (with <5% grouping)
│   │   └── Top 5 most profitable vehicles (avg profit/day)
│   ├── ExpenseBreakdown.tsx
│   │   ├── Category + subcategory expansion table (%, Growth columns; 15-row limit + expansion)
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

**File:** `src/components/finances/FinanceDashboard.tsx` (~1046 lines)

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
- **Summary cards:** Computes `totalIncome`, `totalExpenses`, `netProfit` from `filteredRecords`, plus real period-over-period growth percentages
- **Secondary KPI cards:** Computes `totalBookings`, `avgRentalDays`, `avgIncomePerBooking`, `avgCostPerBooking` from timeframe-filtered bookings
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

## Summary Cards (SummaryCard component)

**Defined inline** in `FinanceDashboard.tsx` as a private component.

**Design:**
- **Left-border color accents**: Each card has a 4px colored left border — green for Income, red for Expenses, blue for Net Income (via `border-l-4` + `border-l-green-500`/`border-l-red-500`/`border-l-blue-500`)
- **Bottom growth indicators**: Below the main value, a `border-t` separator shows the period-over-period growth percentage with a TrendingUp/TrendingDown icon and a "from last period" label
- **Growth computation**: Real period-over-period changes computed in `summaryData` via `useMemo`. For each timeframe, the previous comparable period is calculated (e.g., this week vs last week, this month vs last month). The growth formula is: `((current - previous) / previous) * 100`. For "All Time" timeframe, growth is always 0 (no prior period).
- **Trend reversal**: Expenses use `trendReversed=true` — an increase in expenses shows a red indicator (bad), while a decrease shows green (good)

---

## Secondary KPI Cards (KpiCard component)

**Defined inline** in `FinanceDashboard.tsx` as a private component.

Three cards in a 3-column grid below the Summary Cards:

| Card | Value | Format | Accent | Secondary Metric |
|---|---|---|---|---|
| Total Bookings | Count of bookings in timeframe | number | slate (neutral) | Avg Rental Period (e.g., "~3.5 days") |
| Avg Income per Booking | Sum of income with `booking_id` ÷ total bookings | currency (€) | green | — |
| Avg Cost per Booking | Total expenses ÷ total bookings | currency (€) | red | — |

**Design:**
- 4px colored left border matching the accent color (green/red/slate)
- Context-colored icon background (e.g., green-50 bg + green-600 icon for income)
- `text-xl` font for the main value
- Optional secondary metric displayed below a `border-t` separator as a small badge

**Data flow:**
- `periodBookings` is computed via `useMemo` by filtering `bookings` array to the current timeframe date range
- `avgRentalDays` computes inclusive day count per booking (end - start + 1), then averages across all period bookings
- `avgIncomePerBooking` sums only income records that have a `booking_id` (excluding manual income)

---

## MarketingScatterPlot

**File:** `src/components/finances/MarketingScatterPlot.tsx`

**Purpose:** Visualizes the correlation between marketing spend and revenue on a scatter plot, helping users identify ROI patterns.

**Data:** Uses `financial_records` — marketing expenses (`category='marketing'`) and income records, aggregated by month.

**Features:**
- Independent month/year filter selector (not tied to the dashboard timeframe)
- Multi-colored dots representing different time periods
- Sits in the charts row alongside BarChart and LineChart (3-column grid on `lg+`)

**Wrapper:** The Card + CardHeader for MarketingScatterPlot is in `FinanceDashboard.tsx` (unlike BarChart/LineChart which have their Card wrapper built in).

---

## charts.tsx

**File:** `src/components/finances/charts.tsx` (~621 lines)

**Exports:** `BarChart`, `LineChart`, `PieChart`

### BarChart

- **Data:** `aggregateByTimeBuckets()` — income and expenses per time bucket
- **Bucket logic:** Granularity-dependent (daily/weekly/monthly/yearly)
- **Card wrapper:** Built into the BarChart component (includes CardHeader with title and optional granularity toggle)
- **Granularity toggle:** Displayed in the card header's top-right corner. Local `granularity` state resets to default via `useEffect` when `timeframe` or `customRange` changes.
  - Toggle visibility rules:
    - **Hidden** (no toggle): This Week, This Year, short Custom ranges (≤14 days)
    - **Daily / Weekly**: This Month, Custom 15–62 days
    - **Monthly / Yearly**: All Time, Custom >730 days
    - Custom 63–730 days: hidden (no meaningful toggle pair)
- **X-axis label thinning:** All data points are always rendered (no data sampling). X-axis labels are thinned via the Recharts `interval` prop based on data length (see Performance docs for formula).
- **Colors:** Income = `#22c55e` (green), Expenses = `#ef4444` (red)

### LineChart

- **Data:** `aggregateCumulative()` — running totals up to each bucket's end date
- **Card wrapper:** Built into the LineChart component (same pattern as BarChart)
- **Granularity toggle:** Same visibility rules and reset behavior as BarChart
- **Lines:** Income (green), Expenses (red), Net Income (`#3b82f6` blue)
- **Rendering:** No dots, 2.5px stroke, monotone interpolation, no animation
- **Behavior:** Lines stay flat (horizontal) during periods with no new records

### PieChart

- **Data:** `aggregateByCategory()` — expense distribution by category
- **Grouping:** Categories <5% merged into "Other (<5%)"

### Time Bucket Generation (`getTimeBuckets`)

| Timeframe | Default Granularity | Label Format |
|---|---|---|
| Week | Daily | `d MMM` |
| Month | Daily | `d MMM` |
| Year | Monthly | `MMM` (single year) or `MMM yy` |
| All | Monthly | `MMM` or `MMM yy` |
| Custom ≤62d | Daily | `d MMM` |
| Custom >62d | Monthly | `MMM` or `MMM yy` |

### Bug Fixes (Recent)

1. **Bar visibility**: Previously hid 2/3 of days on "This Month" by data-filtering. Now shows all bars, thins only X-axis labels.
2. **"All Time" trailing months**: Previously extended to today even when the last record was older. Now ends at the last record date.
3. **Bucket type detection**: Previously used fragile string-length detection. Now reads `bucketType` field directly.
4. **Custom Range dates**: Previously used min/max of record dates. Now respects user-picked `customRange` start/end dates.

---

## IncomeBreakdown.tsx

**File:** `src/components/finances/IncomeBreakdown.tsx` (~623 lines)

**Props:** `financialRecords` (pre-filtered), `allRecords` (all records for growth calc), `vehicles`, `lang`, `timeframe`, `vehicleProfitRanking`, `customRange`

**Layout:** 12-column grid — Source table (5 cols) | Vehicle category (2 cols) | Pie + Top vehicles (5 cols)

**Income source table columns:**

| Column | Description |
|---|---|
| Source | Income source label with color dot |
| Total | Formatted amount in € |
| % | Percentage of total income (`Math.round(item.total / grandTotal * 100)`) |
| Growth | Period-over-period growth percentage with TrendingUp/TrendingDown icon; "New" badge for sources with no prior-period data |

- **Row limit:** Maximum 15 visible rows (`MAX_VISIBLE_ROWS`). If more rows exist, a "View Full Table" button expands to show all sources in a Dialog.
- **Growth calculation:** For standard timeframes, compares current period total against the equivalent prior period (e.g., this month vs last month). For "All Time", calculates average month-over-month growth rate via `calcAvgMonthlyGrowth()`.

**Income source aggregation logic:**
- Records are grouped by a composite key:
  - `walk_in` → "Direct Booking"
  - `collaboration` + specification → "Collaboration (Partner Name)"
  - `other` + specification → specification as standalone label
  - `additional` category → parsed from description pattern: `"Insurance - Full Coverage (Additional Cost)"`

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

**File:** `src/components/finances/ExpenseBreakdown.tsx` (~699 lines)

**Layout:** Identical 12-column grid as IncomeBreakdown

**Expense table columns:** Same structure as IncomeBreakdown — Category, Total, %, Growth — with 15-row limit and View Full Table expansion dialog.

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
