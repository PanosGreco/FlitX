# Home Section — Performance Considerations

## Data Fetching

### Task loading (Home.tsx)

**3 sequential queries** on every fetch:

1. `daily_tasks` with vehicle join — all non-completed/cancelled tasks (no date filter)
2. `rental_bookings` — all bookings for the user
3. `booking_additional_info` + `additional_info_categories` — metadata for all bookings

**Bottleneck**: These queries are sequential, not parallel. Total latency = sum of all 3 query round-trips. For a fleet with 200 active bookings:
- Query 1: ~50-100ms
- Query 2: ~50-100ms  
- Query 3: ~50-100ms (two sub-queries)
- Total: ~150-300ms

**Optimization opportunity**: Queries 2 and 3 could run in parallel via `Promise.all()`. A server-side view or RPC could combine all 3 into a single round-trip.

### No date-range filtering

The `daily_tasks` query fetches **all** non-completed tasks regardless of date. For a fleet that has been operating for months with many future bookings, this grows unbounded until tasks are completed or cancelled.

**Risk**: Supabase 1000-row default limit could silently truncate results. No indication to the user that some tasks are missing.

**Recommendation**: Add `.gte('due_date', startOfRange).lte('due_date', endOfRange)` to scope the query to the relevant period (e.g., current month ± 1 week).

---

## Rendering Performance

### Timeline grid

- **Always renders**: 24 hours × 7 days = 168 cells, regardless of task count
- **Task cards**: Only rendered in cells that have tasks — no wasted DOM nodes for empty cells
- **Row heights**: Memoized via `useMemo([tasks, weekDays])` — recalculated only when tasks or week changes

### Monthly calendar

- **calendarDays**: Memoized by `[currentMonth]` — 35-42 elements
- **getTasksForDate**: Called once per day (42 calls per render) — each call filters the full `tasks` array
- **Complexity**: O(calendarDays × tasks) per render — typically O(42 × N) where N is total task count
- **Acceptable for**: N < 500 tasks. Beyond that, a pre-computed Map<dateString, tasks[]> would be more efficient.

### CurrentTimeIndicator

- Uses `ResizeObserver` — fires on grid container resize
- Re-measures all 24 hour row DOM positions via `querySelectorAll('[data-hour-row]')`
- **Re-measurement triggers**: Every time `tasks` change (via useEffect dependency)
- **Cost**: ~24 DOM reads (offsetTop + offsetHeight) — negligible

---

## Widget Performance

### NotesWidget
- **Debounced save**: 1000ms — prevents rapid-fire DB writes during typing
- **Force save on blur**: Ensures no data loss when user clicks away
- **Single query per date**: Fetches one note per date change

### RemindersWidget
- **Single query on mount**: Fetches today's `vehicle_reminders` with vehicle join
- **No polling or real-time**: Static until checkbox toggle triggers re-fetch
- **Max display**: 5 items visible, rest hidden behind "+N more" count
- **Scroll container**: `max-h-[200px] overflow-y-auto` prevents widget from growing unbounded

---

## No Real-Time Subscriptions

Unlike the Analytics section (which has a Supabase Realtime channel on `financial_records`), **Home has no real-time subscriptions**. All data updates require:
- Manual page refresh
- Task creation (triggers `refreshTrigger`)
- Reminder toggle (triggers widget re-fetch)

**Consequence**: If a booking is created from the Fleet section while Home is open, the Home timeline does not update until the user refreshes the page.

**Recommendation**: Add a Supabase Realtime channel on `daily_tasks` table to listen for `INSERT/UPDATE/DELETE` events and automatically refresh.

---

## Memory Usage

- `tasks[]`: All non-completed tasks held in memory — typically 50-200 objects for an active fleet
- `bookingsMap`: Map of all bookings — could be large for established businesses
- `additionalInfoMap`: Nested objects per booking — proportional to booking count
- `calendarDays`: 42 Date objects (negligible)
- `rowHeights`: 24 numbers (negligible)
- `measuredRowTops`: 24 numbers (negligible)

**Total estimate**: ~100KB for a fleet with 200 active bookings — well within acceptable limits.

---

## Layout Stability

The page uses `h-[calc(100vh-64px)] overflow-hidden` to prevent page-level scrolling. Only the TimelineCalendar's scroll container (`overflow-y-auto`) scrolls. This prevents layout shift when tasks load or the dialog opens.

The left sidebar is fixed at `w-[280px]` and does not scroll — if widgets collectively exceed the available height, the bottom widgets could be clipped. Currently this is managed by keeping widget heights constrained (RemindersWidget has `max-h-[200px]`, NotesWidget has `min-h-[100px]`).
