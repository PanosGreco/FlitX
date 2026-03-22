# Fleet — Data Flow

## Overview

This document traces every data lifecycle within the Fleet section, from user action to database mutation to cross-section propagation.

---

## 1. Vehicle Creation Flow

```
User Action          Database                    Side Effects
───────────────────────────────────────────────────────────────
Add Vehicle dialog → vehicles INSERT          → Realtime subscription
(type, category,     (image as base64           triggers fleet grid
 make, model, year,   data URL if provided)      refresh in Fleet.tsx
 fuel, transmission,
 passengers, plate,
 daily_rate, mileage,
 purchase_price,
 market_value_at_purchase)
```

### Validation Rules
- **Required fields**: vehicle_type, type (category), make, model, year
- **Defaults**: `status = 'available'`, `is_sold = false`, `transmission_type = 'manual'`, `vehicle_type = 'car'`
- **Image handling**: Compressed via `compressImage()` before converting to base64 data URL stored in `vehicles.image` column
- **Category logic**: Some vehicle types have predefined category dropdowns (e.g., car → Sedan/SUV/Hatchback); types with no presets show a free-text input

### Cross-Section Impact
- Vehicle immediately appears in booking selectors across the app
- Vehicle available for AI analysis on next `financial_analysis` or `pricing_optimizer` request

---

## 2. Booking Creation Flow (from Vehicle Calendar)

```
CalendarView                UnifiedBookingDialog           Database
─────────────────────────────────────────────────────────────────────
Date selection          →   Form fills with           →   1. rental_bookings INSERT
(click start date,          vehicle + dates               2. financial_records INSERT
 click end date)            User enters:                     (rental income)
                            - customer name               3. financial_records INSERT × N
                            - pickup/return times            (additional costs)
                            - pickup/dropoff locations    4. financial_records INSERT
                            - total amount                   (VAT expense, if enabled)
                            - fuel level                  5. daily_tasks INSERT × 2
                            - notes                          (delivery + return)
                            - additional costs            6. booking_contacts INSERT
                            - additional info                (if email/phone provided)
                            - contract photo              7. booking_additional_info
                            - payment status                 INSERT × N (per category)
```

### Detailed Insert Sequence

1. **`rental_bookings`**: Core booking record with vehicle_id, customer_name, dates, amount, status
2. **`financial_records`** (income): `type='income'`, `category='rental_income'`, `income_source_type` based on booking origin, `vehicle_id` linked, `booking_id` linked
3. **`financial_records`** (additional costs): One record per additional cost item, `category` from `additional_cost_categories`, `booking_id` linked
4. **`financial_records`** (VAT): If VAT enabled via `useVatSettings()`, `type='expense'`, `category='vat'`, `amount = totalIncome * (vatRate / 100)`
5. **`daily_tasks`**: Two tasks created — `task_type='delivery'` on `start_date` with `pickup_time`, `task_type='return'` on `end_date` with `return_time`
6. **`booking_contacts`**: Email and phone stored separately for privacy/querying
7. **`booking_additional_info`**: Per-category metadata (e.g., driver license category, ID number)

### UI Refresh Chain
```
INSERT complete → refreshBookings++ → CalendarView refetches bookings
                                    → RentalBookingsList refetches
                                    → refetchStatus() → status badge updates
                                    → Analytics Realtime fires (financial_records)
                                    → Home timeline shows new tasks (next fetch)
```

---

## 3. Booking Delete Cascade

```
User clicks Delete → Confirmation dialog → Sequential deletions:

1. Storage: Remove contract photo from rental-contracts bucket
2. daily_tasks: DELETE WHERE booking_id = X
3. financial_records: DELETE WHERE booking_id = X
4. rental_bookings: DELETE WHERE id = X
5. UI: refreshBookings++ triggers refetch
```

### Cascade Order Rationale
- Storage files removed first (no FK dependency, hardest to orphan-clean)
- `daily_tasks` before `financial_records` (both reference booking_id)
- `rental_bookings` last (parent record, FK constraints prevent early deletion)
- **Risk**: Partial failure can leave orphan records (e.g., if step 3 fails, tasks are deleted but financial records remain)

---

## 4. Maintenance Creation Flow

