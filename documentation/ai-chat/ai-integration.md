# AI Chat — AI Integration (Core Architecture)

This is the central document describing how the AI system works end-to-end.

---

## 1. `computeFinancialContext()` — Step by Step

Called **only** for financial presets (`financial_analysis`, `pricing_optimizer`). Produces a formatted text string of pre-computed metrics.

### Step 1: Define Analysis Window
```
now = new Date()
twelveMonthsAgo = now - 12 months
cutoffDate = twelveMonthsAgo.toISOString().split('T')[0]
```

### Step 2: Separate Active vs Sold Vehicles
```
activeVehicles = vehicles.filter(v => !v.is_sold)
soldVehicles = vehicles.filter(v => v.is_sold)
soldVehicleSaleDate = { vehicleId: sale_date } for each sold vehicle
```

### Step 3: Filter Bookings (Time-Aware)
```
recentBookings = bookings.filter(b =>
  b.start_date >= cutoffDate AND
  IF sold vehicle: b.start_date <= saleDate
)
```
Same logic applied to maintenance records.

### Step 4: Validate Booking Integrity
```
FOR EACH booking:
  duration = ceil((end - start) / 1 day)
  IF duration > 90 → EXCLUDE, log anomaly
  IF amount ≤ 0 → EXCLUDE, log anomaly
  ELSE → validBookings
```

### Step 5: Compute Global Metrics (Active Fleet Only)
```
totalActiveBookingRevenue = sum(validBookings.total_amount) [active fleet]
totalActiveMaintenanceCost = sum(maintenance.cost) [active fleet]
totalFixedCostsAnnual = sum(annualized recurring expenses where is_fixed_cost=true)

weightedAvgRentalPrice = totalActiveBookingRevenue / totalActiveBookings
globalVariableCostPerBooking = totalActiveMaintenanceCost / totalActiveBookings
weightedAvgContribution = (revenue - maintenance) / bookings
breakEvenBookings = ceil(totalFixedCostsAnnual / weightedAvgContribution)
fixedCostSharePerBooking = totalFixedCostsAnnual / totalActiveBookings
```

### Step 6: Per-Vehicle Breakdown (Active Vehicles Only)
For each active vehicle, compute 17 metrics:
- Booking count (all + valid), revenue, maintenance cost
- Avg revenue/booking, variable cost/booking, contribution/booking
- Total days rented, avg booking duration
- Utilization (days rented / available days)
- Target daily rate (cost coverage + 15% margin)
- Status classification (5 levels: insufficient_data → loss → below_fixed_cost_share → underutilized → profitable)

### Step 7: Demand Classification
```
avgFleetUtilization = mean(all vehicle utilizations)
FOR EACH vehicle:
  IF bookings = 0 → 'none'
  IF utilization > avgFleetUtilization × 1.2 → 'high'
  IF utilization > avgFleetUtilization × 0.8 → 'medium'
  ELSE → 'low'
```

### Step 8: Generate Sanity Warnings
- Variable cost exceeds revenue → flagged
- Average booking duration > 30 days → flagged

### Step 9: Format Output
Returns a structured text string containing:
- Analysis period, data sufficiency status
- Global metrics with unit definitions
- Per-vehicle breakdown (one line per vehicle)
- Sold vehicle summary
- Sanity warnings and anomaly reports
- Monthly performance breakdown
- Debug snapshot logged to console

---

## 2. `buildBusinessContext()` — Data Aggregation

Called on **every message** (all presets + general chat). Performs 7 parallel Supabase fetches and aggregates into structured object.

### Data Fetched
| Table | Columns Selected | Purpose |
|-------|-----------------|---------|
| `financial_records` | All | Income/expense breakdown |
| `vehicles` | All | Fleet composition |
| `rental_bookings` | id, vehicle_id, dates, amount, status, times, locations | Booking patterns |
| `profiles` | name, company_name, city, country | Business identity |
| `recurring_transactions` | All | Fixed cost analysis |
| `vehicle_maintenance` | id, vehicle_id, type, cost, date, next_date, description | Maintenance history |
| `damage_reports` | id, vehicle_id, severity, location, reported_at, repair_cost, description | Damage tracking (images EXCLUDED) |

### Aggregations Computed
1. **Per-vehicle financials**: income, expenses, net profit, margin, booking count, days rented, avg revenue/booking
2. **Vehicle rankings**: sorted by profit, bookings, revenue (pre-computed — AI uses as-is)
3. **Expense category breakdown**: by category → amount + percentage
4. **Expense subcategory breakdown**: category → subcategory → amount (global + monthly, last 6 months)
5. **Income source breakdown**: by source type → amount + percentage
6. **Collaboration partners**: per-partner total income, YTD income, record count
7. **Monthly performance**: per-month income, expenses, net profit, bookings
8. **Monthly vehicle profitability**: per-vehicle per-month breakdown + most profitable per month
9. **Fleet distributions**: by vehicle type, category, fuel type, transmission type (each with maintenance costs)
10. **Maintenance summaries**: per-vehicle record count, total cost, types, last/next dates
11. **Damage summaries**: per-vehicle report count, by severity, total repair cost
12. **Data availability flags**: hasPickupTimes, hasPickupLocations, hasMaintenanceData, hasDamageData, hasRecurringData

---

