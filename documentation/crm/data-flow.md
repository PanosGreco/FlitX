# CRM — Data Flow & Lifecycles

This document describes how data flows into, through, and out of the CRM section.

---

## 1. Customer Creation (Implicit, via Bookings)

Customers are **never created directly from CRM**. They are created as a side effect of the booking flow.

**Trigger:** User creates a booking via `UnifiedBookingDialog`.

**Flow:**
```
UnifiedBookingDialog.handleSave()
  │
  ├─ Resolve / create the customer:
  │    1. Look up customers WHERE user_id = auth.uid()
  │       AND lower(name) = lower(input_name)
  │    2. If found → reuse customer_id
  │    3. If not found → INSERT into customers
  │         (user_id, name, customer_number = '#' || lpad(next_seq, 5, '0'),
  │          email, phone, birth_date, city, country, country_code)
  │
  ├─ INSERT into rental_bookings (customer_id, customer_name, customer_type, ...)
  │
  ├─ INSERT/UPSERT into booking_contacts
  │    (booking_id, customer_email, customer_phone, customer_birth_date,
  │     customer_city, customer_country, customer_country_code)
  │
  └─ DB TRIGGER recompute_customer_booking_totals fires:
       UPDATE customers
         SET total_bookings_count = COUNT(*) over their bookings,
             total_lifetime_value = SUM(total_amount),
             first_booking_date = MIN(start_date),
             last_booking_date = MAX(start_date),
             updated_at = now()
       WHERE id = customer_id
```

**Propagation to CRM UI:**
```
useCustomers.fetchCustomers()
  │
  ├─ SELECT … FROM customers WHERE user_id = auth.uid()
  ├─ SELECT customer_id, customer_type, vehicles(type) FROM rental_bookings
  │     WHERE customer_id IN (…)
  │     → aggregated client-side into customer_types[] and vehicle_types[] sets
  ├─ SELECT customer_id, total_damage_cost FROM accidents
  │     WHERE customer_id IN (…)
  │     → aggregated client-side into total_damage_cost_sum
  │
  └─ setCustomers(rows)  → table re-renders, charts recompute
```

CRM refreshes via `refreshKey` after relevant mutations (accident creation).

---

## 2. Accident Creation

**Trigger:** User clicks "Add Accident Record" in the CRM page header → `AddAccidentDialog` opens.

**Flow:**
```
AddAccidentDialog
  │
  ├─ On open: fetch eligible bookings
  │    SELECT id, booking_number, customer_name, start_date, end_date,
  │           vehicle_id, vehicles(make, model)
  │    FROM rental_bookings
  │    WHERE user_id = auth.uid()
  │    ORDER BY start_date DESC
  │
  ├─ User picks a booking → vehicle_id, customer_name, customer_id derived
  ├─ User enters accident_date, description, totals, payer split, notes
  │
  └─ handleSave():
       │
       ├─ INSERT into accidents
       │    (user_id, booking_id, accident_date, description,
       │     total_damage_cost, amount_paid_by_insurance,
       │     amount_paid_by_customer, amount_paid_by_business,
       │     payer_type, notes)
       │
       │   → BEFORE INSERT trigger sync_accident_denorm_fields:
       │       SELECT customer_id, vehicle_id INTO NEW.customer_id, NEW.vehicle_id
       │       FROM rental_bookings WHERE id = NEW.booking_id
       │
       │   → AFTER INSERT trigger recompute_customer_accident_totals:
       │       UPDATE customers
       │         SET total_accidents_count = COUNT(*) for that customer,
       │             total_accidents_amount = SUM(amount_paid_by_business),
       │             updated_at = now()
       │       WHERE id = customer_id
       │
       ├─ IF "Also record as vehicle damage" toggle is ON:
       │    │
       │    ├─ Compress + validate each photo file (utils/imageUtils)
       │    ├─ For each photo:
       │    │    storage.from('damage-images').upload(
       │    │      `${vehicleId}/${timestamp}_${i}.${ext}`,
       │    │      file,
       │    │      { contentType: file.type }
       │    │    )
       │    │    → public URL pushed into uploadedUrls[]
       │    │
       │    └─ INSERT into damage_reports
       │         (user_id, vehicle_id, location = damage_zone,
       │          description = custom_notes OR
       │             `${accident_description} (from Accident Report)`,
       │          images = uploadedUrls,
       │          severity = 'minor')
       │
       │    NOTE: Damage insert failure does NOT roll back the accident.
       │          The accident is the primary record; the damage is a
       │          convenience side-effect.
       │
       ├─ toast.success('Accident saved')  [+ optional 'Damage entry added']
       ├─ resetForm()
       ├─ onSuccess() → CRM.tsx calls refresh() (useCustomers) and
       │                bumps accidentRefreshKey (AccidentHistory refetches)
       └─ onClose()
```

