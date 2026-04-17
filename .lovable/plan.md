

# Plan: CRM Phase 5 — Analytics Charts

## Summary
Add three analytics charts above the customer table on `/crm`: Accident Cost by Age Group (bar), Customer Location Distribution (dual pie), and Insurance Profitability (grouped bar). Data fetched via a new dedicated hook. No DB changes.

## New Files (4)

| File | Purpose |
|------|---------|
| `src/hooks/useCRMChartData.ts` | Parallel-fetch accidents (joined to bookings + insurance_types), customers (birth_date, location), and insurance income from booking_additional_costs. Computes age groups, location distribution (<5% grouped to "Other"), insurance revenue vs business-paid costs |
| `src/components/crm/charts/AccidentByAgeChart.tsx` | Recharts BarChart (orange bars), 5 age buckets (18-22, 23-30, 31-45, 46-60, 61+), shows total_damage_cost |
| `src/components/crm/charts/LocationDistributionChart.tsx` | Two donut PieCharts side-by-side (Countries / Cities), gray "Other" slice |
| `src/components/crm/charts/InsuranceProfitabilityChart.tsx` | Grouped BarChart: green revenue vs orange business losses per insurance type, with net profit summary row below |

## Modified Files (7)

| File | Change |
|------|--------|
| `src/pages/CRM.tsx` | Import chart components + `useCRMChartData`; insert 3-column responsive grid (`grid-cols-1 lg:grid-cols-3 gap-4`) between header and `CRMFilterBar` |
| `src/i18n/locales/{en,el,de,fr,it,es}/crm.json` | Merge ~17 new chart keys per file (titles, axis labels, empty states, tooltips) |

## Technical Details

### Data sources
- **Accidents**: `accidents` joined to `rental_bookings(insurance_type_id, insurance_types(name_original))` for insurance attribution
- **Customers**: `customers.birth_date` (age via `differenceInYears`), `country`, `city`
- **Insurance revenue**: `booking_additional_costs` filtered by `name='Insurance'`, grouped by `insurance_type` text field

### Chart styling (matches existing `src/components/finances/charts.tsx`)
- Container: `bg-white rounded-xl shadow-sm border border-slate-200 p-4`
- Header: uppercase tracking-wide xs muted-foreground
- Chart height: `h-64` (single) / `h-52` (per pie)
- Reuses existing COLORS palette
- Each chart handles its own loading (Skeleton) and empty states internally

### Layout
```
Header (title + Add Accident button)
↓
[Age Chart] [Location Chart] [Insurance Chart]   ← NEW row
↓
Filter Bar
Customer Table
Accident History
```

### Insurance profitability logic
1. Sum `amount` from `booking_additional_costs` grouped by `insurance_type` → revenue
2. Sum `amount_paid_by_business` from accidents grouped by joined `insurance_types.name_original` → cost
3. Union of insurance types from both maps → `netProfit = revenue - cost`
4. Net summary row: green if ≥0, red if <0

### Location <5% grouping
Sort by count desc, accumulate slices below 5% into single "Other" entry colored `#94a3b8`.

## What stays untouched
- CustomerTable, CustomerTableRow, CRMFilterBar, AddAccidentDialog, AccidentHistory, useCustomers
- Finance charts (`src/components/finances/charts.tsx`)
- No DB migrations

