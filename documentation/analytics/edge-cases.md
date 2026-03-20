# Analytics — Edge Cases & Error Handling

This document covers error handling, edge cases, data integrity safeguards, and known limitations.

---

## 1. Empty Datasets

| Scenario | UI Behavior |
|---|---|
| No financial records at all | Loading spinner clears, summary cards show €0.00, charts show single `-` data point |
| No income records for timeframe | IncomeBreakdown shows: "No income for this period" |
| No expense records for timeframe | ExpenseBreakdown shows: "No expenses for this period" |
| No vehicles | Vehicle category breakdowns show "No Data", profit ranking is empty |
| No recurring transactions | RecurringTransactionsModal shows empty state with "Add Your First" CTA |
| No assets | AssetTrackingWidget shows only "Add Asset Category" button, grand total = €0 |
| No bookings in 12-month window | AI financial analysis shows break-even = 0, all vehicles show `insufficient_data` status |

---

## 2. Duplicate Prevention (Recurring Transactions)

The recurring transaction system has a strict duplicate prevention mechanism:

```sql
-- Before inserting a generated record, check:
SELECT id FROM financial_records
WHERE date = :next_generation_date
  AND category = :rule_category
  AND amount = :rule_amount
  AND source_section = 'recurring'
  AND type = :rule_type
  AND user_id = :user_id
LIMIT 1
```

**If a match is found:** The record is skipped (not inserted), and the rule advances to the next date.

**Edge case:** If a user manually creates a record with the same date, category, amount, and type, the duplicate check uses `source_section = 'recurring'` to differentiate. Manual records have `source_section = 'manual'`, so they won't conflict.

---

## 3. Recurring Catch-Up Cap

**Problem:** If the edge function hasn't run for a long time (e.g., system was down), a monthly rule from 2 years ago could generate 24+ records.

**Safeguard:** `MAX_ITERATIONS = 100` per rule per run.

```typescript
while (currentNextDate <= todayStr && iterations < MAX_ITERATIONS) {
  // ... generate record
  iterations++;
}
```

If 100 iterations are reached, the loop stops. On the next run, it continues from where it left off.

---

## 4. Recurring Auto-Deactivation

```typescript
if (recurring.end_date && currentNextDate > recurring.end_date) {
  shouldDeactivate = true;
  // Rule's is_active set to false
}
```

Rules are automatically deactivated when `next_generation_date` exceeds `end_date`. The UI shows completed rules as dimmed with a "Completed" badge.

---

## 5. Zero-Division Protection

### avgProfitPerDay
```typescript
let activeDays = 1;
if (createdAt) {
  activeDays = Math.max(1, differenceInDays(today, startDate) + 1);
}
const avgProfitPerDay = (income - expense) / activeDays;
```
`Math.max(1, ...)` ensures division by zero never occurs.

### AI utilization
```typescript
const availableDays = Math.max(1, Math.ceil((now - windowStart) / msPerDay));
const utilization = totalDaysRented / availableDays;
```

### Break-even
```typescript
const breakEvenBookings = weightedAvgContribution > 0 
  ? Math.ceil(totalFixedCostsAnnual / weightedAvgContribution) 
  : 0;
```
If contribution is zero or negative, break-even returns 0 (not infinity).

---

## 6. Data Integrity in AI Analysis

### Anomaly Detection
```typescript
// Bookings with unrealistic duration (>90 days) are EXCLUDED
if (durationDays > 90) {
  anomalies.push(`Booking ${id} has unrealistic duration: ${durationDays} days — EXCLUDED`);
  skippedBookings.push(b);
}

// Bookings with zero/negative revenue are EXCLUDED
if (amount <= 0) {
  anomalies.push(`Booking ${id} has zero/negative revenue — excluded from revenue`);
  skippedBookings.push(b);
}
```

### Sanity Warnings
```typescript
// Variable cost exceeds revenue per booking
if (variableCostPerBooking > avgRevenuePerBooking) {
  sanityWarnings.push(`⚠️ ${vehicleName}: Var cost/booking EXCEEDS avg revenue/booking — LOSS`);
}

// Abnormally long average booking duration
if (avgBookingDuration > 30) {
  sanityWarnings.push(`⚠️ ${vehicleName}: Avg booking duration ${duration} days — unusually long`);
}
```

These warnings are included in the financial context string sent to the AI.

### Data Sufficiency Check
```typescript
const insufficientData = activeVehicles.length < 3 || totalActiveBookings < 10 || costEntries < 2;
```
If insufficient, the AI context includes `Data Sufficiency: ❌ INSUFFICIENT`.

---

## 7. Sold Vehicle Handling (Time-Aware)

```typescript
// Booking filter: exclude sold vehicle bookings AFTER sale_date
if (soldVehicleIds.has(b.vehicle_id)) {
  const saleDate = soldVehicleSaleDate[b.vehicle_id];
  if (saleDate && b.start_date > saleDate) return false; // Exclude
  // Otherwise include in global totals
}
```

- Pre-sale bookings/maintenance → included in global totals
- Post-sale bookings/maintenance → excluded entirely
- Sold vehicles → excluded from per-vehicle breakdown table
- Sold vehicles → listed in "SOLD VEHICLES" summary section

---

## 8. Booking Delete Cascade — Partial Failure Risk

The delete cascade in `handleDeleteTransaction()` performs multiple sequential operations:

```
1. Delete contract from storage
2. Delete task contract files from storage
3. Delete daily_tasks
4. Delete ALL financial_records for booking
5. Delete the booking itself
```

**Risk:** If step 3 fails, steps 4-5 won't execute, leaving orphan records. There is no transaction wrapper — each operation is independent.

**Mitigation:** Errors are caught and logged, but partial deletes are not rolled back. The user sees a toast error.

---

## 9. Real-time Subscription Race Condition

When a user adds a record, the following can happen:

1. `handleSubmitFinanceRecord()` inserts the record
2. Real-time subscription fires `fetchFinancialRecords()`
3. Both update `financialRecords` state

This is harmless — the real-time refetch ensures the latest data is always shown, even if the insert response was slow.

---

## 10. Maintenance Delete Matching

When deleting a maintenance expense, the system finds the matching `vehicle_maintenance` record by:

```typescript
.eq('vehicle_id', record.vehicle_id)
.eq('date', record.date)
.eq('cost', record.amount)
```

**Risk:** If two maintenance records exist for the same vehicle, date, and cost, the wrong one could be deleted. This is unlikely in practice but theoretically possible.

---

## 11. VAT Rate Not DB-Persisted

VAT rate is stored in `localStorage` only. Consequences:
- Different rates on different devices/browsers
- Clearing browser data resets to default (10%)
- No historical record of which VAT rate was applied to past records

The actual VAT amount IS persisted in `financial_records` as a separate expense record, so historical data is preserved.

---

## 12. Supabase Query Limit

Supabase has a default limit of 1000 rows per query. `fetchFinancialRecords()` does not paginate:

```typescript
supabase.from('financial_records').select('*').order('created_at', { ascending: false })
```

If a user has >1000 records, only the most recent 1000 will be returned. This could cause historical data to be missing from charts and breakdowns.
