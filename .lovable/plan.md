
# Plan: CRM Phase 5 — Final Polish

## Summary
Pure visual polish — no logic, no DB, no new files.

## Changes

### 1. `src/components/crm/charts/LocationDistributionChart.tsx`
- Sub-headers "Countries"/"Cities" already are siblings of `ResponsiveContainer` (good), but the `Legend` is overlapping. Force `Legend` `verticalAlign="bottom"` and shrink legend area.
- Increase per-pie container to `min-h-[180px]`, add `gap-6` between columns, drop any `overflow-hidden` on inner content.

### 2. `src/components/crm/charts/InsuranceProfitabilityChart.tsx`
- Remove the inline `<p>` subtitle.
- Header becomes a flex row: title (left) + `Info` icon `Popover` (right) showing `chart_insuranceProfitabilityHint` in a `w-72` popover.

### 3. `src/components/crm/charts/AccidentByAgeChart.tsx`
- Already `min-h-[340px]`; no change needed beyond verification.

### 4. `src/components/crm/CustomerTable.tsx`
- Replace `Eye` import with `Info`.
- Replace `Tooltip` on Accident € header with `Popover` (`w-72`), with `e.stopPropagation()` on trigger and content so click ≠ sort.
- Add `bg-slate-50` to the header `<TableRow>` (both loading and data states).
- `overflow-x-auto` and `whitespace-nowrap` are already in place.

### 5. `src/i18n/locales/{en,el,de,fr,it,es}/crm.json`
- Overwrite `accidentAmountExplanation` with new clearer Popover wording.

## Files NOT touched
CRM.tsx, useCRMChartData, useCustomers, CRMFilterBar, AddAccidentDialog, AccidentHistory, CustomerTableRow, any non-CRM file, any DB migration.
