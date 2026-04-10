# Daily Program — Data Flow

## Overview

This document traces every data lifecycle in the Daily Program section, from task generation through enrichment to deletion.

---

## 1. Booking → Task Generation Flow

When a booking is created via `UnifiedBookingDialog` (from Fleet or Home):

```
UnifiedBookingDialog
  │
  ├── 1. INSERT rental_bookings (customer_name, vehicle_id, start_date, end_date, pickup_time, return_time, pickup_location, dropoff_location, contract_photo_path, ...)
  │
  ├── 2. INSERT financial_records (rental income + additional costs + optional VAT expense)
  │
  ├── 3. INSERT daily_tasks × 2:
  │     │
  │     ├── Task 1 (delivery/pickup):
  │     │   ├── task_type = 'delivery'
  │     │   ├── due_date = booking.start_date
  │     │   ├── due_time = booking.pickup_time
  │     │   ├── location = booking.pickup_location
  │     │   ├── vehicle_id = booking.vehicle_id
  │     │   ├── booking_id = booking.id
  │     │   ├── contract_path = booking.contract_photo_path
  │     │   └── title = customer_name (or vehicle name)
  │     │
  │     └── Task 2 (return/drop-off):
  │         ├── task_type = 'return'
  │         ├── due_date = booking.end_date
  │         ├── due_time = booking.return_time
  │         ├── location = booking.dropoff_location
  │         ├── vehicle_id = booking.vehicle_id
  │         ├── booking_id = booking.id
  │         ├── contract_path = booking.contract_photo_path
  │         └── title = customer_name (or vehicle name)
  │
  ├── 4. INSERT booking_contacts (conditional):
  │     │
  │     │   Only executed if ANY of the following optional customer fields are filled:
  │     │   customer_email, customer_phone, customer_birth_date, customer_city, or customer_country.
  │     │   If all five are empty, this step is skipped entirely.
  │     │
  │     │   Columns written:
  │     │   ├── booking_id — links to the parent rental_bookings row
  │     │   ├── user_id — the authenticated user
  │     │   ├── customer_email — optional, nullable
  │     │   ├── customer_phone — optional, nullable
  │     │   ├── customer_birth_date — optional, nullable (DATE type)
  │     │   ├── customer_city — optional, nullable
  │     │   ├── customer_country — optional, nullable
  │     │   └── customer_country_code — optional, nullable (ISO code)
  │     │
  │     │   Note: customer_name is NOT in booking_contacts — it remains
  │     │   in rental_bookings.customer_name as a required field.
  │     │
  │     └── On failure: warning toast shown, booking is NOT rolled back.
  │
  └── 5. INSERT booking_additional_info × N (per info category)
```

**Key detail**: Both tasks receive the same `contract_path`, allowing contract viewing from either task.

---

## 2. Manual Task Creation Flow

```
AddTaskDialog
  │
  ├── User fills form:
  │   ├── type: 'other' (or delivery/return)
  │   ├── title: required for 'other', auto-derived for delivery/return
  │   ├── vehicle: optional for 'other', required for delivery/return
  │   ├── date: from date picker (synced with page selectedDate)
  │   ├── time: 24h hourly selector (00:00 - 23:00)
  │   ├── location: only for delivery/return
  │   └── notes: optional textarea
  │
  ├── Validation:
  │   ├── 'other' → title required
  │   └── 'delivery'/'return' → vehicle required
  │
  ├── INSERT daily_tasks:
  │   ├── task_type = selected type
  │   ├── due_date = selected date
  │   ├── due_time = selected time
  │   ├── title = user input (other) or vehicle name placeholder
  │   ├── description = notes
  │   ├── location = location input
  │   ├── vehicle_id = selected vehicle (or null)
  │   ├── booking_id = null (manual tasks have no booking)
  │   └── status = 'pending', priority = 'medium'
  │
  └── Success → close dialog → fetchTasks() refetch
```

---

## 3. Data Enrichment on Fetch

`useDailyTasks(selectedDate)` performs 4 sequential queries to build rich task objects:

