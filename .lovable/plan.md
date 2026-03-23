

# Plan: Daily Program Section Documentation — Multi-File Structure

## Overview

Create `/documentation/daily-program/` with 8 markdown files documenting the Daily Program as the operational execution layer that bridges bookings to real-world actions.

## Files to Create

### 1. `/documentation/daily-program/README.md` (~130 lines)
**System-level context.**
- Daily Program as the execution layer (route `/daily-program`, rendered by `DailyProgram.tsx`)
- System role clarification: Reservations = planning layer, Fleet = asset layer, Daily Program = execution layer
- Three-column layout: Drop-Offs (returns), Pick-Ups (deliveries), Other Tasks
- Source of truth: `daily_tasks` table (linked via `booking_id`, `vehicle_id`)
- Task types: `delivery` (pickup), `return` (drop-off), `other` (manual)
- Connections: Fleet (vehicles in tasks), Reservations (auto-generate delivery/return tasks), Home (timeline displays same tasks), Analytics (indirect — completed bookings generate financial records), AI (not currently consumed)
- Task ownership model: tasks linked to `booking_id` + `vehicle_id`, derived from `rental_bookings`

### 2. `/documentation/daily-program/data-flow.md` (~200 lines)
**Step-by-step lifecycles.**
- **Booking → Task generation**: `UnifiedBookingDialog` → `rental_bookings` INSERT → `daily_tasks` INSERT ×2 (delivery on start_date with pickup_time/pickup_location, return on end_date with return_time/dropoff_location) → contract_path copied to both tasks
- **Manual task creation**: AddTaskDialog → `daily_tasks` INSERT (task_type=other, title required) → `fetchTasks()` refetch
- **Task update flow**: EditTaskDialog → `daily_tasks` UPDATE (time, notes, location, completion status) → refetch
- **Task delete flow**: check for `contractPath` → delete from `rental-contracts` storage → `daily_tasks` DELETE → refetch
- **Contract delete flow**: TaskItem → remove from storage → UPDATE `daily_tasks.contract_path = null` → UPDATE `rental_bookings.contract_photo_path = null` (if booking linked)
- **Booking delete cascade** (from Fleet): deletes all linked `daily_tasks` as part of cascade
- **Data enrichment on fetch**: `useDailyTasks` runs 4 sequential queries: daily_tasks (with vehicle join) → rental_bookings (fuel_level, payment_status, balance_due) → booking_additional_info → additional_info_categories
- **Dependency mapping**: bookings → generate tasks, vehicles → referenced in tasks, reminders → NOT injected into Daily Program (separate system via `vehicle_reminders`, shown only in Home's RemindersWidget)

### 3. `/documentation/daily-program/components.md` (~200 lines)
**Component tree.**
```text
DailyProgram.tsx (page — state owner via useDailyTasks hook)
├── Date selector (Calendar popover, controls selectedDate)
├── "Add New Task" button → opens AddTaskDialog
├── 3-column grid (md:grid-cols-3, items-start):
│   ├── DailyProgramSection "Drop-Offs" (tasks.type === 'return')
│   ├── DailyProgramSection "Pick-Ups" (tasks.type === 'delivery')
│   └── DailyProgramSection "Other Tasks" (tasks.type === 'other')
└── AddTaskDialog (modal)

DailyProgramSection.tsx (column container)
├── Card with title + task count badge
├── Shows first 4 tasks (VISIBLE_TASKS_COUNT = 4)
├── "View All" button → Dialog with paginated list (10/page)
├── Sorting: incomplete first, then by scheduledTime ascending
└── TaskItem × N

TaskItem.tsx (individual task card)
├── Type badge (blue=return, green=delivery, gray=other)
├── Title: other→user title, delivery/return→vehicleName
├── Time, location, notes display
├── Fuel level + payment status (delivery/return only, from booking data)
├── Additional info rows (from booking_additional_info)
├── Contract viewer (FilePreviewModal) + delete contract
├── Complete/Reopen toggle button
├── Edit button → EditTaskDialog
└── Delete button

EditTaskDialog.tsx (edit modal — limited fields)
├── Read-only: type, vehicle (shown in muted box)
├── Editable: title (other only), time (native input), location, notes, completed toggle
└── Cannot change type or vehicle after creation

AddTaskDialog.tsx (create modal)
├── Date picker (syncs with page selectedDate)
├── Type selector (return/delivery/other)
├── Title field (other tasks only, required)
├── Vehicle selector (required for delivery/return, optional for other; sold vehicles excluded)
├── Time selector (24h, hourly increments 00:00-23:00)
├── Location field (delivery/return only)
└── Notes textarea
```

### 4. `/documentation/daily-program/formulas.md` (~80 lines)
**Logic and rules.**
- **Task generation from booking**: pickup task → `due_date = booking.start_date`, `due_time = booking.pickup_time`, `location = booking.pickup_location`; return task → `due_date = booking.end_date`, `due_time = booking.return_time`, `location = booking.dropoff_location`
- **Sorting**: `completed ? 1 : -1` (incomplete first), then `scheduledTime.localeCompare()` (chronological)
- **Title derivation**: `task.title || task.vehicleName || type.charAt(0).toUpperCase() + type.slice(1)`
- **Pagination**: `VISIBLE_TASKS_COUNT = 4` inline, `TASKS_PER_PAGE = 10` in modal; `totalPages = ceil(tasks.length / 10)`
- **Vehicle requirement**: delivery/return → vehicle mandatory; other → vehicle optional (can select "none")
- **Time format**: stored as `HH:MM` (24h), displayed via `formatTime24h()`, selector offers hourly increments only

### 5. `/documentation/daily-program/state-management.md` (~100 lines)
**State ownership and propagation.**
- `DailyProgram.tsx` owns: `selectedDate` (Date), `isAddDialogOpen`
- `useDailyTasks(selectedDate)` hook owns: `tasks`, `loading`, `vehicles` — refetches when `selectedDateString` changes
- `selectedDateString = format(selectedDate, 'yyyy-MM-dd')` used as query filter
- `fetchTasks()` is a `useCallback` dependent on `[user, selectedDateString]` — called on mount + after every add/update/delete
- No Supabase Realtime subscription — all updates are manual refetch after mutation
- `DailyProgramSection` owns: `isViewAllOpen`, `currentPage` — local UI state only
- `TaskItem` owns: `isEditDialogOpen`, `isUpdating`, `isContractOpen`, `contractUrl` — per-task local state
- Cross-section: tasks created from booking (Fleet/Home) appear automatically when user navigates to matching date in Daily Program (fetched on date selection)

### 6. `/documentation/daily-program/edge-cases.md` (~100 lines)
**Error handling and safeguards.**
- **Empty day**: each section shows "No scheduled [type]" message
- **Booking without tasks**: possible if booking creation fails after `rental_bookings` INSERT but before `daily_tasks` INSERT — no automatic repair mechanism
- **Orphan tasks after booking delete**: booking delete cascade explicitly deletes linked `daily_tasks` (by `booking_id`) — should not leave orphans
- **Same-day pickup & return**: generates 2 tasks on same date — one in Pick-Ups column, one in Drop-Offs column
- **Duplicate task creation**: no deduplication check — if booking creation runs twice, duplicate tasks possible
- **Task without vehicle**: allowed for `other` type; renders title instead of vehicle name
- **Task without time**: `scheduledTime` stored as empty string; renders empty in time display; sorts to top (empty string < any time string)
- **Contract storage cleanup**: on task delete, checks `contractPath` and removes from storage before DB delete; on contract-only delete, also nullifies `rental_bookings.contract_photo_path`
- **Timezone**: dates stored as `yyyy-MM-dd` strings, filtered via string equality — no timezone conversion
- **No vehicles**: AddTaskDialog shows "No vehicles found" hint; delivery/return tasks cannot be created

### 7. `/documentation/daily-program/ai-integration.md` (~60 lines)
**AI relationship.**
- Daily Program data (`daily_tasks`) is NOT currently consumed by the AI Assistant
- `computeFinancialContext()` reads `rental_bookings` and `vehicle_maintenance` — not `daily_tasks`
- Indirect connection: bookings that generate tasks also generate `financial_records`, which ARE consumed by AI
- Future potential: AI could analyze `daily_tasks` for workload patterns, busiest days, task completion rates, operational bottlenecks
- `daily_tasks.status` (pending/completed) could feed operational efficiency metrics

### 8. `/documentation/daily-program/performance.md` (~70 lines)
**Scaling considerations.**
- **Query per date**: `daily_tasks` filtered by `due_date = selectedDateString` — efficient single-date query with user_id filter
- **Enrichment queries**: 4 sequential queries (tasks → bookings → additional_info → categories) — could be parallelized for bookings + additional_info
- **Rendering**: 3 columns × max 4 visible tasks = 12 TaskItem components; overflow handled via paginated dialog (10/page)
- **No real-time**: manual refetch only — changes from Fleet/Home booking creation won't appear until date navigation or page refresh
- **Sorting**: O(n log n) per column on every render — fine for typical daily task counts (< 50)
- **Vehicle dropdown**: fetches all non-sold vehicles on mount — no search/filter for large fleets
- **Future optimizations**: add Realtime subscription on `daily_tasks` for live updates, batch enrichment queries, add vehicle search in dropdown

## Files Modified
1-8: All new files in `/documentation/daily-program/`

