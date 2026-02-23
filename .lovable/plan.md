

# Needs Repair Booking Restriction + Status Terminology Update

## Overview

Two feature sets with minimal risk:

**A) Needs Repair restriction**: Vehicles with `status = 'repair'` must be disabled in all booking forms. Currently, `getVehicleAvailability()` in `UnifiedBookingDialog` only checks bookings and maintenance blocks -- it completely ignores the vehicle's base status. The fix adds a third check.

**B) Terminology update**: Rename "Under Maintenance" to "Unavailable -- Under Maintenance" in the status modal, and update the maintenance scheduling dialog text. UI-only changes, no logic modifications.

---

## Current State Analysis

**Database enum**: `vehicle_status = "available" | "rented" | "maintenance" | "repair"` -- "repair" already exists in the enum. No schema changes needed.

**Availability logic gap**: `UnifiedBookingDialog.fetchAllData()` (line 170-184) fetches vehicles but does NOT include the `status` column. The `getVehicleAvailability()` function (line 195-234) only checks `rental_bookings` and `maintenance_blocks` -- never the vehicle's base status.

**Booking validation**: Frontend-only. No backend trigger currently prevents inserting a booking for a repair-status vehicle. Adding a backend trigger is out of scope per constraints but noted as a future improvement.

---

## Component-Level Changes

### 1. `src/components/booking/UnifiedBookingDialog.tsx`

**Data fetch**: Add `status` to the vehicle select query (line 173):
```
.select('id, make, model, year, license_plate, daily_rate, fuel_type, transmission_type, vehicle_type, type, status')
```

**Vehicle interface**: Add `status` field to the `Vehicle` interface (line 32-43).

**Availability check**: Add a third check at the TOP of `getVehicleAvailability()` (before booking/maintenance checks):
```
// Check if vehicle needs repair (always unavailable regardless of dates)
const vehicle = vehicles.find(v => v.id === vehicleId);
if (vehicle?.status === 'repair') {
  return {
    available: false,
    reason: 'repair',
    conflictInfo: language === 'el'
      ? 'Μη διαθέσιμο – Χρειάζεται Επισκευή'
      : 'Unavailable – Needs Repair'
  };
}
```

This check runs even when dates are not selected (move it before the `if (!startDate || !endDate)` guard).

**Badge rendering** (line 900-906): Add a third badge variant for `repair`:
```
reason === 'repair' ? 'Needs Repair' : ...
```

### 2. `src/components/fleet/VehicleDetails.tsx` -- Status Modal

**Line 435-443**: Change "Under Maintenance" label:
- EN: `"Under Maintenance"` -> `"Unavailable – Under Maintenance"`
- EL: `"Σε Συντήρηση"` -> `"Μη Διαθέσιμο – Σε Συντήρηση"`

**Line 441**: Change sub-text from "Select dates" to "Schedule unavailability dates".

### 3. `src/components/fleet/MaintenanceBlockDialog.tsx`

**Line 110**: Change dialog title:
- EN: `"Schedule Maintenance"` -> `"Schedule Unavailability"`
- EL: `"Προγραμματισμός Συντήρησης"` -> `"Προγραμματισμός Μη Διαθεσιμότητας"`

**Line 113-115**: Change description:
- EN: `"Select dates for maintenance of ${vehicleName}"` -> `"Select dates that ${vehicleName} is unavailable"`
- EL: Update Greek equivalent

**Add sub-description** below the dialog description:
- EN: `"Mark the dates during which this vehicle cannot be booked."`
- EL: `"Σημειώστε τις ημέρες κατά τις οποίες αυτό το όχημα δεν μπορεί να κρατηθεί."`

### 4. `src/contexts/LanguageContext.tsx`

Update the `maintenance` translation value from `"Maintenance"` to `"Under Maintenance"` (used in status badges across the app). The "Unavailable" prefix only appears in the edit status modal, not in compact badges.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Status changes during booking creation | The availability check runs on render. If status changes server-side mid-form, it won't be caught until form submission. Acceptable -- same behavior as existing booking/maintenance checks. |
| Repair vehicle with existing future bookings | Existing bookings remain valid. The restriction only prevents NEW bookings. No retroactive cancellation. |
| Vehicle toggled back to Available | Immediately becomes selectable again on next data fetch. No stale state. |
| Date-based unavailability + repair | Repair check runs first (highest priority). Even without dates selected, repair vehicles show as disabled. |

---

## Risk Assessment

- **Low risk**: No database changes. No logic changes to maintenance or booking processing.
- **Backward compatible**: Existing bookings unaffected. Enum already includes "repair".
- **No impact on**: Financial records, income modules, analytics, or aggregation.

---

## Technical Details

### VehicleAvailability type update

The existing `VehicleAvailability` interface uses `reason: 'booked' | 'maintenance'`. Add `'repair'` to the union:

```typescript
interface VehicleAvailability {
  available: boolean;
  reason?: 'booked' | 'maintenance' | 'repair';
  conflictInfo?: string;
}
```

### Files changed

| File | Type of Change |
|------|---------------|
| `src/components/booking/UnifiedBookingDialog.tsx` | Add `status` to fetch + Vehicle interface; add repair check in `getVehicleAvailability`; update badge for repair reason |
| `src/components/fleet/VehicleDetails.tsx` | Rename "Under Maintenance" label in status modal |
| `src/components/fleet/MaintenanceBlockDialog.tsx` | Update dialog title and description text |
| `src/contexts/LanguageContext.tsx` | Minor translation label update |

### Files NOT changed

- Database schema (enum already has "repair")
- `useVehicleStatus.ts` (already handles repair correctly)
- Financial/income modules
- `RentalBookingDialog.tsx` (vehicle is pre-selected, not user-chosen)
- Backend/edge functions

### Testing checklist

1. Open booking form from Home -- verify repair vehicles show disabled with "Unavailable -- Needs Repair" badge
2. Open booking form from Fleet calendar -- same check
3. Set a vehicle to "Needs Repair" then try to book it -- confirm blocked
4. Set it back to "Available" -- confirm selectable again
5. Verify maintenance-blocked vehicles still show correct "Under Maintenance" badge
6. Check status edit modal shows updated "Unavailable -- Under Maintenance" text
7. Open maintenance scheduling dialog -- confirm new description text
8. Verify Greek translations render correctly
9. Confirm existing bookings for repair vehicles still display in history