## 3. Context Design — Why Pre-Computed

### Problem
AI models are unreliable at arithmetic. Given raw data, models frequently:
- Miscalculate averages and sums
- Confuse per-day vs per-booking metrics
- Merge categories that should be distinct
- Invent numbers when data is missing

### Solution
All numbers are pre-calculated server-side and injected as formatted text. The prompt explicitly instructs:
- "Use values EXACTLY as given"
- "Do NOT recalculate"
- "NEVER invent or estimate values"

### Enforcement
- **Unit definitions** prevent metric confusion (daily rate vs per-booking)
- **Sanity warnings** flag inconsistencies for AI to acknowledge
- **Data availability flags** (✅/❌/⚠️) tell AI exactly what exists
- **Category definitions** prevent merging (`maintenance ≠ vehicle_parts`)

---

## 4. Prompt Design Strategy

### Structure
```
1. Language Instruction (FIRST — ensures correct output language)
2. Role Definition ("FlitX AI Assistant, precise business intelligence assistant")
3. Data Dictionary (semantic mapping: "profit" → totalIncome - totalExpenses)
4. Business Overview (company, location, fleet size)
5. Data Availability Status (✅/❌/⚠️ per data type)
6. Vehicle Analytics (per-vehicle rankings and breakdowns)
7. Expense Analytics (category + subcategory + monthly)
8. Fleet Distributions (by type, category, fuel, transmission)
9. Monthly Performance (rankings + vehicle profitability)
10. Income Breakdown + Collaboration Partners
11. Maintenance + Damage History
12. Behavioral Rules (14 rules)
13. Preset-Specific Instructions (if applicable)
```

### Financial Preset: Slim Prompt
For `financial_analysis` and `pricing_optimizer`, a separate `buildFinancialSystemPrompt()` is used that:
- Includes language instruction + role + business overview
- Includes full `computeFinancialContext()` output (pre-computed metrics)
- Includes 4 critical rules
- Includes preset-specific instructions (`getFinancialAnalysisInstructions()` or `getPricingOptimizerInstructions()`)
- **Excludes**: full vehicle rankings, expense subcategory breakdowns, fleet distributions, collaboration partners, damage reports
- **Result**: ~4K tokens vs ~15K tokens for full prompt

### Semantic Dictionary
Maps user-friendly terms to data fields:
```
"profit" / "net profit" / "earnings" → totalIncome - totalExpenses
"revenue" / "income" / "sales" → totalIncome
"costs" / "spending" / "expenses" → totalExpenses
"best" / "top" / "highest" → ranked #1 in that metric
"car" / "vehicle" / "automobile" → vehicle
"booking" / "rental" / "reservation" → rental booking
```

### Language Support
6 languages: English, Greek, Italian, Spanish, German, French.
Language instruction placed FIRST in prompt to ensure entire response is in correct language.

---

## 5. AI Safety Layer

### Value Integrity
- AI cannot override pre-computed values → prompt: "use EXACTLY as given"
- AI cannot create new numbers → No Inference Rule
- AI cannot guess missing data → Missing Data Rule (one sentence → STOP)

### Structured Output Enforcement
- Preset actions define strict section order (all sections required)
- AI must include all sections even if marking "No data available"
- Status labels must match pre-computed values (consistency rule)

### Pricing Safety (Pricing Optimizer)
- **Price floor**: never suggest below variable cost per booking
- **Change cap**: ±50% for profitable vehicles (HARD RULE)
- **Loss vehicles**: must increase to at least Target Daily Rate
- **Insufficient data**: hold current price, recommend monitoring

### Category Safety
- `maintenance` and `vehicle_parts` are explicitly defined as separate categories
- Prompt includes: "CRITICAL: 'maintenance' ≠ 'vehicle_parts' — NEVER combine"
- Same distinction enforced in subcategory breakdowns

---

## 6. Slim Prompt Optimization

### Problem
Full business context can reach ~15K tokens. Combined with preset instructions + conversation history, this risks:
- Token limit overflow
- Truncation of important instructions
- Higher latency and cost

### Solution: `buildFinancialSystemPrompt()`
For financial presets only:
- Uses `computeFinancialContext()` output (~4K tokens of pre-computed metrics)
- Strips non-essential sections (damage, collaboration partners, fleet distributions)
- Includes only critical rules (4 vs 14)
- Result: ~4K token system prompt vs ~15K

### Non-Financial Presets
Marketing & Growth and Expense Optimization use the full `buildSystemPrompt()` because they need:
- Fleet distributions (for vehicle-type marketing)
- Expense subcategory breakdowns (for optimization)
- Collaboration partner data (for partnership strategies)
- Damage history (for risk assessment context)

---

## 7. Debug & Monitoring

### Server-Side Debug Snapshot
`computeFinancialContext()` logs a `[FINANCIAL_DEBUG]` JSON object to console containing:
- Analysis period
- Vehicle counts (active/sold)
- All global metrics
- Per-vehicle summary (name, bookings, contribution, utilization, demand, target rate, status)

### Anomaly Reporting
- Data anomalies (excluded bookings) logged and included in context for AI to reference
- Sanity warnings included for AI to acknowledge in analysis

### Error Logging
- Gateway errors logged with status code and response text
- Internal errors logged with full error object
- Client receives only sanitized error messages
