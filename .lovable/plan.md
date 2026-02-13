
# Add Fuel Level and Payment Status to Booking System

## Overview
Extend the existing booking system with two new optional informational fields -- **Fuel Level** and **Payment Status** -- across all booking creation entry points, calendar popups, and booking history views. No existing logic will be modified.

---

## Phase 1: Database Schema Update

Add three new columns to the `rental_bookings` table:

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `fuel_level` | text | Yes | NULL |
| `payment_status` | text | Yes | `'paid_in_full'` |
| `balance_due_amount` | numeric | Yes | NULL |

A single SQL migration will handle this. No triggers, no new tables. Existing bookings will default to `paid_in_full` with null fuel/balance values and will display gracefully (hidden when null).

---

## Phase 2: Booking Form UI Update

**File:** `src/components/booking/UnifiedBookingDialog.tsx`

This is the single unified booking component used by both the Home Create dialog and the Fleet Reservations section. Changes here apply everywhere.

### New State Variables
- `paymentStatus` (default: `'paid_in_full'`)
- `balanceDueAmount` (default: 0)
- `fuelLevel` (default: `''`)

### New Form Sections (placed after the Pricing section, before Notes)

1. **Payment Status** -- A `RadioGroup` with two options:
   - "Paid in Full" (default)
   - "Balance Due" -- reveals a numeric input for the balance amount

2. **Fuel Level** -- A text `Input` with a fuel pump emoji in the label. Optional, free-text (e.g., "Full", "75%", "3/4").

### Save Logic Update
Include `fuel_level`, `payment_status`, and `balance_due_amount` in the booking insert object. Reset these fields in `resetForm()`.

---

## Phase 3: Display Integration

### 3A. Timeline Calendar Task Popup
**File:** `src/components/home/TimelineCalendar.tsx`

For delivery/return task popups, display Fuel Level and Payment Status below existing fields (Location, Notes). Only shown when data exists.

This requires passing the new fields through the `CalendarTask` interface.

**File:** `src/pages/Home.tsx`
- Update `CalendarTask` interface to include `fuelLevel`, `paymentStatus`, `balanceDueAmount`.
- Update `fetchTasks` to include these fields from the `rental_bookings` join data (via `bookingsMap`).

### 3B. Monthly Calendar Popups
**File:** `src/components/home/MonthlyCalendar.tsx`

Add fuel level and payment info beneath existing task details in the popover content. Only for delivery/return tasks with data.

### 3C. Vehicle Reservations (Booking History)
**File:** `src/components/fleet/RentalBookingsList.tsx`

- Update the `RentalBooking` interface to include the three new fields.
- Append below existing booking details (Pickup/Return/Notes) in smaller text, only when values exist:
  - `Fuel Level: Full`
  - `Payment: Paid in Full` or `Payment: Balance Due (euro200)`

---

## Phase 4: Technical Details

### Files Modified (6 files)

| File | Change |
|------|--------|
| `supabase/migrations/` (new) | Add 3 columns to `rental_bookings` |
| `src/components/booking/UnifiedBookingDialog.tsx` | Add form fields + save logic |
| `src/pages/Home.tsx` | Extend `CalendarTask` interface + fetch new booking fields |
| `src/components/home/TimelineCalendar.tsx` | Show fuel/payment in task popup |
| `src/components/home/MonthlyCalendar.tsx` | Show fuel/payment in day popover |
| `src/components/fleet/RentalBookingsList.tsx` | Show fuel/payment in booking cards |

### What Will NOT Change
- Booking pricing/revenue calculations
- Financial record creation logic
- Calendar rendering logic
- Delivery/Return task generation
- Vehicle status management
- Daily Program / Other Task system
