# Fleet — Edge Cases & Error Handling

## Overview

This document covers error scenarios, boundary conditions, and safeguards implemented across the Fleet section.

---

## 1. Vehicle Not Found

**Scenario**: User navigates to `/vehicle/:id` with an invalid or deleted ID.

**Handling**: `VehicleDetail.tsx` uses `maybeSingle()` which returns null for missing records → `navigate('/')` redirect to home page.

---

## 2. Empty States

| Component | Empty Condition | Behavior |
|-----------|----------------|----------|
| `VehicleGrid` | No vehicles | Message: "No vehicles" with Add Vehicle CTA |
| `VehicleGrid` | No search/filter results | Message: "No search results" |
| `CalendarView` | No bookings | Empty calendar (all dates default color) |
| `RentalBookingsList` | No bookings | Empty state with calendar icon |
| `VehicleMaintenance` | No records | "Add first record" CTA |
| `VehicleReminders` | No reminders | Descriptive empty state |
| `VehicleDocuments` | No documents | Icon + "No documents yet" |
| `DamageReport` | No damages | Empty zone sections |

---

## 3. Sold Vehicle Behavior

When `is_sold = true`:

| Aspect | Behavior |
|--------|----------|
| Grid position | Sorted to bottom (always after active vehicles) |
| Card image | Reduced opacity |
| Status badge | "SOLD" badge replaces computed status |
| Daily rate | Sale price shown instead |
| Booking selectors | Excluded via `is_sold` filter |
| Maintenance selectors | Excluded |
| AI analysis | Pre-sale data included in global totals; excluded from per-vehicle table |
| Finance tab | Shows sold summary with profit/loss instead of depreciation progress |

---

## 4. Booking Conflict Prevention

**Scenario**: User tries to book dates that overlap with existing booking or maintenance block.

**Handling**: `CalendarView` click handler checks `isBooked || isMaintenance` before processing click → returns early if date is unavailable. Visually, booked dates are red and maintenance dates are orange, signaling unavailability.

**Note**: There is no server-side double-booking prevention. The calendar UI is the primary defense. Concurrent users booking the same dates is theoretically possible but unlikely in single-user fleet management.

---

## 5. Document Upload Failure — Rollback Pattern

```
1. Upload file to storage bucket → SUCCESS
2. Insert record to vehicle_documents → FAILURE
3. Rollback: storage.remove(filePath) → clean up orphaned file
```

**Risk**: If step 3 (rollback) also fails, an orphaned file remains in storage with no DB reference. No automated cleanup exists.

---

## 6. File Size Validation

`validateFileSize()` checks file size before upload attempt. If file exceeds limit:
- Toast error displayed
- Upload aborted
- No storage or DB operations attempted

Image files are compressed via `compressImage()` before processing, reducing likelihood of size limit hits.

---

## 7. Custom Category Normalization

```typescript
normalizeCategory(input):
  → trim()
  → toLowerCase()
  → replace(/\s+/g, '_')
```

Prevents duplicates like "Oil Change", "oil change", "Oil  Change" from creating separate categories.

Applied to: maintenance categories, additional cost categories, vehicle type categories.

---

## 8. Status Computation Race Conditions

`useFleetStatuses` makes 3 parallel queries:
- If any query fails → that dataset defaults to empty array
- Partial data = partial status computation (e.g., if bookings fail to load, no vehicle shows as "rented")
- No retry logic — user must refresh page

---

## 9. Zero Purchase Price

**Scenario**: Vehicle has no `purchase_price` or `purchase_price = 0`.

**Handling**: 
- Depreciation section hidden entirely (`purchaseValue && purchaseValue > 0` guard)
- Vehicle Averages card still shown (revenue/cost calculations don't depend on purchase price)
- Sale profit/loss calculation uses 0 as purchase price base

---

## 10. Vehicle With No `created_at`

**Scenario**: Edge case where `created_at` is null or invalid.

**Handling**: `calculateActiveDays()` returns 0 → all daily average calculations produce `Infinity` or `NaN` → displayed as null/empty in UI.

---

## 11. Booking Delete Cascade — Partial Failure

The cascade is sequential (storage → tasks → financial_records → booking):
- If step 2 fails, contract photo is already deleted from storage (cannot undo)
- If step 3 fails, daily_tasks are deleted but financial_records remain orphaned
- No transaction wrapping — each DELETE is independent

**Mitigation**: Errors are caught per-step, but the cascade continues regardless of individual failures (best-effort cleanup).

---

## 12. Large Dataset Considerations

- `daily_tasks` fetch in Home: no date filtering → all non-completed tasks → 1000-row Supabase limit
- `rental_bookings` fetch in CalendarView: all bookings for vehicle → no pagination
- `financial_records` fetch in VehicleFinanceTab: all records for vehicle → client-side pagination (10/page)
- `useFleetStatuses` batch: fetches ALL bookings + blocks for ALL vehicles → O(total bookings) query

---

## 13. Timezone Handling

All dates stored as `yyyy-MM-dd` strings in the database:
- No timezone conversion performed
- Date comparisons use string matching or `parseISO()` (which defaults to local timezone)
- **Implication**: A booking created at 11 PM in one timezone might appear on a different date in another timezone
- **Current scope**: Single-user fleet management — timezone differences are unlikely to cause issues

---

## 14. Image Storage

- Vehicle images: base64 data URLs stored directly in `vehicles.image` column
  - Pro: Simple, no storage bucket needed
  - Con: Increases row size significantly, slower queries
- Damage images: Stored in `damage-images` storage bucket (proper approach)
- Document files: Stored in `vehicle-documents` storage bucket (proper approach)
- Contract photos: Stored in `rental-contracts` storage bucket (proper approach)
