

# Plan: Fix Financial Analysis — Pre-computation, Edge Cases, and Prompt Optimization

## Overview

The current financial analysis fails because: (1) revenue uses `totalIncome` from `financial_records` instead of `rental_bookings.total_amount`, (2) the system prompt is ~15K tokens causing truncation, and (3) the AI calculates instead of receiving pre-computed values. This fix moves all math to the backend, slims the prompt, and adds robust edge-case handling.

## Changes

### 1. `supabase/functions/ai-chat/index.ts`

**a) Add `computeFinancialContext()` function** (new function, ~120 lines)

Pre-computes all financial metrics deterministically. Called only when `presetType` is `financial_analysis` or `pricing_optimizer`.

- **12-month filter**: Compute `twelveMonthsAgo` date, filter `bookings`, `maintenanceRecords`, and `recurringTransactions` to this window
- **Revenue from bookings**: `totalBookingRevenue = sum(rental_bookings.total_amount)` — NOT `financial_records` income
- **Division-by-zero guards**:
  - `totalBookings === 0` → all division-based metrics = 0, flag `insufficientBookings = true`
  - `vehicleBookings === 0` → `variableCostPerBooking = 0`, `netProfitPerBooking = dailyRate`, flag vehicle as `insufficient_data`
- **Fixed cost normalization** based on `frequency_unit` and `frequency_value`:
  - `month` → `amount * (12 / frequency_value)`
  - `week` → `amount * (52 / frequency_value)`
  - `year` → `amount * (1 / frequency_value)` (already annual)
  - `day` → `amount * (365 / frequency_value)`
  - fallback (unknown) → treat as monthly
  - Only active expenses where `is_fixed_cost = true`
- **Pre-computed metrics**: `weightedAvgRentalPrice`, `totalFixedCosts`, `totalMaintenanceCost`, `totalCosts`, `globalVariableCostPerBooking`, `breakEvenBookings`
- **Per-vehicle breakdown**: For each vehicle: `bookingCount`, `bookingRevenue`, `maintenanceCost`, `variableCostPerBooking`, `netProfitPerBooking`, `status` (insufficient_data / loss / low_margin / healthy)
- **Monthly breakdown**: bookings + revenue grouped by month (last 12)
- **Debug snapshot**: `console.log` a compact JSON of all computed values for debugging
- Returns a formatted string block ready to inject into the system prompt

**b) Modify `buildSystemPrompt()`** to accept optional `financialContext` parameter

When `presetType` is `financial_analysis` or `pricing_optimizer`:
- Use a **slim base prompt** (~3-4K tokens) containing:
  - Language instruction (FIRST, before all data)
  - Business overview (company, location, fleet size)
  - The pre-computed financial context block (from step a)
  - The preset-specific instructions
- **Exclude** for financial presets: fleet by type/category/fuel/transmission, collaboration partners, monthly subcategory breakdown, damage reports, full data availability section, full behavioral rules (replaced with short financial-specific rules)

**c) Update the main handler** (around line 90-101):
- After `buildBusinessContext()`, check if `presetType` is financial
- If yes, call `computeFinancialContext()` with the raw data arrays
- Pass result to `buildSystemPrompt()`

**d) Simplify both preset prompt texts**:
- Remove formula definitions (formulas are pre-computed)
- Add: "The values below are pre-computed and verified. Use them EXACTLY as given. Do NOT recalculate."
- Keep output structure and formatting rules
- Keep CALC_DESIRED handler but reference pre-computed `totalCosts` and `weightedAvgRentalPrice`
- Keep data sufficiency gate (now backed by pre-computed `insufficientData` flag)

### 2. No other file changes needed

The UI files (`PresetActionButtons.tsx`, `useAIChat.ts`, `ai.json`) were already updated in the previous implementation. This change is entirely within the edge function.

## Key Technical Decisions

- **Revenue source**: `rental_bookings.total_amount` (correct) instead of `financial_records` income (wrong — includes all income sources)
- **Fixed cost normalization**: Annual total calculated per `frequency_unit` and `frequency_value`, not blindly `×12`
- **Zero-safe**: Every division is guarded — returns 0 or safe default, never NaN/Infinity
- **Debug logging**: `console.log('[FINANCIAL_DEBUG]', JSON.stringify(snapshot))` — visible in edge function logs, not exposed to users
- **Prompt reduction**: From ~15K to ~3-4K tokens by excluding irrelevant sections for financial presets

