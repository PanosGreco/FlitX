# AI Chat — Formulas

## Core Principle

**AI does NOT calculate.** All metrics below are pre-computed server-side in `computeFinancialContext()` and `buildBusinessContext()`. The AI model receives them as formatted text and is instructed to use values "EXACTLY as given."

---

## Global Metrics (from `computeFinancialContext()`)

All computed over a **12-month rolling window**, active fleet only.

| Metric | Formula | Notes |
|--------|---------|-------|
| `weightedAvgRentalPrice` | `totalActiveBookingRevenue / totalActiveBookings` | Weighted by actual revenue, not simple average of daily rates |
| `globalVariableCostPerBooking` | `totalActiveMaintenanceCost / totalActiveBookings` | Maintenance cost spread across all bookings |
| `weightedAvgContribution` | `(totalActiveBookingRevenue - totalActiveMaintenanceCost) / totalActiveBookings` | Revenue minus variable cost, per booking |
| `breakEvenBookings` | `ceil(totalFixedCostsAnnual / weightedAvgContribution)` | Contribution-based break-even |
| `fixedCostSharePerBooking` | `totalFixedCostsAnnual / totalActiveBookings` | Fixed cost allocated per booking |
| `avgFleetUtilization` | `avg(all vehicle utilizations)` | Simple average across all active vehicles |
| `totalCosts` | `totalFixedCostsAnnual + totalActiveMaintenanceCost` | Combined annual costs |

### Fixed Cost Annualization

Recurring transactions where `type = 'expense'`, `is_fixed_cost = true`, `is_active ≠ false`:

| Frequency Unit | Annual Amount |
|---------------|---------------|
| `day` | `amount × (365 / frequency_value)` |
| `week` | `amount × (52 / frequency_value)` |
| `month` | `amount × (12 / frequency_value)` |
| `year` | `amount × (1 / frequency_value)` |

---

## Per-Vehicle Metrics (from `computeFinancialContext()`)

Computed for **active vehicles only** (not sold). 17 metrics per vehicle:

| Metric | Formula |
|--------|---------|
| `avgRevenuePerBooking` | `vehicleBookingRevenue / vehicleValidBookingCount` |
| `variableCostPerBooking` | `vehicleMaintenanceCost / vehicleValidBookingCount` |
| `contributionPerBooking` | `avgRevenuePerBooking - variableCostPerBooking` |
| `netProfitPerBooking` | Same as contribution (per-booking level) |
| `avgBookingDuration` | `totalDaysRented / validBookingCount` |
| `totalDaysRented` | `sum(max(1, ceil((end - start) / 1 day)))` per valid booking |
| `utilization` | `totalDaysRented / availableDays` |
| `availableDays` | `max(1, ceil((now - windowStart) / 1 day))` where windowStart = max(purchaseDate, 12moAgo) |
| `targetDailyRate` | `(variableCostPerBooking + fixedCostSharePerBooking + 15% × avgRevenuePerBooking) / avgBookingDuration` |

### Status Classification (Multi-Factor)

Applied in strict priority order:

```
IF bookingCount = 0        → 'insufficient_data'
IF contribution ≤ 0        → 'loss'
IF contribution < fixedCostSharePerBooking → 'below_fixed_cost_share'
IF utilization < 0.15      → 'underutilized'
ELSE                       → 'profitable'
```

### Demand Level Classification

Relative to fleet average utilization:

```
IF bookingCount = 0                         → 'none'
IF utilization > avgFleetUtilization × 1.2  → 'high'
IF utilization > avgFleetUtilization × 0.8  → 'medium'
ELSE                                        → 'low'
```

---

## Data Integrity Validation

Before computing metrics, bookings are validated:

| Condition | Action |
|-----------|--------|
| Duration > 90 days | EXCLUDED, anomaly logged |
| Amount ≤ 0 | EXCLUDED, anomaly logged |
| Sold vehicle + booking after sale_date | EXCLUDED from active fleet metrics |

---

## Sanity Warnings

Generated when data indicates potential issues:

- `variableCostPerBooking > avgRevenuePerBooking` → "Var cost EXCEEDS avg revenue — LOSS"
- `avgBookingDuration > 30` → "Unusually long booking duration"

---

## Business Context Metrics (from `buildBusinessContext()`)

### Per-Vehicle Financials
| Metric | Formula |
|--------|---------|
| `totalIncome` | `sum(financial_records WHERE vehicle_id = X AND type = 'income')` |
| `totalExpenses` | `sum(financial_records WHERE vehicle_id = X AND type = 'expense')` |
| `netProfit` | `totalIncome - totalExpenses` |
| `profitMargin` | `(netProfit / totalIncome) × 100` |
| `bookingCount` | `count(rental_bookings WHERE vehicle_id = X)` |
| `daysRented` | `sum(max(1, ceil(endDate - startDate)))` |
| `avgRevenuePerBooking` | `totalIncome / bookingCount` |

### Rankings (Pre-Computed)
- **By Profit**: `vehicleFinancials.sort(netProfit DESC)`
- **By Bookings**: `vehicleFinancials.sort(bookingCount DESC)`
- **By Revenue**: `vehicleFinancials.sort(totalIncome DESC)`

### Expense Breakdown
- **By Category**: `sum(amount) GROUP BY category` → sorted by amount DESC
- **By Subcategory**: nested — `category → subcategory → sum(amount)`
- **Monthly Subcategory**: `month → category → subcategory → sum(amount)` (last 6 months displayed)

### Collaboration Partners
- `totalIncome`: all-time sum for partner
- `ytdIncome`: current year sum for partner
- `recordCount`: number of financial records
- Sorted by `ytdIncome DESC`

### Monthly Vehicle Profitability
- Per vehicle per month: `income - expenses`
- `mostProfitableByMonth`: highest net profit vehicle for each month

### Fleet Distributions
- **By Vehicle Type** (car, motorbike, atv): count + maintenance cost + records
- **By Category** (SUV, economy, sedan): count + maintenance cost + records
- **By Fuel Type** (petrol, diesel, hybrid): count + maintenance cost + records
- **By Transmission** (manual, automatic): count + maintenance cost + records

### Recurring Expense Normalization (for display)
```
monthly_amount =
  year  → amount / 12
  week  → amount × 4
  day   → amount × 30
  month → amount (as-is)
```

---

## CALC_DESIRED Formula

Used by both Financial Analysis and Pricing Optimizer presets:

```
required_bookings = ceil((total_costs + desired_income) / weighted_avg_contribution)
```

Pricing Optimizer additionally computes:
```
required_avg_daily_price = (total_costs + desired_income) / (total_bookings × avg_fleet_booking_duration)
```

---

## Zero-Division Protection

All formulas check denominators before division:
- `totalActiveBookings > 0` before computing averages
- `vValidCount > 0` before per-vehicle metrics
- `weightedAvgContribution > 0` before break-even
- `totalIncome > 0` before profit margin
- `availableDays > 0` before utilization (floor at 1 via `Math.max(1, ...)`)
