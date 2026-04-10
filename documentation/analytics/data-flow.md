# Analytics — Data Flow & Lifecycles

This document describes the complete lifecycle of data as it flows through the Analytics system, from creation to display to AI consumption.

---

## 1. Booking → Income Records

**Trigger:** User creates a booking via `UnifiedBookingDialog`

**Flow:**
```
UnifiedBookingDialog
  │
  ├─ INSERT into rental_bookings
  │    (customer_name, vehicle_id, start_date, end_date, total_amount, status, etc.)
  │
  ├─ INSERT into financial_records (rental income)
  │    type: 'income'
  │    category: 'rental'
  │    amount: total_amount
  │    booking_id: <new booking id>
  │    vehicle_id: <selected vehicle>
  │    income_source_type: 'walk_in' | 'collaboration' | 'other'
  │    income_source_specification: <partner name or custom source>
  │    source_section: 'booking'
  │    vehicle_fuel_type: <from vehicle>
  │    vehicle_year: <from vehicle>
  │
  ├─ For each additional cost (insurance, extras):
  │    INSERT into financial_records
  │      type: 'income'
  │      category: 'additional'
  │      amount: cost amount
  │      booking_id: <same booking id>
  │      description: "Insurance - Full Coverage (Additional Cost) - Vehicle Name"
  │      source_section: 'booking'
  │
  ├─ INSERT into booking_additional_costs (for each extra cost)
  │
  ├─ If VAT enabled:
  │    INSERT into financial_records
  │      type: 'expense'
  │      category: 'tax'
  │      expense_subcategory: 'Income Tax'
  │      amount: total_amount * (vatRate / 100)
  │      description: "Income Tax (VAT X%) - auto"
  │      source_section: 'vat_auto'
  │
  ├─ INSERT into daily_tasks (delivery task)
  │    task_type: 'delivery'
  │
  └─ INSERT into daily_tasks (return task)
       task_type: 'return'
```

**Propagation to UI:**
```
Supabase Realtime channel on financial_records
  │
  └─ postgres_changes event (INSERT)
       │
       └─ Finance.tsx: fetchFinancialRecords() triggers
            │
            └─ FinanceDashboard receives new financialRecords prop
                 │
                 ├─ filteredRecords recomputed (useMemo)
                 ├─ Summary cards update (totalIncome, totalExpenses, netProfit)
                 ├─ Growth indicators recompute (period-over-period)
                 ├─ Secondary KPI cards update (totalBookings, avgIncome, avgCost)
                 ├─ BarChart re-renders with new bucket data
                 ├─ LineChart re-renders cumulative trend
                 ├─ IncomeBreakdown re-aggregates by source
                 └─ Transaction list shows new record at top
```

---

## 1a. Summary Card Growth Computation

**Trigger:** Any change to `filteredRecords`, `financialRecords`, `timeframe`, or `customRange`.

**Flow:**
```
summaryData useMemo
  │
  ├─ Compute current period totals:
  │    totalIncome = sum of income in filteredRecords
  │    totalExpenses = sum of expenses in filteredRecords
  │    netProfit = totalIncome - totalExpenses
  │
  ├─ Compute previous period range:
  │    week   → previous calendar week (Mon–Sun)
  │    month  → previous calendar month
  │    year   → previous calendar year
  │    custom → equal-length window immediately before customRange.startDate
  │    all    → skip (no prior period, growth = 0)
  │
  ├─ Filter ALL financialRecords into previous period:
  │    prevIncome, prevExpenses, prevProfit
  │
  └─ Calculate percentage changes:
       incomeChange  = ((totalIncome - prevIncome) / prevIncome) * 100
       expenseChange = ((totalExpenses - prevExpenses) / prevExpenses) * 100
       profitChange  = ((netProfit - prevProfit) / |prevProfit|) * 100
       (returns 0 if previous period total is 0)
```

---

## 2. Manual Expense → Financial Record (+ optional Maintenance)

**Trigger:** User adds a record via "Add Record" dialog in Finance.tsx

