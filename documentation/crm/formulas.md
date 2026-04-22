# CRM — Formulas & Derived Values

This document lists every computation performed by CRM. Identifiers refer to the actual variables in `useCustomers.ts`, `useCRMChartData.ts`, and `CRM.tsx`.

---

## 1. Customer Aggregates (DB-side, by triggers)

These are **not computed in the client**. They are maintained by Postgres triggers on `rental_bookings` and `accidents` and stored on `customers`.

| Field | Formula |
|---|---|
| `customers.total_bookings_count` | `COUNT(*)` over `rental_bookings WHERE customer_id = c.id` |
| `customers.total_lifetime_value` | `COALESCE(SUM(total_amount), 0)` over the same set |
| `customers.first_booking_date` | `MIN(start_date)` over the same set |
| `customers.last_booking_date` | `MAX(start_date)` over the same set |
| `customers.total_accidents_count` | `COUNT(*)` over `accidents WHERE customer_id = c.id` |
| `customers.total_accidents_amount` | `COALESCE(SUM(amount_paid_by_business), 0)` over the same set |

> Note: `total_accidents_amount` reflects only what the **business** paid, not the gross damage cost. For gross cost see `total_damage_cost_sum` below.

---

## 2. `useCustomers` Per-Customer Derivations

| Output | Formula | Source |
|---|---|---|
| `age` | `differenceInYears(today, birth_date)` if `birth_date` present, else `null` | `customers.birth_date` |
| `customer_types[]` | Distinct set of `rental_bookings.customer_type` for that customer | client-aggregated |
| `vehicle_types[]` | Distinct set of `vehicles.type` for vehicles in that customer's bookings, sorted alphabetically | client-aggregated, joined via `rental_bookings.vehicle_id` |
| `total_damage_cost_sum` | `SUM(accidents.total_damage_cost)` for that customer | client-aggregated |

---

## 3. Accident Payer Split

In `AddAccidentDialog`, when the user picks a payer type:

| Payer type | Auto-fill on save |
|---|---|
| `insurance` | `amount_paid_by_insurance = total_damage_cost`, others = 0 |
| `customer`  | `amount_paid_by_customer = total_damage_cost`, others = 0 |
| `business`  | `amount_paid_by_business = total_damage_cost`, others = 0 |
| `split`     | All three values are user-entered; the dialog warns if `paid_by_insurance + paid_by_customer + paid_by_business ≠ total_damage_cost` (mismatch tolerance < 0.01 €) |

The `payer_type` enum is persisted as-is so the dialog can reconstruct the user's intent.

---

## 4. Age Bucketing (Accident-by-Age chart)

```
AGE_RANGES = [
  { label: '18-22', min: 18, max: 22 },
  { label: '23-30', min: 23, max: 30 },
  { label: '31-45', min: 31, max: 45 },
  { label: '46-60', min: 46, max: 60 },
  { label: '61+',   min: 61, max: 200 },
]
```

For each accident:
1. Look up `customer.birth_date` via `accident.customer_id`.
2. Skip if absent.
3. `age = differenceInYears(today, birth_date)`.
4. Find the matching bucket; increment `accidentCount` and add `total_damage_cost` to `totalDamageCost`.

The Y-axis displays `totalDamageCost` (gross cost), not the business-paid portion.

---

## 5. "Other" Bucketing for Pie Charts

`useCRMChartData.toLocationData(map, total)` performs:

```
For each entry { name, count }:
  value = round((count / total) * 100)   // integer percentage
  if value >= 5  → keep as its own slice
  else           → roll into "Other"

If "Other" accumulated count > 0:
  push { name: 'Other', count: otherCount, value: otherPct || 1 }
```

This applies identically to Countries, Cities, and Customer Types pies. The `|| 1` guard ensures "Other" is visible even when its summed integer percentage rounds to 0.

---

## 6. Insurance Profitability

For each insurance type appearing in either dataset:

```
revenue            = SUM(booking_additional_costs.amount)
                     WHERE name = 'Insurance' AND insurance_type = T

businessPaidCost   = SUM(accidents.amount_paid_by_business)
                     WHERE the booking's insurance_types.name_original = T

netProfit          = revenue − businessPaidCost
```

Sorted DESC by `revenue`. Insurance types with revenue but no accidents show `businessPaidCost = 0`. Insurance types with accidents but no revenue (e.g. legacy bookings) show `revenue = 0`.

---

## 7. Filter Application (`CRM.tsx`)

A customer passes the filter if **all** of:

```
searchQuery   ⇒ name OR customer_number contains query (case-insensitive, trimmed)
amountRange   ⇒ min ≤ total_lifetime_value ≤ max
customerTypes ⇒ ANY of c.customer_types[] is in selected list
countryCode   ⇒ c.country_code === selected
city          ⇒ c.city === selected
lastBooking   ⇒ c.last_booking_date present AND
                (from ≤ last_booking_date ≤ to where bounds are present)
```

`amountMax` for the slider is derived as `ceil(max(total_lifetime_value) / 100) * 100`, with a fallback of `1000` when there are no customers.

`availableCities` depends on `filters.countryCode` — when a country is selected, only that country's cities are shown in the city combobox.

---

## 8. Customer Number Allocation

Performed by the booking-create flow (not by CRM). The next number is computed per user as:

```
COALESCE(
  MAX( CAST( SUBSTRING(customer_number FROM 2) AS INTEGER ) )  -- strip leading '#'
, 0) + 1
```

then formatted as `'#' || lpad(n, 5, '0')`. This mirrors `auto_generate_booking_number()` for bookings.
