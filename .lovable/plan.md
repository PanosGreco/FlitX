

# Plan: Enhanced Financial Analysis — Sold Vehicle Handling, Contribution Margin, Utilization, and Data-Driven Pricing

## Changes

### 1. `supabase/functions/ai-chat/index.ts` — `computeFinancialContext()`

**a) Time-aware sold vehicle handling (lines ~362-374):**

Instead of blindly excluding sold vehicles, filter intelligently:
- Separate vehicles into `activeVehicles` (not sold) and `soldVehicles` (is_sold = true)
- For sold vehicles: include their bookings/maintenance only for the period BEFORE `sale_date`
- For active vehicles: include all bookings/maintenance within the 12-month window
- Only active vehicles appear in the per-vehicle breakdown table
- Sold vehicle revenue/costs still count toward global totals for the period they were active

```text
recentBookings filtering:
  - If vehicle is sold AND booking.start_date > vehicle.sale_date → exclude
  - If vehicle is sold AND booking.start_date <= vehicle.sale_date → include in global totals only
  - Active vehicles → include normally
```

**b) Add Contribution Margin per vehicle (lines ~460-473):**

New metric computed per vehicle:
```
contributionPerBooking = avgRevenuePerBooking - variableCostPerBooking
```
This is the amount each booking contributes toward covering fixed costs and profit. Used for:
- Break-even: `breakEvenBookings = ceil(totalFixedCostsAnnual / weightedAvgContribution)`
- Status classification
- Pricing decisions

**c) Add Utilization metrics per vehicle (new block after line ~456):**

```
availableDays = days vehicle was in the fleet during the 12-month window
  - For active vehicles: min(365, days since purchase or start of window)
  - For sold vehicles: days between max(window_start, purchase_date) and sale_date
bookedDays = totalDaysRented (already computed)
utilization = bookedDays / availableDays (0-1 ratio, as percentage)
```

**d) Replace "Demand" with data-driven classification (replaces subjective AI guessing):**

Computed per vehicle based on utilization and booking frequency:
```
avgFleetUtilization = sum(all vehicle utilizations) / activeVehicleCount
if utilization > avgFleetUtilization * 1.2 → 'high'
if utilization > avgFleetUtilization * 0.8 → 'medium'
else → 'low'
```

**e) Improved status classification (replaces lines 464-473):**

Multi-factor status using contribution margin and utilization:
```
if bookingCount === 0 → 'insufficient_data'
if contributionPerBooking <= 0 → 'loss'
if contributionPerBooking < (totalFixedCostsAnnual / totalActiveBookings) → 'below_fixed_cost_share'
if utilization < 0.15 → 'underutilized'
if contributionPerBooking > 0 && utilization >= 0.15 → 'profitable'
```

**f) Add target price per vehicle:**

```
fixedCostSharePerBooking = totalFixedCostsAnnual / totalActiveBookings
targetRevenuePerBooking = variableCostPerBooking + fixedCostSharePerBooking + (profitMargin * avgRevenuePerBooking)
targetDailyRate = targetRevenuePerBooking / avgBookingDuration
```
Where `profitMargin` = 0.15 (15% target margin). This gives the AI a concrete "should-be" price.

**g) Update formatted context string:**

Add per vehicle: `contributionPerBooking`, `utilization`, `demandLevel`, `targetDailyRate`, `availableDays`

**h) Break-even recalculation:**

```
weightedAvgContribution = totalBookingRevenue - totalMaintenanceCost (for active fleet only) / totalActiveBookings
breakEvenBookings = ceil(totalFixedCostsAnnual / weightedAvgContribution)
```

### 2. `supabase/functions/ai-chat/index.ts` — Prompt Instructions

**Financial Analysis (`getFinancialAnalysisInstructions()`):**
- Update table columns to include `Contribution/Booking` and `Utilization %`
- Replace "Status: healthy/loss" with new multi-factor labels
- Add rule: "Status reflects BOTH unit profitability AND contribution to fixed costs"

**Pricing Optimizer (`getPricingOptimizerInstructions()`):**
- Replace subjective "Demand: High/Medium/Low" with pre-computed `demandLevel` from utilization data
- Add `Target Daily Rate` column to pricing table (the data-driven recommendation)
- Update pricing rules to reference target price: "Suggested price should converge toward Target Daily Rate"
- Keep ±50% cap for profitable vehicles

### 3. No other file changes needed

All changes are within the edge function.

## Expected Impact

With "hhh bbb" handled as time-aware sold vehicle:
- Its pre-sale bookings still count in global totals for accuracy
- It no longer appears in the per-vehicle table
- Break-even uses only active fleet contribution margins

New metrics provide the AI with concrete, data-driven values instead of subjective guesses:
- `utilization: 42%` instead of AI guessing "High demand"
- `targetDailyRate: €75` instead of AI suggesting +240%
- `contributionPerBooking: €154` instead of raw profit with no fixed-cost context

## Files Modified

1. `supabase/functions/ai-chat/index.ts` — sold vehicle filtering, contribution margin, utilization, target pricing, prompt updates

