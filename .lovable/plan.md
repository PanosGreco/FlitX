

# Plan: Financial Analysis & Pricing Optimizer AI Actions

## Scope

Add two new AI preset actions to the existing chat system. No new edge functions, no database migrations, no changes to existing presets or financial logic.

## Changes

### 1. Edge Function — `supabase/functions/ai-chat/index.ts`

**a) Update `RecurringTransaction` interface** (line ~199): Add `is_fixed_cost?: boolean` and `is_active?: boolean`.

**b) Add two new presets** to `presetPrompts` (after line 1606):

**`financial_analysis`** prompt with:
- **Data sufficiency gate**: ≥3 vehicles, ≥10 bookings, ≥2 cost entries. If not met → return "not enough data" message in user's language. No partial analysis.
- **Division-by-zero protection**: If `total_bookings = 0` → skip all division-based metrics, return "not enough booking data." If `vehicle_bookings = 0` → set `variable_cost = 0`, mark vehicle as "insufficient data."
- **Strict formulas** (mandatory, deterministic):
  - `Average Rental Price = total_revenue / total_bookings` (weighted)
  - `Variable Cost per Booking (vehicle) = vehicle_maintenance_cost / vehicle_bookings`
  - `Global Variable Cost = total_maintenance / total_bookings`
  - `Total Costs = total_fixed_costs + total_variable_maintenance`
  - `Break-even Bookings = ceil(total_costs / average_rental_price)`
  - `Required Bookings for Target = ceil((total_costs + desired_income) / average_rental_price)`
- **Fixed cost handling**: Fixed costs are GLOBAL only. Per-vehicle profitability = `daily_rate - variable_cost_per_booking`. Do NOT subtract fixed costs per vehicle.
- **Output structure** (strict order, all sections required even if empty):
  1. Executive Summary (max 3 lines + confidence: High/Medium/Low)
  2. Key Metrics (avg price, total costs, break-even, global variable cost)
  3. Per-Vehicle Analysis (name, daily_rate, bookings, variable_cost, net_profit, flag if insufficient data)
  4. Top Performers (top 1 profitable, top 1 underperforming)
  5. Recommendations (revenue upsells: insurance/add-ons/premium; cost reduction)
  6. Monthly Insights (strongest/weakest month, pricing suggestions)
  7. Next Step: `CALC_DESIRED: <amount>` prompt
- **CALC_DESIRED handler**: If message starts with `CALC_DESIRED:`, return: desired income, required bookings, one-sentence insight.
- **Variable cost priority**: Use stored per-vehicle variable cost if available; else compute from maintenance.

**`pricing_optimizer`** prompt with:
- **Same data sufficiency gate and division-by-zero rules**
- **Hard pricing rules**:
  - `suggested_price >= variable_cost_per_booking`
  - Loss vehicles (`price <= variable_cost`): aggressive increase above cost + margin
  - Minimum margin: 15-30% above variable cost
  - High demand → +5-20%, low demand → -5-15%
  - Cap: no >50% jumps unless vehicle is at a loss
- **Per-vehicle**: classify loss/low_margin/healthy, demand vs fleet average, recommend price + % change + reason
- **Seasonality**: group by month, recommend peak/off-peak pricing
- **Revenue opportunities**: insurance, add-ons, premium tiers
- **Confidence indicator** in summary
- **Top performers highlight**
- **Same strict output order and formatting rules**

### 2. Preset Buttons — `src/components/ai-assistant/PresetActionButtons.tsx`

- Import `BarChart3`, `BadgeDollarSign` from lucide-react
- Extend `presetType` union: `'financial_analysis' | 'pricing_optimizer'`
- Add two entries to `PRESET_BUTTONS` array (grid stays `sm:grid-cols-2`, becomes 2x2)

### 3. Conversation Title — `src/hooks/useAIChat.ts`

Update title mapping (line ~264) to include:
- `financial_analysis` → `'Financial Analysis'`
- `pricing_optimizer` → `'Pricing Optimizer'`

### 4. Localization — `ai.json` (all 6 languages)

Add to each language:

```json
"presets": {
  "financialAnalysis": {
    "title": "Financial Analysis",
    "description": "Analyze fleet economics, break-even points and profitability"
  },
  "pricingOptimizer": {
    "title": "Pricing Optimizer",
    "description": "Get dynamic pricing recommendations per vehicle"
  }
},
"notEnoughData": "Not Enough Data",
"addMoreDataForAnalysis": "Add more vehicles, bookings, and expenses to enable accurate financial insights."
```

Translations for EL, IT, ES, DE, FR included.

## Files Modified

1. `supabase/functions/ai-chat/index.ts` — interface update + 2 preset prompts
2. `src/components/ai-assistant/PresetActionButtons.tsx` — 2 new buttons
3. `src/hooks/useAIChat.ts` — title mappings
4. `src/i18n/locales/{en,el,it,es,de,fr}/ai.json` — new keys

## What Does NOT Change

- Existing presets (marketing_growth, expense_optimization)
- Financial logic, booking logic, recurring expenses
- Streaming/SSE infrastructure
- No new edge functions or database migrations