```
VehicleMaintenance dialog → Database                    → Side Effects
─────────────────────────────────────────────────────────────────────
Form: type, date,       → 1. vehicle_maintenance INSERT → Local refetch in
cost, description,        2. financial_records INSERT     VehicleMaintenance
next_date                    (if cost > 0:               → Analytics Realtime
                             type='expense',                fires
                             category='maintenance',
                             expense_subcategory=type,
                             source_section=
                              'vehicle_maintenance')
```

### Category System
- **Predefined types**: From `MAINTENANCE_TYPES` constant (oil_change, tires, brakes, general_service, battery, suspension, engine, transmission, other)
- **Custom categories**: User-created via `useMaintenanceCategories` hook, stored in `maintenance_categories` concept (normalized for dedup)
- **Dual insert**: Both `vehicle_maintenance` (for maintenance history) AND `financial_records` (for analytics) when cost > 0

---

## 5. Reminder Flow

```
VehicleReminders → vehicle_reminders INSERT → Manual refetch
                   (title, due_date,          in VehicleReminders
                    description,             → Appears in Home
                    vehicle_id)                RemindersWidget
                                               when due_date = today
```

- No automatic notifications — reminders are passive (displayed when viewed)
- Home's `RemindersWidget` fetches `vehicle_reminders` for today's date independently

---

## 6. Document Upload Flow

```
VehicleDocuments dialog → Validation → Upload → Database → Error handling
─────────────────────────────────────────────────────────────────────────
File selected        → validateFileSize() → Upload to          → vehicle_documents
                     → compressImage()      vehicle-documents     INSERT (name,
                       (if image)           bucket                file_path,
                                            Path: userId/         file_type,
                                            vehicleId/            file_size)
                                            timestamp_name.ext  → On DB failure:
                                                                   storage.remove()
                                                                   (rollback)
```

### Viewing Documents
- **FilePreviewModal**: Generates signed URL (1-hour TTL) via `storage.createSignedUrl()`
- **Download**: Fetches blob via signed URL → creates programmatic `<a>` element → triggers download
- **Delete**: Removes from storage bucket THEN deletes DB record

---

## 7. Damage Report Flow

```
DamageReport → Category selection → Multi-file upload → Database
─────────────────────────────────────────────────────────────────
Select zone:    Upload images to    damage_reports INSERT
Front/Back/     damage-images       (vehicle_id, description,
Right/Left/     bucket              images: string[],
Interior/Tires                      severity, location=zone)
```

- Images stored as public URLs in the `damage-images` storage bucket
- Multiple images per report stored as a string array in the `images` column
- Delete removes images from storage + deletes DB record

---

## 8. Vehicle Sale Flow

```
Finance Tab "Record Sale" → Calculation → Database → UI Update
─────────────────────────────────────────────────────────────────
User enters sale_price → profitOrLoss =           → 1. financial_records INSERT
                         salePrice -                    (category='vehicle_sale',
                         max(0, purchasePrice -          amount=profitOrLoss)
                              netIncome)            → 2. vehicles UPDATE
                                                         (is_sold=true,
                                                          sale_price,
                                                          sale_date)
                                                    → 3. Vehicle sorted to
                                                         bottom of grid
                                                    → 4. SOLD badge replaces
                                                         status badge
```

---

## 9. Vehicle Edit Flow

```
EditVehicleDialog → vehicles UPDATE → Realtime subscription → UI refresh
                    (any field)       on vehicles table        VehicleDetail
                                      (filtered by             refetches
                                       vehicle ID)
```

- Realtime channel is specific to the vehicle ID: only UPDATE events for this vehicle trigger refresh
- Edit affects: make, model, year, type, fuel_type, transmission_type, passenger_capacity, license_plate, daily_rate, mileage, image, purchase_price, market_value_at_purchase

---

## 10. Status Computation Flow

```
useVehicleStatus(vehicleId) → Parallel fetches → computeStatusForDate()
                               ├── rental_bookings (active/confirmed for vehicle)
                               ├── maintenance_blocks (for vehicle)
                               └── vehicles.status (base status)

Priority chain:
1. Booking overlaps today → "rented"
2. Maintenance block overlaps today → "maintenance"
3. Base status === "repair" → "repair"
4. Else → "available"
```

- Uses `isWithinInterval()` from date-fns for date range checking
- `useFleetStatuses(vehicleIds)` applies this in batch for the fleet grid view
- Status is **computed, not stored** — always derived from current bookings and blocks
