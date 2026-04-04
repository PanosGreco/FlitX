

# Plan: Scatter Plot Refinements + Growth Indicator Fix

## 1. MarketingScatterPlot.tsx — Visual Refinements

**1a. Restructure controls layout** — Move Monthly/Yearly toggle to top-right, period chips below right-aligned:
- Replace single flex row with `space-y-2 mb-3` container
- Toggle in `flex justify-end` wrapper
- Chips in `flex justify-end overflow-x-auto` wrapper with gradient fade on left edge for scroll hint

**1b. Multi-colored dots** — Add `DOT_COLORS` palette (12 colors) at top of component. Update `<Cell>` to use `DOT_COLORS[index % length]`. Add a color legend below the chart mapping each dot color to its period label.

**1c. Axis labels** — Add `label` prop to both `<XAxis>` (marketingSpend, insideBottom) and `<YAxis>` (bookingRevenue, angle -90, insideLeft). Increase bottom/left margins to accommodate labels.

**1d. Scroll gradient hint** — Add a relative wrapper around the chips row with a `pointer-events-none` gradient overlay on the left edge using pseudo-element or an absolute-positioned div.

## 2. FinanceDashboard.tsx — Fix Growth Indicators

**Replace** the `calculateSummaryData()` function (lines 499-515) and `const summaryData = calculateSummaryData()` (line 517) with a single `useMemo` that:
- Computes current period totals from `filteredRecords` (same as now)
- Computes previous period by determining the equivalent prior date range based on `timeframe` (week/month/year/custom)
- Filters `financialRecords` (unfiltered) for the previous period
- Calculates percentage change: `((current - prev) / prev) * 100`, with 0% fallback for zero denominators
- For "all" timeframe: returns 0% (no comparison possible)

**New imports needed**: `startOfWeek`, `startOfMonth`, `startOfYear`, `subWeeks`, `subMonths`, `subYears` from `date-fns`

## 3. Translation Keys

Verify `marketingSpend` and `bookingRevenue` exist in all 6 locales (already added in previous step — just confirm, no changes expected).

## Files Modified
1. `src/components/finances/MarketingScatterPlot.tsx` — layout, colors, axis labels, legend, scroll hint
2. `src/components/finances/FinanceDashboard.tsx` — replace `calculateSummaryData` with `useMemo`, add date-fns imports

## Not Modified
- Charts, breakdowns, assets, transactions, KpiCard, delete logic, recurring modal — all untouched

