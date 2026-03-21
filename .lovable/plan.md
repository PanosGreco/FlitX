

# Plan: Home Section Documentation — Multi-File Structure

## Overview

Create `/documentation/home/` with 8 markdown files mirroring the Analytics documentation structure, documenting the Home section as the operational hub of FlitX.

## Files to Create

### 1. `/documentation/home/README.md` (~120 lines)
**System-level context and navigation index.**
- Home as the operational command center (route `/`, rendered by `Home.tsx`)
- Role: daily task visibility, booking schedule, quick notes, vehicle reminders
- System position diagram showing connections to:
  - **Fleet**: vehicles feed timeline tasks, reminders come from `vehicle_reminders`
  - **Reservations**: bookings auto-generate `daily_tasks` (delivery/return) displayed on timeline
  - **Analytics**: bookings created from Home trigger `financial_records` via `UnifiedBookingDialog`
  - **AI Assistant**: AI reads `rental_bookings` and `daily_tasks` for context
  - **Daily Program**: reminders widget links to `/daily-program`
- Source of truth definitions:
  - `daily_tasks` = authoritative for timeline calendar display
  - `vehicle_reminders` = authoritative for daily reminders widget
  - `user_notes` = authoritative for notebook content
  - `rental_bookings` = upstream source that generates delivery/return tasks

### 2. `/documentation/home/data-flow.md` (~200 lines)
**Step-by-step data lifecycles.**
- **Booking → Timeline flow**: `UnifiedBookingDialog` creates `rental_bookings` → booking system generates `daily_tasks` (type=delivery on start_date, type=return on end_date) → `Home.tsx` fetches `daily_tasks` with joins to `vehicles` and `rental_bookings` → maps to `CalendarTask[]` → passed to `TimelineCalendar` and `MonthlyCalendar`
- **Manual task creation flow**: CreateDialog "Other Task" tab → `daily_tasks` INSERT (task_type=other) → `refreshTrigger` increment → re-fetch → timeline updates
- **Reminder flow**: `vehicle_reminders` filtered by today's date → `RemindersWidget` displays with checkbox toggle → UPDATE `is_completed` on toggle
- **Notes flow**: `user_notes` keyed by `user_id + note_date` → debounced save (1000ms) → upsert on blur → date picker changes re-fetch
- **Data enrichment**: `Home.tsx` fetches `booking_additional_info` + `additional_info_categories` to attach extra metadata (e.g., driver license info) to booking tasks
- **Contract photos**: `ContractPreview` reads from `rental-contracts` storage bucket via `getPublicUrl()`

### 3. `/documentation/home/components.md` (~250 lines)
**Component tree and responsibilities.**
```
Home.tsx (page — state owner)
├── MonthlyCalendar.tsx (left sidebar mini calendar)
│   ├── Month grid with task indicator dots (color-coded by type)
│   └── Popover on click: shows day's tasks with details
├── RemindersWidget.tsx (left sidebar)
│   ├── Fetches today's vehicle_reminders
│   ├── Checkbox toggle for completion
│   └── "Open Daily Program" navigation button
├── NotesWidget.tsx (left sidebar)
│   ├── Date picker for selecting note date
│   ├── Debounced auto-save textarea
│   └── Upsert to user_notes table
├── TimelineCalendar.tsx (main area — weekly view)
│   ├── Week navigation (prev/next with ChevronLeft/Right)
│   ├── 7-column × 24-row hour grid
│   ├── Task cards (color-coded: green=delivery, orange=return, blue=other)
│   ├── Dynamic row height expansion for multiple tasks per hour
│   ├── CurrentTimeIndicator (red line with DOM-measured positioning)
│   └── Task detail Dialog (vehicle, customer, time, location, fuel, payment, contract preview)
└── CreateDialog.tsx (modal — tabbed)
    ├── Tab 1: "New Booking" → embeds UnifiedBookingDialog (embedded=true)
    └── Tab 2: "Other Task" → form with title, notes, date, time, vehicle
```

Per component: responsibility, props, data dependencies, user interactions.

### 4. `/documentation/home/formulas.md` (~100 lines)
**Calculations and derived logic.**
- **Task time placement**: `parseTime("HH:MM") → hours + minutes/60` → determines which hour row the task appears in; tasks without time default to 9:00 AM row
- **Dynamic row height**: `maxTasksInHour` across all 7 days for each hour → `max(72px, taskCount × 60px + 12px)`
- **Current time indicator position**: Uses `ResizeObserver` to measure actual DOM row positions → `rowTop + (currentMinutes/60) × rowHeight`
- **Auto-scroll on load**: `scrollPosition = currentHour × 72 + (minutes/60) × 72`, then centers in viewport
- **Calendar grid**: `startOfWeek(month) → endOfWeek(monthEnd)` generates full 6-week grid; `isSameMonth` determines opacity
- **Task dot rendering**: `[...new Set(dayTasks.map(t => t.type))]` → max 3 colored dots per day
- **Note save debounce**: 1000ms timeout, cleared on each keystroke, force-saved on blur

