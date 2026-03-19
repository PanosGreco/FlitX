

# Plan: Fix Financial Analysis — Data Integrity, Unit Clarity, Sanity Checks, and Table Rendering

## Data Validation Results

I verified all pre-computed values against the actual database. The numbers ARE mathematically correct:
- Total revenue: €11,680 (39 bookings) — verified per-vehicle
- Fixed costs: €34,800/year (€1,700 salary + €1,200 insurance, both monthly) — correct
- Break-even: 129 bookings — correct

The root cause of bad AI output is NOT wrong calculations but a **unit mismatch in presentation**: `daily_rate` (per-day) is shown alongside `variable_cost_per_booking` and `net_profit_per_booking` (per-booking, spanning 3-7 days). The AI then incorrectly compares them, e.g., "Jeep daily rate €80 < var cost €161.54 = needs +143% increase" — but the Jeep actually earns €316/booking over 3.2 days on average.

## Changes

### 1. `supabase/functions/ai-chat/index.ts` — `computeFinancialContext()`

**a) Add `avgRevenuePerBooking` and `avgBookingDuration` per vehicle:**

```
avgBookingDuration = totalDaysRented / bookingCount
avgRevenuePerBooking = bookingRevenue / bookingCount
```

These are the correct per-booking metrics to compare against `variableCostPerBooking`.

**b) Add data integrity validation before computing:**
- Skip bookings with `total_amount <= 0` or `null` from revenue calculations (but count them for booking volume)
- Flag bookings with duration > 90 days or duration = 0 as anomalies
- Ensure maintenance costs are only counted for the vehicle they belong to (already correct, but add explicit logging)

**c) Add sanity/outlier checks (flags, not blockers):**
- `varCostExceedsRevenue`: true if `variableCostPerBooking > avgRevenuePerBooking`
- `unrealisticDuration`: true if any booking has duration > 90 days
- `extremeProfit`: true if `netProfitPerBooking > avgRevenuePerBooking * 0.95` (suspiciously high margin)
- Include these flags in the debug snapshot and in the context string as warnings

**d) Fix status classification to use consistent units:**
Current code compares `netProfitPerBooking < dailyRate * 0.15` — this mixes per-booking and per-day. Change to:
```
if netProfitPerBooking <= 0 → 'loss'
if netProfitPerBooking < avgRevenuePerBooking * 0.15 → 'low_margin'
else → 'healthy'
```

**e) Update formatted context string:**
- Replace `Daily Rate` label with `Daily Rate (per day)` 
- Add `Avg Revenue/Booking (multi-day): €X` per vehicle
- Add `Avg Booking Duration: X days` per vehicle
- Add sanity warnings section if any flags are true

### 2. `supabase/functions/ai-chat/index.ts` — Prompt Instructions

**Financial Analysis (`getFinancialAnalysisInstructions()`):**
- Update table columns: replace `Daily Rate` with `Avg Revenue/Booking` for the analysis table
- Keep `Daily Rate` as reference only
- Add rule: "Status MUST match profitability: if net_profit > 0, status cannot be 'loss'"
- Add rule: "Never compare daily_rate directly with per-booking metrics"

**Pricing Optimizer (`getPricingOptimizerInstructions()`):**
- Change comparison: `suggested_daily_price >= variable_cost_per_booking / avg_booking_duration`
- Add: "Current Price = daily rate (per day). Variable Cost = per booking (multi-day). To compare, divide variable cost by avg booking duration."
- Enforce: "If status is 'healthy', max daily price change = ±50%. Only exceed this for 'loss' vehicles."
- Add: "No contradictory statements: a vehicle cannot be both 'healthy' AND 'at a loss'"

### 3. `src/components/ai-assistant/MessageBubble.tsx` — Table Rendering

Add ReactMarkdown component mappings:
```tsx
table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border-collapse">{children}</table></div>
thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>
tbody: ({ children }) => <tbody>{children}</tbody>
tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>
th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold border border-gray-200">{children}</th>
td: ({ children }) => <td className="px-2 py-1.5 border border-gray-200">{children}</td>
```

### 4. `src/i18n/locales/{en,el,it,es,de,fr}/ai.json` — Missing Keys

Add `todayUsage`, `newChat`, `history`, `noConversations` with translations for all 6 languages.

## Files Modified

1. `supabase/functions/ai-chat/index.ts` — per-vehicle metrics, sanity checks, prompt clarity
2. `src/components/ai-assistant/MessageBubble.tsx` — table rendering
3. `src/i18n/locales/{en,el,it,es,de,fr}/ai.json` — missing keys

## What This Fixes

- **Pricing optimizer giving +240%/+143%**: Root cause was comparing daily_rate (€35/day) vs var_cost_per_booking (€96.67/booking spanning 4+ days). Now the AI gets `avgBookingDuration` to normalize.
- **"Healthy" AND contradictory statements**: Status classification now uses consistent per-booking units.
- **Tables not rendering**: Added missing ReactMarkdown component mappings.
- **Data integrity**: Anomalous bookings (0 days, >90 days, €0 revenue) are flagged without blocking execution.

