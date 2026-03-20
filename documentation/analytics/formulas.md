# Analytics — Formulas & Calculations

This document specifies every calculation and derived metric used in the Analytics section.

---

## 1. Summary Card Metrics

Computed in `FinanceDashboard.calculateSummaryData()` from `filteredRecords`:

```
totalIncome = sum(filteredRecords.filter(type === 'income').amount)
totalExpenses = sum(filteredRecords.filter(type === 'expense').amount)
netProfit = totalIncome - totalExpenses
```

These are **timeframe-dependent** — they change when the user switches between week/month/year/all/custom.

---

## 2. Vehicle Profit Ranking (Avg Profit Per Day)

Computed in `FinanceDashboard.vehicleProfitRanking` (useMemo) from **ALL records** (not filtered):

```
For each vehicle with financial records:
  vehicleIncome = sum(all income records for this vehicle)
  vehicleExpenses = sum(all expense records for this vehicle)
  activeDays = max(1, daysSince(vehicle.created_at) + 1)
  avgProfitPerDay = (vehicleIncome - vehicleExpenses) / activeDays
```

**Key:** This is a **lifetime metric**, not affected by the timeframe filter. It uses `vehicle.created_at` (when the vehicle was added to the system), not `purchase_date`.

---

## 3. Vehicle Sale Profit/Loss

Computed in `Finance.tsx.handleSubmitVehicleSale()`:

```
purchasePrice = vehicle.purchase_price || 0
vehicleIncome = sum(all income records for vehicle)
vehicleExpenses = sum(all expense records for vehicle)
vehicleNetIncome = vehicleIncome - vehicleExpenses

remainingForDepreciation = max(0, purchasePrice - vehicleNetIncome)

profitOrLoss = salePrice - remainingForDepreciation
isProfit = profitOrLoss >= 0
```

**Logic:** If the vehicle has earned more than its purchase price (net income > purchase price), `remainingForDepreciation` is 0, and the entire sale price is profit. Otherwise, the remaining unrecovered cost is subtracted from the sale price.

**Record type:** Profit → income record; Loss → expense record. Amount is always `abs(profitOrLoss)`.

---

## 4. VAT Auto-Expense

Triggered in `Finance.tsx.handleSubmitFinanceRecord()` when `vatEnabled === true`:

```
vatAmount = incomeAmount * (vatRate / 100)
```

Creates an expense record with:
- `category: 'tax'`
- `expense_subcategory: 'Income Tax'`
- `source_section: 'vat_auto'`

VAT rate is stored in `localStorage` (key: `fleetx_vat_rate`, default: 10%).

---

## 5. Fixed Cost Annualization

Computed in `computeFinancialContext()` in the AI edge function and in `RecurringTransactionsModal`:

```
For each active recurring expense with is_fixed_cost = true:
  annualAmount = amount * multiplier

Where multiplier depends on frequency_unit:
  day   → 365 / frequency_value
  week  → 52 / frequency_value
  month → 12 / frequency_value
  year  → 1 / frequency_value

totalFixedCostsAnnual = sum(all annualized fixed costs)
```

---

## 6. Contribution Margin (AI Financial Analysis)

Computed per vehicle in `computeFinancialContext()`:

```
contributionPerBooking = avgRevenuePerBooking - variableCostPerBooking

Where:
  avgRevenuePerBooking = bookingRevenue / validBookingCount
  variableCostPerBooking = maintenanceCost / validBookingCount
```

This represents how much each booking contributes toward covering fixed costs and profit.

---

## 7. Break-Even Bookings (AI Financial Analysis)

```
weightedAvgContribution = (totalActiveBookingRevenue - totalActiveMaintenanceCost) / totalActiveBookings
breakEvenBookings = ceil(totalFixedCostsAnnual / weightedAvgContribution)
```

Uses **contribution-based** break-even, not revenue-based. Only considers active fleet vehicles.

---

## 8. Utilization (AI Financial Analysis)

Per vehicle:
```
purchaseDate = vehicle.purchase_date || 12 months ago
windowStart = max(purchaseDate, 12 months ago)
availableDays = max(1, ceil((now - windowStart) / millisPerDay))
bookedDays = sum of booking durations for this vehicle (within 12-month window)
utilization = bookedDays / availableDays  (0 to 1 ratio)
```

Displayed as percentage (e.g., 42.3%).

---

## 9. Target Daily Rate (AI Financial Analysis)

Per vehicle:
```
fixedCostSharePerBooking = totalFixedCostsAnnual / totalActiveBookings
targetRevenuePerBooking = variableCostPerBooking + fixedCostSharePerBooking + (0.15 * avgRevenuePerBooking)
targetDailyRate = targetRevenuePerBooking / avgBookingDuration
```

The 0.15 (15%) is the `PROFIT_MARGIN_TARGET` constant. This gives the AI a data-driven price recommendation.

---

## 10. Demand Level Classification (AI Financial Analysis)

```
avgFleetUtilization = mean(all vehicle utilizations)

Per vehicle:
  if bookingCount === 0 → 'none'
  if utilization > avgFleetUtilization * 1.2 → 'high'
  if utilization > avgFleetUtilization * 0.8 → 'medium'
  else → 'low'
```

**Not** AI-generated — purely data-driven based on utilization relative to fleet average.

---

## 11. Vehicle Status Classification (AI Financial Analysis)

```
if bookingCount === 0 → 'insufficient_data'
if contributionPerBooking ≤ 0 → 'loss'
if contributionPerBooking < fixedCostSharePerBooking → 'below_fixed_cost_share'
if utilization < 0.15 → 'underutilized'
else → 'profitable'
```

Multi-factor status that considers unit profitability AND contribution to fixed cost coverage AND utilization.

---

## 12. Pie Chart Grouping

Used in both `IncomeBreakdown` and `ExpenseBreakdown`:

```
For each category slice:
  percentage = round(categoryTotal / grandTotal * 100)

majorSlices = slices where percentage >= 5
minorSlices = slices where percentage < 5

If minorSlices.length > 1:
  Merge into single "Other (<5%)" slice
  Use dominant minor slice's color
  Store subItems for tooltip breakdown
```

---

## 13. Income Source Aggregation

In `IncomeBreakdown`:

```
For each income record:
  if category === 'additional':
    Parse description to extract cost name
    Key: "additional_<normalized_cost_name>"
  else if sourceType === 'collaboration' + specification:
    Key: "collaboration_<normalized_specification>"
    Label: "Collaboration (Partner Name)"
  else if sourceType === 'other' + specification:
    Key: "other_<normalized_specification>"
    Label: specification (standalone)
  else:
    Key: sourceType (walk_in, etc.)
    Label: translated source name
```

---

## 14. Expense Category Aggregation

In `ExpenseBreakdown`:

```
For each expense record:
  if category has subcategory (maintenance, other, marketing, vehicle_parts, tax):
    Key: "<category>_<subcategory>"
    Label: "Category (Subcategory)"
    Exception: 'other' subcategories display standalone
  else:
    Key: category
    Label: translated category name
```

---

## 15. Recurring Transaction Next Date

```
calculateNextDate(fromDate, frequencyValue, frequencyUnit):
  switch (frequencyUnit):
    'week'  → fromDate + (7 * frequencyValue) days
    'month' → fromDate + frequencyValue months
    'year'  → fromDate + frequencyValue years
```

Note: JavaScript `Date.setMonth()` handles month overflow automatically (e.g., Jan 31 + 1 month = Mar 3 in non-leap years).
