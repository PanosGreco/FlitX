

# Plan: Enhanced Financial Analysis — IMPLEMENTED

## Changes Made

### `supabase/functions/ai-chat/index.ts`

1. **Vehicle interface**: Added `is_sold`, `sale_date`, `sale_price`, `purchase_date` fields
2. **Time-aware sold vehicle filtering**: Pre-sale bookings/maintenance count in global totals; sold vehicles excluded from per-vehicle table
3. **Contribution margin**: `contributionPerBooking = avgRevenuePerBooking - variableCostPerBooking`
4. **Contribution-based break-even**: `breakEvenBookings = ceil(totalFixedCostsAnnual / weightedAvgContribution)`
5. **Utilization**: `bookedDays / availableDays` per vehicle, with `availableDays` adjusted for purchase date
6. **Data-driven demand**: `high/medium/low/none` based on utilization vs fleet average (no AI guessing)
7. **Target daily rate**: Covers var cost + fixed cost share + 15% profit margin per vehicle
8. **Multi-factor status**: `profitable`, `below_fixed_cost_share`, `underutilized`, `loss`, `insufficient_data`
9. **Updated prompts**: Both financial analysis and pricing optimizer use new columns and enforce consistency rules