### 5. `/documentation/home/state-management.md` (~120 lines)
**Where state lives and how it propagates.**
- `Home.tsx` owns: `tasks: CalendarTask[]`, `loading`, `selectedDate`, `refreshTrigger`, `isCreateDialogOpen`
- `fetchTasks()` is a `useCallback` dependent on `user` — fetches `daily_tasks` (excluding completed/cancelled), `rental_bookings` (for customer info), `booking_additional_info` + categories
- `refreshTrigger` pattern: incremented after successful create → triggers `useEffect` re-fetch
- `selectedDate` shared between `MonthlyCalendar` and `TimelineCalendar` — clicking a date in monthly calendar highlights it in timeline
- `TimelineCalendar` internal state: `weekStart` (controls which 7 days are shown), `selectedTask` (opens detail dialog)
- `MonthlyCalendar` internal state: `currentMonth` (independent of timeline week)
- `NotesWidget` internal state: `content`, `noteId`, `selectedDate` (independent date picker), `isEditing` — debounced save via `saveTimeoutRef`
- `RemindersWidget`: independent fetch on mount, no real-time subscription — manual refresh only via checkbox toggle re-fetch
- No Supabase Realtime subscription on Home — all updates are fetch-on-mount + manual refresh

### 6. `/documentation/home/edge-cases.md` (~100 lines)
**Error handling and safeguards.**
- **No tasks**: Timeline renders empty hour grid; MonthlyCalendar shows no dots
- **Tasks without time**: Default to 9:00 AM hour row (`if time === null return hour === 9`)
- **Multiple tasks same hour**: Grid layout with `gridTemplateColumns: repeat(N, 1fr)` for 2+ tasks; compact mode (`isCompact`) for 3+ tasks reduces padding and font size
- **Note date edge case**: `PGRST116` error (no rows) silently handled — treated as empty note
- **Booking without vehicle**: `vehicleName` renders as null (no vehicle line shown)
- **Contract photo missing**: `ContractPreview` only renders when `contractPath` is truthy
- **Sold vehicles in Create dialog**: vehicle dropdown fetches ALL vehicles (no `is_sold` filter in `CreateDialog.fetchVehicles`) — but `UnifiedBookingDialog` handles filtering separately
- **Large dataset**: No pagination on `daily_tasks` query — all non-completed tasks fetched. Cap at Supabase 1000-row limit.
- **Timezone**: All dates stored as `yyyy-MM-dd` strings, compared via string matching — no timezone conversion issues but also no timezone awareness

### 7. `/documentation/home/ai-integration.md` (~80 lines)
**How Home data feeds the AI Assistant.**
- Home does NOT directly communicate with AI — no edge function calls from Home components
- Indirect connection: bookings created via Home's `CreateDialog` → `UnifiedBookingDialog` → `rental_bookings` + `financial_records` → these are read by `computeFinancialContext()` in `ai-chat` edge function
- `daily_tasks` created from Home are NOT read by AI context — AI analyzes bookings and financials, not task scheduling
- Future potential: AI could read `daily_tasks` to provide operational insights (busiest days, scheduling conflicts)
- `vehicle_reminders` and `user_notes` are also not consumed by AI

### 8. `/documentation/home/performance.md` (~80 lines)
**Scaling considerations and optimizations.**
- **Task fetching**: Single query fetches ALL non-completed/cancelled `daily_tasks` — no date filtering at DB level. For large fleets with many active tasks, this could hit 1000-row limit
- **Booking enrichment**: 3 sequential queries (tasks → bookings → additional_info + categories) — could be optimized with a single RPC or view
- **Timeline rendering**: 24 hours × 7 days = 168 cells rendered always; `rowHeights` memoized via `useMemo` dependent on `[tasks, weekDays]`
- **CurrentTimeIndicator**: Uses `ResizeObserver` — efficient but re-measures on every task change
- **MonthlyCalendar**: `calendarDays` memoized by `currentMonth`; `getTasksForDate` called per day (42 calls per render) — O(tasks × days) but fine for typical fleet sizes
- **NotesWidget**: Debounced save (1000ms) prevents rapid DB writes; force-save on blur prevents data loss
- **No real-time**: Unlike Analytics, Home has no Supabase Realtime subscription — changes from other tabs/devices require manual page refresh
- **Future optimization**: Add date-range filter to `daily_tasks` query, add Realtime subscription for live updates

## Files Modified
1-8: All new files in `/documentation/home/`

