

# UI Refinements and Full Integration of Fuel Level + Payment Status

## Overview
Three targeted changes: replace colored emojis with monochrome Lucide icons, add fuel/payment display to Daily Program task cards, and confirm booking form parity (already shared component).

---

## Phase 1: Replace Colored Emojis with Monochrome Icons

### Booking Form (`UnifiedBookingDialog.tsx`)
- **Line 1098**: Replace `⛽` emoji in the Fuel Level label with a Lucide `Fuel` icon (already imported in TimelineCalendar). Add `import { Fuel } from "lucide-react"` and render `<Fuel className="h-4 w-4 inline-block mr-1" />` before the label text.

### Reservations List (`RentalBookingsList.tsx`)
- **Line 302**: Replace `⛽` emoji in the fuel display with a Lucide `Fuel` icon inline.
- **Line 310**: Replace `💳` emoji in the payment display with a Lucide `CreditCard` icon inline.
- Add `import { Fuel, CreditCard } from "lucide-react"` to imports.

### Monthly Calendar (`MonthlyCalendar.tsx`)
- **Lines 141-145**: Replace `⛽` and `💳` emojis with `Fuel` and `CreditCard` Lucide icons (small, inline). These icons are likely already imported or available in this file.

No changes to layout, spacing, or font sizes.

---

## Phase 2: Add Fuel + Payment Display to Daily Program

### Data Layer (`useDailyTasks.ts`)
- Extend `DailyTask` interface with three new optional fields: `fuelLevel`, `paymentStatus`, `balanceDueAmount`.
- In `fetchTasks`, join `rental_bookings` via `booking_id` to retrieve `fuel_level`, `payment_status`, `balance_due_amount` for delivery/return tasks.
- Map these fields into the `DailyTask` objects.

### Task Card (`TaskItem.tsx`)
- Import `Fuel` and `CreditCard` from `lucide-react`.
- After the Notes section (line 175) and before the Complete Button, add a conditional block for delivery/return tasks:
  - If `task.fuelLevel` exists: show `Fuel` icon + fuel level text in small secondary style.
  - If `task.paymentStatus` exists: show `CreditCard` icon + payment status text ("Paid in Full" or "Balance Due (amount)").
- Only render when data exists. Do not show for "other" task types.

---

## Phase 3: Confirm Booking Form Parity (No Changes Needed)

Both the Home Create dialog and the Fleet Reservations section already use the same `UnifiedBookingDialog` component (with `embedded` mode for Home). The fuel level and payment status fields are already present in this shared component. No separate implementation exists -- parity is already guaranteed.

---

## Files to Modify (5 files)

| File | Change |
|------|--------|
| `src/components/booking/UnifiedBookingDialog.tsx` | Replace fuel emoji with Lucide `Fuel` icon in label |
| `src/components/fleet/RentalBookingsList.tsx` | Replace emojis with `Fuel` and `CreditCard` icons |
| `src/components/home/MonthlyCalendar.tsx` | Replace emojis with Lucide icons |
| `src/hooks/useDailyTasks.ts` | Extend interface + join booking data for fuel/payment |
| `src/components/daily-program/TaskItem.tsx` | Display fuel/payment for delivery/return tasks |

## What Will NOT Change
- Booking creation logic
- Pricing/revenue calculations
- Calendar rendering logic
- Layout structure or spacing
- Other Task behavior
- Existing field order

