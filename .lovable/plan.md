

# Plan: Analytics Section Documentation — Multi-File Structure

## Overview

Create a structured documentation folder at `/documentation/analytics/` with 7 focused markdown files instead of one monolithic file. Each file covers a specific aspect of the Analytics system.

## Files to Create

### 1. `/documentation/analytics/README.md` (~150 lines)
**System-level context and navigation index.**
- Where Analytics fits in FlitX (relationship diagram with Fleet, Reservations, Home, AI Assistant)
- Source of truth per data type:
  - `financial_records` = authoritative for all income/expense display
  - `rental_bookings` = authoritative for booking data; syncs TO `financial_records`
  - `vehicle_maintenance` = authoritative for maintenance; syncs TO `financial_records`
  - `recurring_transactions` = rules that generate `financial_records`
  - `user_assets` / `user_asset_categories` = asset tracking (independent)
- Links to each sub-document

### 2. `/documentation/analytics/data-flow.md` (~250 lines)
**Step-by-step data lifecycles.**
- Booking lifecycle: `UnifiedBookingDialog` → `rental_bookings` INSERT → `financial_records` INSERT (rental income + additional costs + optional VAT expense) → real-time subscription triggers `fetchFinancialRecords()` → `filteredRecords` updates → charts/breakdowns re-render → AI reads via edge function SQL
- Maintenance lifecycle: Manual entry via Finance Add Record → `financial_records` INSERT + `vehicle_maintenance` INSERT → same propagation
- Recurring transaction lifecycle: Rule created → `process-recurring-transactions` edge function (pg_cron hourly + frontend fallback on mount) → catch-up loop (max 100 iterations) → duplicate prevention via date+amount+category check → `financial_records` INSERT → auto-deactivation when `end_date` reached
- Vehicle sale lifecycle: Sale dialog → depreciation calculation → profit/loss `financial_records` INSERT → vehicle marked `is_sold` → excluded from active fleet
- Delete cascade: booking-linked delete removes booking + all linked records + daily_tasks + storage files; vehicle sale delete reverses `is_sold`; maintenance delete removes matching `vehicle_maintenance` row

### 3. `/documentation/analytics/components.md` (~300 lines)
**Component tree and responsibilities.**
- `Finance.tsx` (page): Owns `financialRecords` state, `vehicles` state, Add Record dialog, real-time subscription, form submission logic
- `FinanceDashboard.tsx`: Owns `timeframe` filter state, renders summary cards, charts, breakdowns, transaction list, recurring modal trigger
- `IncomeBreakdown.tsx`: Source-based aggregation (walk_in, collaboration, other, additional), vehicle category breakdown, pie chart with <5% grouping, top 5 profitable vehicles by avg profit/day
- `ExpenseBreakdown.tsx`: Category + subcategory expansion, vehicle category breakdown, fuel type breakdown, pie chart, top 5 costliest vehicles
- `AssetTrackingWidget.tsx`: Auto-creates vehicle categories from fleet, debounced inline editing (600ms), grand total computation
- `RecurringTransactionsModal.tsx` + `AddRecurringTransactionDialog.tsx`: CRUD for recurring rules, fixed cost marking
- `VatControl.tsx`: localStorage-persisted VAT rate toggle
- `charts.tsx`: `BarChart` (income vs expense by time bucket), `LineChart` (cumulative trend), `PieChart` (category distribution). Adaptive bucket sizing via `getTimeBuckets()`.

### 4. `/documentation/analytics/formulas.md` (~200 lines)
**All calculations and derived metrics.**
- `totalIncome = sum(filtered records where type === 'income')`
- `totalExpenses = sum(filtered records where type === 'expense')`
- `netProfit = totalIncome - totalExpenses`
- `avgProfitPerDay = (vehicleIncome - vehicleExpenses) / activeDays` (days since `created_at`)
- Vehicle sale: `profitOrLoss = salePrice - max(0, purchasePrice - vehicleNetIncome)`
- VAT auto-expense: `vatAmount = incomeAmount * (vatRate / 100)`
- Fixed cost annualization: `month → amount * (12/freq_value)`, `week → amount * (52/freq_value)`, `year → amount * (1/freq_value)`
- Depreciation: time-based curve (model year lookup) + two-tier mileage (base rate + excess penalty)
- Pie chart grouping: categories < 5% of total → "Other (<5%)" with tooltip listing constituents

