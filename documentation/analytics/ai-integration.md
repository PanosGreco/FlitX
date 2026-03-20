# Analytics — AI Integration

This document explains how financial data is prepared, pre-computed, and delivered to the AI Assistant for Financial Analysis and Pricing Optimizer responses.

---

## 1. Overview

The AI Assistant has two financial preset actions:
- **Financial Analysis** (`presetType: 'financial_analysis'`)
- **Pricing Optimizer** (`presetType: 'pricing_optimizer'`)

Both trigger `computeFinancialContext()` in `supabase/functions/ai-chat/index.ts`, which pre-computes all financial metrics. The AI receives a formatted text string with concrete numbers and is instructed to **present** the data, not **compute** it.

---

## 2. Data Sources

When a financial preset is triggered, the edge function fetches data in parallel:

| Query | Table | Fields | Scope |
|---|---|---|---|
| `financials` | `financial_records` | `*` | All records for user |
| `vehicles` | `vehicles` | `*` | All vehicles for user |
| `bookings` | `rental_bookings` | Selected fields | All bookings for user |
| `maintenanceRecords` | `vehicle_maintenance` | Selected fields (excludes sensitive) | All for user |
| `recurringTransactions` | `recurring_transactions` | `*` | All for user |
| `profile` | `profiles` | `name, company_name, city, country` | User profile |
| `damageReports` | `damage_reports` | Selected fields (excludes images) | All for user |

---

## 3. computeFinancialContext() — Step by Step

### Step 1: Define 12-Month Window
```
cutoffDate = today - 12 months
Only bookings and maintenance within this window are included.
```

### Step 2: Sold Vehicle Handling (Time-Aware)
```
activeVehicles = vehicles.filter(v => !v.is_sold)
soldVehicles = vehicles.filter(v => v.is_sold)

For each booking/maintenance record:
  If vehicle is sold AND record date > sale_date → EXCLUDE
  If vehicle is sold AND record date ≤ sale_date → INCLUDE in global totals only
  If vehicle is active → INCLUDE normally
```

### Step 3: Data Integrity Validation
```
For each recent booking:
  If duration > 90 days → flag as anomaly, EXCLUDE
  If total_amount ≤ 0 → flag as anomaly, EXCLUDE
  Otherwise → add to validBookings
```

### Step 4: Global Metrics (Active Fleet Only)
```
totalActiveBookings = count of valid bookings for active vehicles
totalActiveBookingRevenue = sum of valid booking amounts for active vehicles
totalActiveMaintenanceCost = sum of maintenance costs for active vehicles
totalFixedCostsAnnual = sum of annualized fixed costs from recurring_transactions
totalCosts = totalFixedCostsAnnual + totalActiveMaintenanceCost
weightedAvgRentalPrice = totalActiveBookingRevenue / totalActiveBookings
globalVariableCostPerBooking = totalActiveMaintenanceCost / totalActiveBookings
weightedAvgContribution = (totalActiveBookingRevenue - totalActiveMaintenanceCost) / totalActiveBookings
fixedCostSharePerBooking = totalFixedCostsAnnual / totalActiveBookings
breakEvenBookings = ceil(totalFixedCostsAnnual / weightedAvgContribution)
```

### Step 5: Per-Vehicle Breakdown (Active Fleet Only)
For each active vehicle:
```
bookingRevenue = sum of valid bookings for this vehicle
maintenanceCost = sum of maintenance for this vehicle
avgRevenuePerBooking = bookingRevenue / validBookingCount
variableCostPerBooking = maintenanceCost / validBookingCount
contributionPerBooking = avgRevenuePerBooking - variableCostPerBooking

Utilization:
  windowStart = max(purchaseDate, 12 months ago)
  availableDays = max(1, days from windowStart to now)
  bookedDays = sum of booking durations
  utilization = bookedDays / availableDays

Target Daily Rate:
  targetRevenuePerBooking = variableCostPerBooking + fixedCostSharePerBooking + (0.15 * avgRevenuePerBooking)
  targetDailyRate = targetRevenuePerBooking / avgBookingDuration

Status:
  'insufficient_data' | 'loss' | 'below_fixed_cost_share' | 'underutilized' | 'profitable'

Demand Level (vs fleet average utilization):
  'high' (>120% of avg) | 'medium' (>80% of avg) | 'low' (<80%) | 'none' (0 bookings)
```