**Flow:**
```
Finance.tsx: handleSubmitFinanceRecord()
  │
  ├─ INSERT into financial_records
  │    type: 'expense'
  │    category: 'maintenance' | 'fuel' | 'insurance' | 'tax' | 'salary' | ...
  │    expense_subcategory: <specific type if applicable>
  │    vehicle_id: <optional>
  │    source_section: 'manual'
  │
  ├─ If category === 'maintenance' AND vehicle selected AND subcategory set:
  │    INSERT into vehicle_maintenance
  │      vehicle_id: <selected>
  │      type: expenseSubcategory
  │      cost: amount
  │      date: selected date
  │      description: notes or localized label
  │
  └─ If income + VAT enabled:
       INSERT into financial_records (tax expense)
         type: 'expense'
         category: 'tax'
         amount: incomeAmount * (vatRate / 100)
         source_section: 'vat_auto'
```

---

## 3. Recurring Transaction → Financial Records

**Trigger:** Two mechanisms (redundant for reliability):

1. **Backend cron (primary):** `process-recurring-transactions` edge function runs hourly via pg_cron
2. **Frontend fallback:** `FinanceDashboard` fires `supabase.functions.invoke('process-recurring-transactions')` on component mount

**Flow (both mechanisms use identical logic):**
```
process-recurring-transactions edge function
  │
  ├─ SELECT from recurring_transactions
  │    WHERE is_active = true AND next_generation_date <= today
  │
  ├─ For each due rule:
  │    │
  │    └─ WHILE next_generation_date <= today AND iterations < 100:
  │         │
  │         ├─ If end_date reached → mark is_active = false, break
  │         │
  │         ├─ DUPLICATE CHECK:
  │         │    SELECT from financial_records WHERE
  │         │      date = next_generation_date
  │         │      AND category = rule.category
  │         │      AND amount = rule.amount
  │         │      AND source_section = 'recurring'
  │         │      AND type = rule.type
  │         │      AND user_id = rule.user_id
  │         │
  │         ├─ If no duplicate found:
  │         │    INSERT into financial_records
  │         │      source_section: 'recurring'
  │         │      All fields from rule (type, category, amount, vehicle_id, etc.)
  │         │
  │         ├─ Advance: last_generated_date = current date
  │         │           next_generation_date = calculateNextDate()
  │         │
  │         └─ iterations++
  │
  └─ UPDATE recurring_transactions
       SET last_generated_date, next_generation_date, is_active (if deactivated)
```

**Date Calculation:**
```typescript
calculateNextDate(fromDate, frequencyValue, frequencyUnit):
  week  → date + (7 * frequencyValue) days
  month → date + frequencyValue months
  year  → date + frequencyValue years
```

---

## 4. Vehicle Sale → Profit/Loss Record

**Trigger:** User selects "Vehicle Sale" mode in the Add Record dialog

**Flow:**
```
Finance.tsx: handleSubmitVehicleSale()
  │
  ├─ Fetch vehicle data (purchase_price, etc.)
  │
  ├─ Fetch ALL financial_records for vehicle
  │    vehicleIncome = sum(income records)
  │    vehicleExpenses = sum(expense records)
  │    vehicleNetIncome = vehicleIncome - vehicleExpenses
  │
  ├─ Calculate remaining depreciation:
  │    remainingForDepreciation = max(0, purchasePrice - vehicleNetIncome)
  │
  ├─ Calculate profit/loss:
  │    profitOrLoss = salePrice - remainingForDepreciation
  │    isProfit = profitOrLoss >= 0
  │
  ├─ INSERT into financial_records
  │    type: isProfit ? 'income' : 'expense'
  │    category: 'vehicle_sale'
  │    amount: abs(profitOrLoss)
  │    source_section: 'vehicle_sale'
  │    income_source_type: 'vehicle_sale'
  │    income_source_specification: "Sale Price: €X | Remaining: €Y"
  │
  └─ UPDATE vehicles
       SET is_sold = true, sale_price = X, sale_date = Y
```

---

## 5. Delete Cascade

**Trigger:** User deletes a transaction from the transaction list in FinanceDashboard

**Flow depends on record type:**

### 5a. Booking-linked record (`booking_id` is set)
```
FinanceDashboard: handleDeleteTransaction()
  │
  ├─ Fetch booking's contract_photo_path
  ├─ DELETE contract from storage (rental-contracts bucket)
  │
  ├─ Fetch daily_tasks with contract_path for this booking
  ├─ DELETE task contract files from storage
  │
  ├─ DELETE from daily_tasks WHERE booking_id = X
  ├─ DELETE from financial_records WHERE booking_id = X (all linked records)
  └─ DELETE from rental_bookings WHERE id = X
```

