

# Plan: Replace "Top Mo." with Growth/Decline Column

## Overview
Replace the "Top Months" column in both breakdown tables with a "Growth" column showing percentage change vs. the previous equivalent period. For "all" timeframe, calculate average monthly growth rate across all months with data.

## Part 1 — FinanceDashboard.tsx (2 lines changed)
Pass `allRecords={financialRecords}` to both `<IncomeBreakdown>` and `<ExpenseBreakdown>` (lines 623-629, 632-638). Also pass `customRange={customRange}`.

## Part 2 — IncomeBreakdown.tsx

**Props**: Add `allRecords?: FinancialRecord[]` and `customRange?: { startDate: Date; endDate: Date }`.

**Growth logic** (new `useMemo`):
- Helper `getPreviousPeriodRange(timeframe, customRange)`:
  - `week`: previous Mon-Sun before current week start
  - `month`: previous calendar month
  - `year`: previous calendar year
  - `custom`: N days immediately before custom start
  - `all`: special — compute average monthly MoM growth rate
- For each source in `incomeBySource`, filter `allRecords` (type=income) to previous period, match by same categoryKey logic, compute `growth = round(((current - prev) / prev) * 100)`.
- For `all` timeframe: group all income records by `YYYY-MM` per source, compute MoM change for each consecutive month pair, average them.
- `isNew = true` when previous total is 0 but current > 0.

**Table changes**:
- Remove `topMonths`/`topMonthsWithPercentage` from the useMemo output, add `growth: number | null` and `isNew: boolean`
- Remove `getMonthName` helper (only used for topMonths; `getMonth` still used in months tracking for pie chart — keep `getMonth` import)
- Header: replace "Top Mo." with `t('growth')`, remove `hidden sm:table-cell`, set `w-[25%]`; adjust Source to `w-[45%]`, Total to `w-[30%]`
- Body cell: show `TrendingUp`/`TrendingDown` icon (h-3 w-3) + colored percentage, "NEW" badge, or "—"
- Import `TrendingDown` and `cn`

## Part 3 — ExpenseBreakdown.tsx
Identical structural changes as IncomeBreakdown:
- Add `allRecords` and `customRange` props
- Growth calculation in `expensesByCategory` useMemo using same period logic
- Same table column replacement
- Remove `topMonths`/`topMonthsWithPercentage`, remove `getMonthName` (check: `getMonth` is used in months tracking — keep it)
- Import `TrendingUp` and `cn`

## Part 4 — Translation keys (6 files)
Add to all `finance.json` locales:
- EN: `"growth": "Growth"`, `"new": "NEW"`
- EL: `"growth": "Μεταβολή"`, `"new": "ΝΕΟ"`
- DE: `"growth": "Wachstum"`, `"new": "NEU"`
- FR: `"growth": "Croissance"`, `"new": "NOUVEAU"`
- IT: `"growth": "Crescita"`, `"new": "NUOVO"`
- ES: `"growth": "Crecimiento"`, `"new": "NUEVO"`

## "All" Timeframe — Average Monthly Growth Rate
For the "all" timeframe, each source/category gets its growth calculated as:
1. Group all records (from `allRecords`) for that source by `YYYY-MM`
2. For each consecutive month pair, compute `(monthN - monthN-1) / monthN-1 * 100`
3. Average all those MoM percentages → this is the growth value displayed
4. If only 1 month of data exists → show "—" (not enough data for trend)

This gives "on average, this source grows/declines by X% per month."

## Files Modified
1. `src/components/finances/FinanceDashboard.tsx` — pass `allRecords` + `customRange` props
2. `src/components/finances/IncomeBreakdown.tsx` — growth logic + table column
3. `src/components/finances/ExpenseBreakdown.tsx` — growth logic + table column
4-9. `src/i18n/locales/{en,el,de,fr,it,es}/finance.json` — add 2 keys each

## Not Changed
- Pie charts, vehicle category tables, profit ranking cards
- Chart data processing, asset tracking, transaction list
- Any aggregation logic beyond adding growth field and removing topMonths

