# Home Section — Data Flow

## 1. Booking → Timeline Calendar

This is the primary data pipeline that populates the Home timeline.

### Step-by-step lifecycle:

```
UnifiedBookingDialog (embedded in CreateDialog)
    │
    ▼
rental_bookings INSERT
    │  (customer_name, vehicle_id, start_date, end_date,
    │   pickup_time, return_time, pickup_location, dropoff_location,
    │   fuel_level, payment_status, contract_photo_path, etc.)
    │
    ▼
daily_tasks INSERT (automated by booking system)
    │  Two tasks generated per booking:
    │  1. task_type='delivery', due_date=start_date, due_time=pickup_time
    │  2. task_type='return', due_date=end_date, due_time=return_time
    │  Both linked via booking_id and vehicle_id
    │
    ▼
Home.tsx fetchTasks()
    │  Query 1: daily_tasks (non-completed/cancelled) with vehicle join
    │  Query 2: rental_bookings (for customer_name, contract_photo_path,
    │           fuel_level, payment_status, balance_due_amount)
    │  Query 3: booking_additional_info + additional_info_categories
    │           (for extra metadata like driver license info)
    │
    ▼
CalendarTask[] mapping
    │  Merges task data + booking data + additional info
    │  into unified CalendarTask interface
    │
    ▼
Passed to TimelineCalendar + MonthlyCalendar
    │
    ▼
UI renders task cards on the 7-day × 24-hour grid
```

### Data enrichment detail:

`Home.tsx` performs **3 sequential queries** to build the full task picture:

1. **Tasks query**: `daily_tasks` with embedded `vehicles (make, model, license_plate)` join, filtered by `user_id` and excluding `completed`/`cancelled` status.

2. **Bookings query**: All `rental_bookings` for the user. Creates a `Map<bookingId, {customerName, contractPath, fuelLevel, paymentStatus, balanceDueAmount}>`.

3. **Additional info query**: `booking_additional_info` for all booking IDs → resolves `category_id` to `additional_info_categories.name` → attaches as `additionalInfo[]` array per booking.

### CalendarTask interface:

```typescript
interface CalendarTask {
  id: string;
  type: 'delivery' | 'return' | 'other';
  title: string;
  date: string;              // yyyy-MM-dd
  time: string | null;       // HH:MM (truncated from HH:MM:SS)
  location: string | null;
  vehicleName: string | null;
  vehicleId: string | null;
  bookingId: string | null;
  customerName?: string;
  notes?: string | null;
  contractPath?: string | null;
  fuelLevel?: string | null;
  paymentStatus?: string | null;
  balanceDueAmount?: number | null;
  additionalInfo?: { categoryName: string; subcategoryValue: string }[];
}
```

**Time truncation**: `due_time` is stored as `HH:MM:SS` in the database but displayed as `HH:MM`. The mapping does `task.due_time.substring(0, 5)`.

---

## 2. Manual Task Creation

```
CreateDialog → "Other Task" tab
    │
    │  User fills: title*, date*, time (optional), notes, vehicle (optional)
    │
    ▼
daily_tasks INSERT
    │  task_type: 'other'
    │  status: 'pending'
    │  priority: defaults to 'medium' (DB default)
    │  vehicle_id: optional
    │  booking_id: null
    │
    ▼
onSuccess() callback
    │  Increments refreshTrigger in Home.tsx
    │
    ▼
useEffect triggers fetchTasks() re-fetch
    │
    ▼
Timeline + MonthlyCalendar re-render with new task
```

**Note**: The CreateDialog fetches its own `vehicles` list independently from `Home.tsx` — it queries `vehicles` table filtered by `user_id` to populate the optional vehicle dropdown.

---

## 3. Reminder Flow

```
vehicle_reminders table
    │  (created via Fleet → Vehicle → Reminders section)
    │
    ▼
RemindersWidget.fetchWeeklyReminders()
    │  Query: vehicle_reminders WHERE user_id = user
    │         AND due_date = today (yyyy-MM-dd)
    │  Joins: vehicles (make, model)
    │
    ▼
Sorted: incomplete first, completed last
    │  Displayed as "Vehicle Name – Reminder Title"
    │  Max 5 visible, "+N more" for overflow
    │
    ▼
User toggles checkbox
    │
    ▼
vehicle_reminders UPDATE (is_completed = true/false)
    │
    ▼
Full re-fetch of reminders list
```

**Important**: Reminders are **vehicle-scoped only**. They come exclusively from `vehicle_reminders`, NOT from `user_reminders` or `daily_tasks`. This is by design — the Home reminders widget shows vehicle-specific operational reminders.

---

## 4. Notes Flow

```
NotesWidget mount / date change
    │
    ▼
user_notes SELECT WHERE user_id = user AND note_date = selectedDate
    │  Uses .single() — expects 0 or 1 row
    │  PGRST116 error (no rows) = empty note (handled silently)
    │
    ▼
User types in textarea
    │  Each keystroke: setContent() + clear previous timeout + set new 1000ms timeout
    │
    ▼
After 1000ms of no typing (OR on blur):
    │
    ├── If noteId exists: UPDATE user_notes SET content = newContent
    │
    └── If no noteId AND content not empty: INSERT user_notes → set noteId from response
```

**Key design**: One note per user per day. The `note_date` column acts as a natural key alongside `user_id`. The widget has its own independent date picker, separate from the timeline's `selectedDate`.

---

## 5. Contract Photo Display

```
CalendarTask.contractPath (from rental_bookings.contract_photo_path)
    │
    ▼
ContractPreview component
    │  supabase.storage.from('rental-contracts').getPublicUrl(contractPath)
    │
    ├── If extension is .pdf → shows PDF icon placeholder
    └── If image → shows thumbnail with object-cover
    │
    ▼
Click opens FilePreviewModal (full-screen view)
```

The `ContractPreview` only renders when `contractPath` is truthy. It appears in the task detail dialog (right side) for delivery/return tasks only.

---

## 6. Financial Impact (Indirect)

When a booking is created via Home's CreateDialog:

```
CreateDialog → UnifiedBookingDialog (embedded=true)
    │
    ▼
rental_bookings INSERT
    │
    ▼
financial_records INSERT (by UnifiedBookingDialog logic)
    │  - Rental income record
    │  - Additional cost records (if any)
    │  - VAT expense record (if VAT enabled)
    │
    ▼
Analytics section reads these financial_records
    │
    ▼
AI Assistant reads via computeFinancialContext()
```

Home itself does NOT display financial data. The financial impact is entirely downstream.