### 5b. Vehicle sale record (`category === 'vehicle_sale'`)
```
  ├─ UPDATE vehicles SET is_sold = false, sale_price = null, sale_date = null
  └─ DELETE from financial_records WHERE id = recordId
```

### 5c. Maintenance record (`category === 'maintenance'` + vehicle_id)
```
  ├─ DELETE from vehicle_maintenance WHERE vehicle_id AND date AND cost match
  └─ DELETE from financial_records WHERE id = recordId
```

### 5d. Plain record (no special links)
```
  └─ DELETE from financial_records WHERE id = recordId
```

---

## 6. Chart Data Flow

### Granularity State

Each chart (BarChart, LineChart) maintains its own local `granularity` state:

```
Chart component mount
  │
  ├─ useState initializes granularity via getDefaultGranularity(timeframe, customRange)
  │
  ├─ useEffect resets granularity when timeframe or customRange changes:
  │    setGranularity(getDefaultGranularity(timeframe, customRange))
  │
  ├─ User clicks granularity toggle → setGranularity(selectedOption)
  │
  └─ useMemo recomputes chartData whenever financialRecords, timeframe, lang,
     granularity, or customRange changes
```

### Time Bucket Generation

```
getTimeBuckets(timeframe, lang, records, granularity, customRange)
  │
  ├─ Determine date range:
  │    week   → current week start to today
  │    month  → current month start to today
  │    year   → current year start to today
  │    all    → min(record dates) to max(record dates)  ← ends at last record, not today
  │    custom → customRange.startDate to customRange.endDate  ← respects user-picked range
  │
  ├─ Generate intervals based on resolved granularity:
  │    daily   → eachDayOfInterval
  │    weekly  → eachWeekOfInterval (weekStartsOn: 1)
  │    monthly → eachMonthOfInterval
  │    yearly  → eachYearOfInterval
  │
  └─ Each bucket includes: key (date string), label (formatted), date, bucketType
```

### Aggregation

```
aggregateByTimeBuckets(records, ...)
  │
  ├─ For each bucket: filter records by bucketType-aware date range
  │    daily   → same day
  │    weekly  → startOfWeek to endOfWeek
  │    monthly → startOfMonth to endOfMonth
  │    yearly  → startOfYear to endOfYear
  │
  └─ Sum income and expenses per bucket → { name, income, expenses }

aggregateCumulative(records, ...)
  │
  └─ For each bucket: sum ALL records up to bucket end date
       → { name, income, expenses, netIncome }
```

---

## 7. Breakdown Table Growth Computation

Both `IncomeBreakdown` and `ExpenseBreakdown` compute per-category growth:

```
For each category/source:
  │
  ├─ Standard timeframes (week/month/year/custom):
  │    prevRange = getPreviousPeriodRange(timeframe, customRange)
  │    prevTotal = sum of records in prevRange matching this category key
  │    growth = ((currentTotal - prevTotal) / prevTotal) * 100
  │    If prevTotal = 0 and currentTotal > 0 → "New" badge instead of percentage
  │
  └─ "All Time" timeframe:
       calcAvgMonthlyGrowth():
         Group matching records by YYYY-MM
         Compute month-over-month change for each consecutive pair
         Return average of all MoM changes
```

---

## 8. Data Flow to AI Assistant

**Trigger:** User clicks "Financial Analysis" or "Pricing Optimizer" in AI Assistant

**Flow:**
```
AI Assistant → ai-chat edge function
  │
  ├─ Parallel queries:
  │    financial_records (all, user-scoped)
  │    vehicles (all, user-scoped)
  │    rental_bookings (all, user-scoped)
  │    vehicle_maintenance (all, user-scoped)
  │    recurring_transactions (all, user-scoped)
  │    profiles (user profile)
  │    damage_reports (user-scoped)
  │
  ├─ buildBusinessContext() → general context string
  │    (aggregated financials, vehicle fleet, booking stats)
  │
  ├─ computeFinancialContext() → detailed financial metrics
  │    (12-month window, sold vehicle filtering, contribution margin,
  │     utilization, target pricing, break-even, per-vehicle breakdown)
  │
  └─ buildSystemPrompt() → system message with context + instructions
       │
       └─ Sent to Lovable AI Gateway (Gemini 3 Flash Preview)
            │
            └─ Streamed response back to client
```

See [ai-integration.md](./ai-integration.md) for detailed documentation of `computeFinancialContext()`.