### 5. `/documentation/analytics/state-management.md` (~150 lines)
**Where state lives and how it propagates.**
- `Finance.tsx`: `financialRecords` (all records), `vehicles`, `isLoading` — fetched on mount + real-time subscription refresh
- `FinanceDashboard.tsx`: `timeframe` (filter), `customRange`, `filteredRecords` (memoized from `financialRecords` + `timeframe`) — drives all charts and breakdowns
- Transaction list: always uses unfiltered `financialRecords` (independent of timeframe)
- `vehicleProfitRanking`: memoized from ALL records (not filtered) — lifetime metric
- Filter propagation: `timeframe` change → `filterByCalendarTimeframe()` → new `filteredRecords` → all child components re-render with new data
- `useVatSettings()`: localStorage only (not DB-persisted), rate survives page refresh
- Real-time: Supabase channel on `financial_records` table, any `INSERT/UPDATE/DELETE` triggers full refetch

### 6. `/documentation/analytics/edge-cases.md` (~150 lines)
**Error handling, edge cases, and safeguards.**
- Empty datasets: charts render empty axes, breakdown tables show "No income/expenses for this period"
- Duplicate prevention (recurring): checks `financial_records` for existing record matching `user_id + date + category + amount + description` before insert
- Recurring catch-up cap: max 100 iterations per rule per run to prevent runaway generation
- Recurring auto-deactivation: `is_active = false` when `next_generation_date > end_date`
- Failed sync: silent failure on recurring frontend trigger (backend cron is primary); toast on manual record insert failure
- Booking delete cascade: deletes storage files, daily_tasks, all linked financial_records, then booking itself — partial failure leaves orphan records
- Zero-division protection: `activeDays = Math.max(1, ...)` in profit/day calculation
- Data integrity in AI: bookings with duration > 90 days or amount ≤ 0 are flagged and excluded from AI analysis

### 7. `/documentation/analytics/ai-integration.md` (~200 lines)
**How financial data feeds the AI Assistant.**
- `computeFinancialContext()` in `supabase/functions/ai-chat/index.ts`: runs on `financial_analysis` and `pricing_optimizer` actions
- Data fetched: `vehicles`, `rental_bookings` (12-month window), `vehicle_maintenance` (12-month window), `recurring_transactions` (for fixed costs)
- Pre-computed metrics (NOT generated by AI): `avgRevenuePerBooking`, `variableCostPerBooking`, `contributionPerBooking`, `utilization`, `targetDailyRate`, `demandLevel`, `status`, `breakEvenBookings`
- Sold vehicle handling: time-aware filtering — pre-sale data included in global totals, excluded from per-vehicle table
- Sanity checks: flags var cost > revenue, unrealistic durations, extreme margins — included as warnings in context string
- AI receives a formatted text string with all metrics; AI formats the presentation but does NOT compute any numbers
- Prompt constraints: no contradictory status labels, consistent units (per-booking vs per-day clearly labeled), ±50% price cap for profitable vehicles

### 8. `/documentation/analytics/performance.md` (~100 lines)
**Scaling considerations and optimizations.**
- All `financial_records` fetched in one query (no pagination) — scales to ~1000 rows (Supabase default limit)
- `filteredRecords`, `vehicleProfitRanking`, `allTransactions` are memoized with `useMemo`
- Charts: `getTimeBuckets()` generates O(days_in_range) buckets; aggregation is O(records × buckets) — fine for < 10K records
- Asset widget: debounced upsert (600ms) prevents rapid-fire DB writes
- Recurring processing: capped at 100 iterations; hourly cron prevents accumulation
- Future optimizations: server-side aggregation for large datasets, pagination for transaction list, incremental real-time updates instead of full refetch

## Files Modified
1-8: All new files in `/documentation/analytics/`