### Step 6: Format Context String
The output is a multi-line text block:
```
═══════════════════════════════════════════════════
PRE-COMPUTED FINANCIAL METRICS (Last 12 Months)
═══════════════════════════════════════════════════
Analysis Period: YYYY-MM-DD to YYYY-MM-DD
Data Sufficiency: ✅ SUFFICIENT / ❌ INSUFFICIENT

GLOBAL METRICS (pre-computed — use EXACTLY as given):
• Total Booking Revenue: €X
• Break-even Bookings: N
• ...

UNIT DEFINITIONS:
• "Daily Rate" = price PER DAY
• "Contribution/Booking" = Avg Revenue/Booking − Var Cost/Booking
• ...

PER-VEHICLE BREAKDOWN (ACTIVE FLEET ONLY):
• Vehicle Name (plate) | Daily Rate: €X | ... | Status: profitable

SOLD VEHICLES (excluded from per-vehicle analysis):
• Vehicle Name (plate) — sold YYYY-MM-DD

SANITY WARNINGS:
⚠️ Vehicle: Var cost exceeds revenue

MONTHLY PERFORMANCE (active fleet):
  2025-01: 14 bookings, €4,380.00 revenue
```

---

## 4. What is Pre-Computed vs. AI-Generated

| Metric | Source | AI Role |
|---|---|---|
| Revenue per booking | Pre-computed | Display only |
| Contribution margin | Pre-computed | Display only |
| Utilization % | Pre-computed | Display only |
| Break-even bookings | Pre-computed | Display only |
| Target daily rate | Pre-computed | Display only |
| Demand level | Pre-computed | Display only |
| Vehicle status | Pre-computed | Display only |
| Executive summary | AI-generated | Synthesize from metrics |
| Recommendations | AI-generated | Based on pre-computed data |
| Strategy advice | AI-generated | Creative synthesis |
| Monthly insights | AI-generated | Based on monthly performance data |

---

## 5. Prompt Constraints

The AI system prompt includes strict rules:

### Financial Analysis Instructions
- Use pre-computed metrics EXACTLY as provided — do not recalculate
- Table must include columns: Vehicle, Avg Revenue/Booking, Avg Duration, Bookings, Var Cost/Booking, Contribution/Booking, Utilization %, Net Profit/Booking, Status
- Status must use multi-factor labels: `profitable`, `underutilized`, `below_fixed_cost_share`, `loss`, `insufficient_data`
- If Data Sufficiency = INSUFFICIENT, add disclaimer

### Pricing Optimizer Instructions
- Use pre-computed `demandLevel` — never guess demand
- Include `Target Daily Rate` column in pricing table
- Suggested price should converge toward Target Daily Rate
- ±50% price cap for profitable vehicles (never suggest >50% increase or decrease)
- Always show `Cost Floor` (minimum viable price based on variable cost)

---

## 6. Debug Logging

The edge function logs a JSON debug snapshot:

```typescript
console.log('[FINANCIAL_DEBUG]', JSON.stringify({
  period, activeVehicles, soldVehicles, totalActiveBookings,
  totalActiveBookingRevenue, totalActiveMaintenanceCost,
  totalFixedCostsAnnual, totalCosts, weightedAvgContribution,
  fixedCostSharePerBooking, breakEvenBookings, insufficientData,
  avgFleetUtilization,
  perVehicle: [{ name, bookings, contribution, utilization, demand, targetDailyRate, status }]
}));
```

This is available in the edge function logs for debugging incorrect AI responses.

---

## 7. Business Context (Non-Financial)

In addition to `computeFinancialContext()`, the `buildBusinessContext()` function provides general fleet data:

- Per-vehicle financials (all-time, from `financial_records`)
- Expense category breakdown
- Expense subcategory breakdown
- Monthly performance (all-time)
- Collaboration partner breakdown (YTD)
- Fleet by vehicle type, category, fuel type, transmission type
- Maintenance summary per vehicle
- Damage report summary per vehicle
- Booking patterns and utilization

This general context is always included in the system prompt, regardless of preset type.

---

## 8. Markdown Table Rendering

AI financial tables are rendered in the client using custom ReactMarkdown components that map `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>` elements to styled components. This ensures consistent table rendering across all 6 supported languages, including right-to-left support and proper cell alignment.
