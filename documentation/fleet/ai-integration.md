# Fleet — AI Integration

## Overview

Fleet data is the primary input for AI-powered financial analysis and pricing optimization. This document explains exactly what data flows from Fleet to the AI Assistant and how it's processed.

---

## Data Pipeline

```
Fleet Data (DB)          Edge Function               AI Model
──────────────────────────────────────────────────────────────
vehicles            →                            
rental_bookings     →   computeFinancialContext() →  Formatted text
vehicle_maintenance →   (pre-computes all          context string
recurring_trans.    →    metrics)                  → AI formats
                                                    presentation
                                                    (no computation)
```

---

## Data Fetched by AI Context

The `computeFinancialContext()` function in `supabase/functions/ai-chat/index.ts` reads:

### 1. Vehicles
```sql
SELECT * FROM vehicles WHERE user_id = $1
```
Fields used: `id`, `make`, `model`, `year`, `type`, `vehicle_type`, `daily_rate`, `is_sold`, `sale_date`, `sale_price`, `created_at`, `fuel_type`, `transmission_type`

### 2. Rental Bookings (12-month window)
```sql
SELECT * FROM rental_bookings 
WHERE user_id = $1 
AND start_date >= NOW() - INTERVAL '12 months'
```
Fields used: `vehicle_id`, `start_date`, `end_date`, `total_amount`, `status`

### 3. Vehicle Maintenance (12-month window)
```sql
SELECT * FROM vehicle_maintenance
WHERE user_id = $1
AND date >= NOW() - INTERVAL '12 months'
```
Fields used: `vehicle_id`, `cost`, `type`

### 4. Recurring Transactions (fixed costs only)
```sql
SELECT * FROM recurring_transactions
WHERE user_id = $1 AND is_fixed_cost = true AND is_active = true
```
Used for: fixed cost annualization and per-vehicle share calculation

---

## Pre-Computed Metrics (per vehicle)

All metrics are calculated in the edge function — the AI model receives numbers, not raw data.

### Revenue Metrics
```typescript
avgRevenuePerBooking = totalRevenue / bookingCount
// null if bookingCount === 0
```

### Cost Metrics
```typescript
variableCostPerBooking = totalMaintenanceCost / bookingCount
// Maintenance costs treated as variable costs proportional to usage
```

### Contribution Analysis
```typescript
contributionPerBooking = avgRevenuePerBooking - variableCostPerBooking
// Positive = vehicle covers its variable costs per booking
```

### Utilization
```typescript
bookedDays = sum(booking durations)
availableDays = daysSinceCreation (or daysSinceSale for sold vehicles)
utilization = bookedDays / availableDays
// Expressed as percentage (0-100%)
```

### Demand Level
```typescript
fleetAvgUtilization = mean(all vehicles' utilization)
if (utilization > fleetAvgUtilization * 1.2) demandLevel = "high"
else if (utilization > fleetAvgUtilization * 0.8) demandLevel = "medium"
else demandLevel = "low"
```

### Target Daily Rate
```typescript
fixedCostShare = annualFixedCosts / activeVehicleCount / 365
avgBookingDuration = totalBookedDays / bookingCount
targetDailyRate = (variableCostPerBooking + fixedCostShare * avgBookingDuration + margin) / avgBookingDuration
// margin = 15% of (variable + fixed)
```

### Vehicle Status Classification
```typescript
if (bookingCount < 3) status = "insufficient_data"
else if (contributionPerBooking < 0) status = "loss"
else if (contributionPerBooking < fixedCostShare) status = "below_fixed_cost_share"
else if (utilization < fleetAvgUtilization * 0.6) status = "underutilized"
else status = "profitable"
```

---

## Sold Vehicle Handling

- **Pre-sale bookings**: Included in global fleet totals (revenue, costs, booking count)
- **Post-sale bookings**: None (vehicle excluded from booking selectors after sale)
- **Per-vehicle table**: Sold vehicles excluded — only active vehicles appear in AI's per-vehicle analysis
- **Time-aware filtering**: AI context uses `sale_date` to correctly attribute pre-sale data

---

## Sanity Checks

Before passing data to the AI, the context builder flags anomalies:

| Check | Condition | Action |
|-------|-----------|--------|
| Variable cost > revenue | `variableCostPerBooking > avgRevenuePerBooking` | Warning flag in context |
| Unrealistic duration | `booking duration > 90 days` | Excluded from per-booking averages |
| Zero revenue | `totalRevenue === 0 && bookingCount > 0` | Flagged as data quality issue |
| Extreme margins | `margin > 200%` | Warning flag |

---

## AI Constraints

The AI prompt includes these constraints:
- No contradictory status labels (can't be both "profitable" and "loss")
- Consistent units: per-booking vs per-day clearly labeled
- ±50% price cap for profitable vehicles (suggested rate within 50% of current)
- All numbers formatted with currency symbols and 2 decimal places
- AI presents and explains — does NOT recompute any values

---

## What AI Does NOT Access

- `vehicle_documents` — not relevant for financial analysis
- `damage_reports` — not included in financial context
- `vehicle_reminders` — scheduling data, not financial
- `daily_tasks` — operational tasks, not analyzed by AI
- Vehicle images — not processed or analyzed
