# Home Section — Components

## Component Tree

```
Home.tsx (page — state owner)
│
├── AppLayout (layout wrapper — sidebar + header)
│
├── Left Sidebar (w-[280px], fixed, no scroll)
│   ├── MonthlyCalendar.tsx
│   ├── RemindersWidget.tsx
│   └── NotesWidget.tsx
│
├── Main Area (flex-1, full height)
│   └── TimelineCalendar.tsx
│       └── CurrentTimeIndicator (internal component)
│
└── CreateDialog.tsx (modal overlay)
    ├── Tab: "New Booking" → UnifiedBookingDialog (embedded=true)
    └── Tab: "Other Task" → inline form
```

---

## Home.tsx (Page)

**Role**: State owner and data fetcher for the entire Home section.

**Owns**:
- `tasks: CalendarTask[]` — all active tasks
- `loading: boolean` — fetch loading state
- `selectedDate: Date` — shared between MonthlyCalendar and TimelineCalendar
- `refreshTrigger: number` — increment to force re-fetch
- `isCreateDialogOpen: boolean` — controls CreateDialog visibility

**Data fetching**: `fetchTasks()` callback — 3 sequential queries (see [data-flow.md](./data-flow.md)).

**Layout**: Fixed height `h-[calc(100vh-64px)]` with `overflow-hidden`. Only the TimelineCalendar scrolls internally.

**Props passed**:
- `MonthlyCalendar`: `tasks`, `selectedDate`, `onDateSelect`, `loading`
- `TimelineCalendar`: `tasks`, `selectedDate`, `onDateSelect`, `loading`, `onCreateClick`
- `CreateDialog`: `isOpen`, `onClose`, `onSuccess` (triggers `refreshTrigger++`)

---

## MonthlyCalendar.tsx

**Role**: Mini sidebar calendar showing a month grid with task indicator dots.

**Props**: `tasks: CalendarTask[]`, `selectedDate: Date`, `onDateSelect: (date) => void`, `loading: boolean`

**Internal state**:
- `currentMonth: Date` — independent month navigation (not tied to timeline week)

**Rendering logic**:
1. Generates calendar grid: `startOfWeek(startOfMonth(currentMonth))` to `endOfWeek(endOfMonth(currentMonth))` — always 5-6 weeks of days
2. For each day, filters tasks by `format(date, 'yyyy-MM-dd')` string match
3. Days with tasks show colored dots: `[...new Set(dayTasks.map(t => t.type))]` → max 3 dots (one per unique type)
4. Days with tasks are wrapped in a `Popover` — clicking shows task details

**Dot colors**:
- `delivery` → `bg-emerald-400`
- `return` → `bg-orange-400`
- `other` → `bg-blue-400`

**Day styling**:
- Today: `bg-teal-50 text-teal-600 rounded-full font-medium`
- Selected: `bg-slate-200/60 rounded-full font-medium`
- Both: `bg-teal-100 text-teal-600 rounded-full font-medium`
- Out-of-month: `text-slate-300`

**Popover content**: Shows each task with type label, vehicle name, notes (line-clamp-2), time, location, fuel level, payment status, and additional info categories.

---

## RemindersWidget.tsx

**Role**: Shows today's vehicle-specific reminders with completion toggle.

**Data source**: `vehicle_reminders` WHERE `due_date = today` AND `user_id = user`, joined with `vehicles (make, model)`.

**Internal state**:
- `reminders: WeeklyReminderItem[]`
- `loading: boolean`

**Behavior**:
1. Fetches on mount via `useCallback` + `useEffect`
2. Maps to `WeeklyReminderItem`: `{ id, vehicleName, title, notes, time, is_completed }`
3. Sorts: incomplete first, completed last
4. Displays max 5 items; shows "+N more" count for overflow
5. Checkbox toggle: `vehicle_reminders UPDATE is_completed` → full re-fetch

**Empty state**: Shows guidance text: "Daily vehicle-related reminders will appear here." + "You can manage and add reminders individually for each vehicle through the Vehicle's Reminders section."

**Navigation**: "Open Daily Program" button → `navigate('/daily-program')`

**Display format**: `"Vehicle Name – Reminder Title"` with optional notes and time.

---

## NotesWidget.tsx

**Role**: Quick daily notebook with auto-save.

**Data source**: `user_notes` WHERE `user_id = user AND note_date = selectedDate`. One note per day.

**Internal state**:
- `content: string` — current text
- `loading: boolean` / `saving: boolean`
- `noteId: string | null` — DB record ID (null = new note)
- `isEditing: boolean` — controls textarea visibility vs placeholder
- `selectedDate: Date` — **independent** from Home's selectedDate (own date picker)