```
Step 1: Fetch daily_tasks
  SELECT daily_tasks.*, vehicles.make, vehicles.model, vehicles.type, vehicles.license_plate
  FROM daily_tasks
  LEFT JOIN vehicles ON daily_tasks.vehicle_id = vehicles.id
  WHERE due_date = selectedDateString
  AND status NOT IN ('completed', 'cancelled')
  ORDER BY due_time ASC

Step 2: For tasks with booking_id, fetch booking details
  SELECT id, fuel_level, payment_status, balance_due_amount, customer_name
  FROM rental_bookings
  WHERE id IN (task.booking_id, ...)

Step 3: For tasks with booking_id, fetch additional info
  SELECT booking_id, category_id, subcategory_value
  FROM booking_additional_info
  WHERE booking_id IN (...)

Step 4: For additional info categories, fetch category names
  SELECT id, name
  FROM additional_info_categories
  WHERE id IN (category_id, ...)
```

**Result**: Each task object contains:
- Base task data (title, time, location, status)
- Vehicle info (make, model, type, plate)
- Booking enrichment (fuel level, payment status, balance due, customer name)
- Additional info rows (category name + subcategory value pairs)
- Contract path (for viewer)

---

## 4. Task Update Flow

```
TaskItem → Edit button → EditTaskDialog
  │
  ├── Editable fields:
  │   ├── title (only for 'other' type)
  │   ├── due_time (native time input)
  │   ├── location
  │   ├── description (notes)
  │   └── completed toggle (status: pending ↔ completed)
  │
  ├── Read-only fields:
  │   ├── task_type (shown in muted box)
  │   └── vehicle (shown in muted box)
  │
  ├── UPDATE daily_tasks SET changed fields WHERE id = task.id
  │
  └── Success → close dialog → fetchTasks() refetch
```

**Complete/Reopen toggle** (from TaskItem directly, without opening EditTaskDialog):
```
TaskItem → Complete button
  │
  ├── UPDATE daily_tasks SET status = 'completed' WHERE id = task.id
  │   (or SET status = 'pending' if reopening)
  │
  └── fetchTasks() refetch
```

---

## 5. Task Delete Flow

```
TaskItem → Delete button → Confirmation
  │
  ├── If task has contractPath:
  │   └── DELETE from 'rental-contracts' storage bucket
  │
  ├── DELETE FROM daily_tasks WHERE id = task.id
  │
  └── fetchTasks() refetch
```

---

## 6. Contract Delete Flow (Without Deleting Task)

```
TaskItem → Contract preview → Delete contract button
  │
  ├── DELETE from 'rental-contracts' storage bucket
  │
  ├── UPDATE daily_tasks SET contract_path = null WHERE id = task.id
  │
  ├── If task has booking_id:
  │   └── UPDATE rental_bookings SET contract_photo_path = null WHERE id = booking_id
  │
  └── fetchTasks() refetch
```

This ensures both the task and the source booking stay in sync regarding contract photos.

---

## 7. Booking Delete Cascade (From Fleet)

When a booking is deleted from Fleet's `RentalBookingsList`:

```
RentalBookingsList → Delete booking
  │
  ├── 1. DELETE contract from 'rental-contracts' storage (if exists)
  ├── 2. DELETE FROM daily_tasks WHERE booking_id = booking.id
  ├── 3. DELETE FROM financial_records WHERE booking_id = booking.id
  ├── 4. DELETE FROM rental_bookings WHERE id = booking.id
  │
  └── UI refresh (refreshBookings counter increment)
```

The `daily_tasks` deletion is explicit (step 2), not a DB cascade constraint. This means if the cascade code is skipped, orphan tasks could remain.

---

## 8. Dependency Mapping

```
rental_bookings ──generates──→ daily_tasks (delivery + return)
                                    │
vehicles ──────────referenced by────┘
                                    │
booking_additional_info ──enriches──┘
additional_info_categories ──labels──┘

vehicle_reminders ──NOT injected──→ Daily Program
  (reminders are a separate system, shown only in Home's RemindersWidget)
```

---

## 9. Cleanup Edge Function

The `cleanup-completed-tasks` edge function handles automated cleanup:
- Targets `daily_tasks` with `status = 'completed'`
- Removes tasks older than a configured threshold
- Prevents accumulation of historical completed tasks
