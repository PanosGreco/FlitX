# Daily Program — Edge Cases

## Empty States

### No tasks for selected date
Each `DailyProgramSection` renders: `"No scheduled [title]"` message (e.g., "No scheduled drop-offs").

### No vehicles in fleet
`AddTaskDialog` shows "No vehicles found" hint. Delivery/return tasks cannot be created (vehicle is mandatory). Other tasks can still be created without a vehicle.

---

## Task Generation Edge Cases

### Booking without tasks
Possible if booking creation succeeds (`rental_bookings` INSERT) but `daily_tasks` INSERT fails. No automatic repair mechanism exists — the booking will appear in Fleet's calendar but no corresponding tasks will show in Daily Program.

### Duplicate task creation
No deduplication check exists. If the booking creation flow runs twice (e.g., double-click, network retry), duplicate delivery/return tasks will be created for the same booking. Each will have the same `booking_id` but different `id` values.

### Same-day pickup & return
When `booking.start_date === booking.end_date`, both a delivery task and a return task are generated for the same date. They appear in different columns (Pick-Ups vs Drop-Offs) — this is correct behavior.

---

## Task Data Edge Cases

### Task without vehicle
Allowed only for `other` type tasks. `vehicleName` renders as `null` — the task card shows only the user-defined title. Delivery/return tasks always have a vehicle.

### Task without time
`scheduledTime` is stored as empty string when no time is set. In the sorted list, empty strings sort to the top (lexicographic: `"" < "09:00"`). The time display area renders blank.

### Task without location
Location line is simply not rendered. No placeholder or empty state.

### Task without notes
Notes section is not rendered. No placeholder.

---

## Deletion Edge Cases

### Contract storage cleanup on task delete
When deleting a task that has `contractPath`:
1. File is removed from `rental-contracts` storage bucket
2. Then `daily_tasks` row is deleted
3. If storage deletion fails, the DB delete still proceeds — potential orphan file in storage

### Contract-only deletion
When deleting just the contract (not the task):
1. File removed from storage
2. `daily_tasks.contract_path` set to `null`
3. If task has `booking_id`: `rental_bookings.contract_photo_path` also set to `null`
4. This keeps both task and booking in sync

### Orphan tasks after booking delete
Booking deletion from Fleet explicitly deletes linked `daily_tasks` by `booking_id` before deleting the booking. This should prevent orphans. However, if the cascade code is modified or skipped, orphan tasks with invalid `booking_id` references could remain — they would display without booking enrichment data.

---

## Timezone Handling

### Date comparison
All dates are stored as `yyyy-MM-dd` strings in the database. The query filter uses:
```typescript
const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
// WHERE due_date = selectedDateString
```

This is string equality — no timezone conversion occurs. The `selectedDate` is created from `new Date()` which uses the browser's local timezone. This means:
- Users in different timezones see tasks based on their local date
- No server-side timezone normalization
- Tasks created at midnight boundary in one timezone may appear on a different date for another user (irrelevant for single-user accounts)

### Time storage
`due_time` is stored as PostgreSQL `time without time zone`. No timezone conversion — the time value is exactly what the user selected.

---

## Status Edge Cases

### Completed tasks on current date
Completed tasks are fetched but sorted to the bottom of each section. They remain visible on the date they were assigned to — they don't move to a "completed" archive.

### Cancelled tasks
Tasks with `status = 'cancelled'` are excluded from the fetch query (filtered out in `useDailyTasks`). They remain in the database but are never displayed.

---

## Data Enrichment Edge Cases

### Booking deleted but task remains
If a task's `booking_id` references a deleted booking, the enrichment query returns no results for that booking. The task renders without booking-specific data (fuel level, payment status, customer name, additional info) — only base task data is shown.

### Additional info category deleted
If an `additional_info_categories` row is deleted but `booking_additional_info` still references it, the category name won't resolve. The additional info row would show without a label.

---

## Large Dataset Behavior

### Many tasks on one date
No hard limit on tasks per date. `DailyProgramSection` shows first 4 inline, rest accessible via "View All" paginated dialog. The fetch query has no `LIMIT` clause but is scoped to a single date + user — typical counts are < 50 per day.

### Supabase row limit
The default 1000-row Supabase limit applies to the initial fetch. For a single date, this is extremely unlikely to be hit. The vehicle dropdown fetch could theoretically hit this limit for fleets with 1000+ vehicles.
