# Fleet — Formulas & Calculations

## Overview

This document details every calculation and derived metric used within the Fleet section, from status computation to depreciation modeling.

---

## 1. Vehicle Status Computation

```
computeStatusForDate(date, bookings, maintenanceBlocks, baseStatus):
  1. IF any booking's [start_date, end_date] contains date → return "rented"
  2. IF any maintenance_block's [start_date, end_date] contains date → return "maintenance"
  3. IF baseStatus === "repair" → return "repair"
  4. ELSE → return "available"
```

- **Priority**: rented > maintenance > repair > available
- Uses `isWithinInterval()` from date-fns for date containment checks
- Status is **always computed**, never stored as a derived field

---

## 2. Booking Duration

```typescript
duration = Math.max(1, differenceInDays(parseISO(end_date), parseISO(start_date)) + 1)
```

- Always at least 1 day (same-day rental)
- Uses inclusive counting (+1)

---

## 3. Total Booked Days (per vehicle)

```typescript
totalBookedDays = sum(bookings.map(b => 
  Math.max(1, differenceInDays(parseISO(b.end_date), parseISO(b.start_date)) + 1)
))
```

---

## 4. Active Days (vehicle lifetime)

```typescript
activeDays = Math.max(1, differenceInDays(new Date(), parseISO(vehicle.created_at)) + 1)
```

- Rolling count from vehicle creation to today
- `Math.max(1, ...)` prevents zero-division in daily averages

---

## 5. Vehicle Averages

```typescript
avgRentalPrice   = totalRevenue / totalBookedDays     // null if totalBookedDays === 0
avgIncomePerDay  = totalRevenue / activeDays
avgCostPerDay    = totalExpenses / activeDays
avgProfitPerDay  = (totalRevenue - totalExpenses) / activeDays
```

- `totalRevenue` = sum of `financial_records` where `type='income'` AND `vehicle_id` matches
- `totalExpenses` = sum of `financial_records` where `type='expense'` AND `vehicle_id` matches

---

## 6. Depreciation Progress

```typescript
netIncome = totalRevenue - totalExpenses
depreciationProgress = Math.min(100, (netIncome / purchasePrice) * 100)
remainingForDepreciation = Math.max(0, purchasePrice - netIncome)
```

- Progress bar shows how much of the purchase price has been "earned back"
- Capped at 100% (no overflow display)
- Only displayed when `purchasePrice > 0`

### Net Profit After Depreciation

```typescript
// Only calculated when depreciationProgress >= 100%
netProfitAfterDepreciation = netIncome - purchasePrice
```

---

## 7. Vehicle Sale Profit/Loss

```typescript
remainingForDepreciation = Math.max(0, purchasePrice - netIncome)
profitOrLoss = salePrice - remainingForDepreciation
```

- Positive result = profit (sold for more than remaining book value)
- Negative result = loss (sold below remaining book value)
- The `financial_records` entry stores `profitOrLoss` as the amount with `category='vehicle_sale'`

---

## 8. Usage-Based Depreciation (from `depreciationUtils.ts`)

### Time Component

Cumulative depreciation curve by model year age:

| Age (years) | Cumulative Depreciation |
|-------------|------------------------|
| 0 | 0% |
| 1 | 20% |
| 2 | 32% |
| 3 | 40% |
| 4 | 46% |
| 5 | 52% |
| 6 | 55% |
| 7 | 58% |
| 8 | 60% |
| 9 | 63% |
| 10 | 65% |

For fractional years:
```typescript
interpolatedDepreciation = lowerValue + (upperValue - lowerValue) * fractionOfYear * 0.5
// 0.5 = damping factor (depreciation slows mid-year)
```

### Mileage Component

Two-tier model:
```typescript
expectedMileage = yearsOwned * 12000  // 12,000 km/year average for cars
baseRate = 0.015  // €0.015 per km (all kilometers)
excessRate = 0.025  // €0.025 per km (above expected)

baseCost = totalMileage * baseRate
excessMileage = Math.max(0, totalMileage - expectedMileage)
excessCost = excessMileage * excessRate

mileageDepreciation = (baseCost + excessCost) / marketValueAtPurchase * 100
```

### Total Depreciation

```typescript
totalDepreciation = timeDepreciation + mileageDepreciation
// Floor protection: minimum 20% residual value
totalDepreciation = Math.min(totalDepreciation, 80)

currentValue = marketValueAtPurchase * (1 - totalDepreciation / 100)
valueLoss = marketValueAtPurchase - currentValue
```

---

## 9. Filter Logic

### Text Search
```typescript
searchTerms = searchQuery.toLowerCase().trim().split(" ")
vehicleText = `${make} ${model} ${year} ${licensePlate}`.toLowerCase()
match = searchTerms.every(term => vehicleText.includes(term))
```
- Multi-term AND matching (all terms must appear)

### Multi-Criteria Filtering
```
result = vehicles
  .filter(vehicleType)     // AND
  .filter(category)        // AND
  .filter(fuelType)        // AND
  .filter(transmission)    // AND
  .filter(passengers)      // AND
  .sort(yearSort)          // then
  .sort(soldToBottom)      // always last
```

### Passenger Count Special Case
```typescript
if (filterValue === 7 && vehicle.passengerCapacity >= 7) return true
// Value 7 acts as "7+" (seven or more)
```

---

## 10. Calendar Date Classification

```typescript
for each date in month:
  isBooked = bookedDates.has(formatDate(date))      // O(1) Set lookup
  isMaintenance = maintenanceDates.has(formatDate(date))
  isSelected = date === selectedStart || date === selectedEnd || isInRange(date)
  
  // Visual priority: booked (red) > maintenance (orange) > selected (blue) > default
```