**Save logic**:
1. **Debounced**: 1000ms timeout on each keystroke. Clears previous timeout.
2. **Force save on blur**: Clears any pending timeout and saves immediately.
3. **Upsert pattern**: If `noteId` exists → UPDATE; if null AND content non-empty → INSERT (returns new `noteId`).
4. **Cleanup**: `useEffect` cleanup clears timeout on unmount.

**UI states**:
- Placeholder: Italic text "Take quick notes for {date}" — click to enter edit mode
- Editing: Borderless textarea with auto-focus
- Saving indicator: Small spinner next to date picker

---

## TimelineCalendar.tsx

**Role**: Main weekly view — 7-day × 24-hour grid with task cards.

**Props**: `tasks`, `selectedDate`, `onDateSelect`, `loading`, `onCreateClick`

**Internal state**:
- `weekStart: Date` — Monday of the displayed week (navigable)
- `selectedTask: CalendarTask | null` — opens detail dialog when set

**Structure**:
```
┌─────────────────────────────────────────────┐
│  ← →  "March 17 - 23, 2025"  Week 12  [+]  │  (header)
├─────┬──────┬──────┬──────┬──────┬──────┬────┤
│     │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat│  (sticky day headers)
│     │  17  │  18  │  19  │  20  │  21  │  22│
├─────┼──────┼──────┼──────┼──────┼──────┼────┤
│00:00│      │      │      │      │      │    │
│01:00│      │      │      │      │      │    │
│ ... │      │      │      │      │      │    │
│09:00│ [task]│     │[task]│      │      │    │  (task cards)
│ ... │      │      │      │      │      │    │
│23:00│      │      │      │      │      │    │
├─────┴──────┴──────┴──────┴──────┴──────┴────┤
│  ──────── current time indicator ──────────  │
└─────────────────────────────────────────────┘
```

**Grid layout**: `grid-cols-[60px_repeat(7,1fr)]` — 60px time column + 7 equal day columns.

**Task placement**:
- `parseTime("HH:MM")` → `hours + minutes/60` → determines hour row
- Tasks without time default to the 9:00 AM row
- Multiple tasks in same hour: CSS grid with `gridTemplateColumns: repeat(N, 1fr)` for 2+ tasks
- Compact mode (`isCompact`) for 3+ tasks: reduced padding, smaller font, 40px min-height

**Task card colors** (TASK_COLORS):
- `delivery`: emerald bg, emerald-500 left border
- `return`: orange bg, orange-400 left border
- `other`: blue bg, blue-500 left border

**Dynamic row height**: Each hour row expands to fit its busiest day. `max(72px, taskCount × 60px + 12px)`.

**Day header styling**: Today gets `bg-teal-50` highlight. Selected date also gets `bg-teal-50`.

**Auto-scroll**: On load, scrolls to center current time in viewport.

### Task Detail Dialog

Clicking a task card opens a `Dialog` with:
- Type badge (Pick-Up / Drop-Off / Other Task)
- Title (for 'other' tasks)
- Vehicle name
- Customer name (for booking tasks)
- Time (24h format via `formatTime24h`)
- Location
- Notes
- Fuel level (delivery/return only)
- Payment status with balance due amount (delivery/return only)
- Additional info categories (delivery/return only)
- Contract photo thumbnail (right side, 120px wide, delivery/return only)

---

## CurrentTimeIndicator (internal)

**Role**: Red line showing current time position on the timeline grid.

**Implementation**:
- Uses `ResizeObserver` on the grid container to measure actual DOM positions of hour rows
- Calculates position: `rowTop + (currentMinutes / 60) × rowHeight`
- Fallback: If DOM measurements unavailable, sums `rowHeights[]` array
- Visual: Blue dot (w-2 h-2) + horizontal line, `z-50`, `pointer-events-none`

**Remeasurement triggers**: ResizeObserver fires on any grid resize; also re-measured when `tasks` change (via `useEffect` dependency).

---

## CreateDialog.tsx

**Role**: Modal for creating new bookings or tasks from the Home page.

**Tabs**:
1. **"New Booking"** (`Car` icon): Renders `UnifiedBookingDialog` with `embedded={true}` — the booking form renders inline within the tab, no nested dialog.
2. **"Other Task"** (`ClipboardList` icon): Inline form with title*, notes, date*, time (select from 24 hourly options), vehicle (optional dropdown).

**Vehicle dropdown**: Fetches `vehicles` WHERE `user_id = user` on dialog open. Shows `make model (license_plate)`.

**On success**: Calls `onSuccess()` → `refreshTrigger++` in Home.tsx → re-fetch all tasks.

**Default tab**: Always opens on "New Booking" tab (`useEffect` resets `activeTab` to 'booking' on open).