---

## 3. Linked Damage in Fleet

The damage row inserted by step 2 is **architecturally identical** to a damage row created manually from `Fleet → Vehicle → Damages`:

```
Fleet → VehicleDetail → DamageReport
  │
  └─ SELECT * FROM damage_reports
       WHERE vehicle_id = :vehicleId
       AND user_id = auth.uid()
       → grouped by location ('Front', 'Back', 'Right Side', …)
       → photos rendered from public URLs
```

There is no foreign key from `damage_reports` to `accidents`. The user can:
- Delete the damage from Fleet without affecting the accident (still visible in CRM Accident History)
- Delete the accident from CRM without affecting the damage (still visible in Fleet)

This independence is intentional — see `mem://features/vehicle-damage-reporting`.

---

## 4. Filter Application (Client-Side)

`CRMFilterBar` is a controlled component owned by `CRM.tsx`. It mutates a single `filters` object, and `CRM.tsx` derives `filteredCustomers` via `useMemo`. **No queries fire on filter changes** — all filtering is in-memory.

```
filters = {
  searchQuery,        // matches customer_number OR name (case-insensitive)
  amountRange,        // [min, max] inclusive over total_lifetime_value
  customerTypes,      // any-match against c.customer_types[]
  countryCode,        // exact match
  city,               // exact match (filtered options depend on countryCode)
  lastBookingFrom,    // last_booking_date >= from
  lastBookingTo,      // last_booking_date <= to
}
```

When filters change → `filteredCustomers` recomputes → `CustomerTable` re-renders. Charts always read from the unfiltered `customers` set (they describe the full population).

---

## 5. Chart Data Pipeline (`useCRMChartData`)

```
useCRMChartData()  (one fetch per mount)
  │
  ├─ Promise.all([
  │     accidents          ← accidents JOIN rental_bookings JOIN insurance_types
  │     customers          ← customers (id, birth_date, city, country, country_code)
  │     insuranceCosts     ← booking_additional_costs WHERE name='Insurance'
  │     bookingsWithTypes  ← rental_bookings (customer_type, vehicles.type)
  │   ])
  │
  ├─ ageGroups       = bucket accidents by customer age (18-22, 23-30, 31-45, 46-60, 61+)
  ├─ countries       = customer counts per country, grouped <5% as "Other"
  ├─ cities          = customer counts per city,    grouped <5% as "Other"
  ├─ customerTypes   = booking-level customer_type counts, grouped <5% as "Other"
  └─ insuranceProfit = revenue (additional costs) − businessPaidCost (accidents)
                       grouped by insurance type name
```

See [formulas.md](./formulas.md) for the math.

---

## 6. Accident History Display

`AccidentHistory` is a collapsible section under the customer table.

```
AccidentHistory  (re-fetches when refreshKey changes)
  │
  └─ SELECT a.*, rental_bookings(booking_number, customer_name,
                                 customers(customer_number),
                                 vehicles(make, model))
     FROM accidents a
     WHERE user_id = auth.uid()
     ORDER BY accident_date DESC
     → flattened to AccidentRecord[] with denormalised display fields
     → first 5 shown by default; "Show all" toggles full list
```

---

## 7. Cascade Behavior

| Action | Cascade |
|---|---|
| Delete a booking | `rental_bookings` row removed → trigger recomputes the owner customer's booking aggregates. Any `accidents` referencing that booking become orphaned at the FK level (constraint dependent). `booking_contacts` is removed via FK ON DELETE CASCADE. |
| Delete an accident | Trigger recomputes the customer's accident aggregates. Linked `damage_reports` are NOT touched. |
| Delete a vehicle | Bookings on that vehicle are removed → triggers fire. Any accidents linked via those bookings are removed via FK. Linked `damage_reports` are removed by Fleet's own cascade. |
| Delete a customer | Removes the customer row. Existing bookings retain `customer_name` (denormalised) but lose `customer_id`. CRM no longer shows the customer. |

---

## 8. Realtime / Refresh

CRM does **not** subscribe to `postgres_changes`. It uses imperative refresh:
- After inserting an accident → `useCustomers.refresh()` + `setAccidentRefreshKey(k+1)`
- On mount → both hooks fetch once
- The chart hook only re-fetches on user change (and not on filter changes)

This is appropriate because CRM mutations are low-frequency (an operator adds a few accidents per week, bookings flow in upstream and the next CRM visit picks them up).
