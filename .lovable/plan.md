

# Add Additional Information Section to Booking System

## Overview
Extend the booking system with a structured "Additional Information" section that supports a default "Insurance" category and user-defined custom categories with subcategory values. This data will be displayed across all booking detail views. Also confirms that the Reservations booking form already uses the same `UnifiedBookingDialog` component, ensuring field parity.

---

## Phase 1: Confirm Booking Form Parity (No Changes Needed)

The Reservations section already uses the same `UnifiedBookingDialog` component (with `preselectedVehicleId`). Payment Status and Fuel Level fields are already present in this shared component. Both entry points (Home Create dialog and Fleet Reservations) share the same form -- parity is already guaranteed.

---

## Phase 2: Database Schema (2 new tables + seed data)

### Table 1: `additional_info_categories`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | -- |
| `name` | text | No | -- |
| `is_default` | boolean | No | `false` |
| `created_at` | timestamptz | No | `now()` |

- Unique constraint on `(user_id, name)` to prevent duplicate category names per user.
- RLS policies for full CRUD scoped to `auth.uid() = user_id`.

### Table 2: `booking_additional_info`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `booking_id` | uuid | No | -- |
| `user_id` | uuid | No | -- |
| `category_id` | uuid | No | -- |
| `subcategory_value` | text | Yes | -- |
| `created_at` | timestamptz | No | `now()` |

- RLS policies for full CRUD scoped to `auth.uid() = user_id`.

### Seed Logic (via trigger)
A database trigger on `profiles` (after insert) will automatically create a default "Insurance" category (`is_default = true`) for each new user. For existing users, the migration will insert the "Insurance" category directly.

---

## Phase 3: Booking Form UI Update

**File:** `src/components/booking/UnifiedBookingDialog.tsx`

### New State
- `additionalInfoRows`: array of `{ categoryName: string, subcategoryValue: string, isDefault: boolean }`.
- Initialize with one row: `{ categoryName: 'Insurance', subcategoryValue: '', isDefault: true }`.

### New Form Section (after Fuel Level, before Notes)
**Title:** "Additional Information"

**Default row (Insurance):**
```
[ Insurance (read-only label) ] [ Insurance Type input (placeholder: "e.g. Premium") ]
```

**"Add Category" button** below the default row. Each new row:
```
[ Category Name input ] [ Subcategory input ] [ X remove button ]
```

### Save Logic Update
After booking is saved successfully:
1. For each row with a non-empty subcategory value:
   - Check if category exists for user in `additional_info_categories` (by name).
   - If not, create it.
   - Insert record into `booking_additional_info` with `booking_id`, `category_id`, `subcategory_value`.
2. Rows with empty subcategory values are skipped entirely (no empty records stored).
3. Reset additional info rows in `resetForm()`.

---

## Phase 4: Display Integration

### 4A. Vehicle Reservations / Booking History
**File:** `src/components/fleet/RentalBookingsList.tsx`

- After fetching bookings, also fetch `booking_additional_info` joined with `additional_info_categories` for those booking IDs.
- Display below Fuel/Payment fields:
  ```
  Additional Information:
  - Insurance: Premium
  - VIP Package: Gold
  ```
- Only render section if at least one entry exists.

### 4B. Home Calendar Views
**File:** `src/pages/Home.tsx`
- Extend `CalendarTask` interface with `additionalInfo?: { categoryName: string, subcategoryValue: string }[]`.
- After fetching bookings map, also fetch `booking_additional_info` + category names for all booking IDs found in tasks.
- Pass data through to calendar components.

**File:** `src/components/home/TimelineCalendar.tsx`
- In task detail popup: display additional info entries below fuel/payment (if any exist).

**File:** `src/components/home/MonthlyCalendar.tsx`
- In day popover task details: display additional info entries below fuel/payment (if any exist).

### 4C. Daily Program
**File:** `src/hooks/useDailyTasks.ts`
- Extend `DailyTask` interface with `additionalInfo?: { categoryName: string, subcategoryValue: string }[]`.
- After fetching tasks with booking IDs, also fetch `booking_additional_info` + category names for those booking IDs.

**File:** `src/components/daily-program/TaskItem.tsx`
- For delivery/return tasks: display additional info entries below fuel/payment section. Same compact format, only when data exists.

---

## Phase 5: Files to Modify (8 files)

| File | Change |
|------|--------|
| `supabase/migrations/` (new) | Create 2 tables, RLS policies, trigger, seed Insurance for existing users |
| `src/components/booking/UnifiedBookingDialog.tsx` | Add Additional Information form section + save logic |
| `src/components/fleet/RentalBookingsList.tsx` | Fetch and display additional info on booking cards |
| `src/pages/Home.tsx` | Extend CalendarTask + fetch additional info data |
| `src/components/home/TimelineCalendar.tsx` | Display additional info in task popup |
| `src/components/home/MonthlyCalendar.tsx` | Display additional info in day popover |
| `src/hooks/useDailyTasks.ts` | Extend DailyTask + fetch additional info |
| `src/components/daily-program/TaskItem.tsx` | Display additional info on task cards |

## What Will NOT Change
- Booking creation flow / pricing logic
- Financial calculations / revenue tracking
- Calendar rendering logic
- Delivery/Return task generation
- Vehicle status management
- Existing fuel level and payment status implementation

