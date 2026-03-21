# Home Section — State Management

## State Architecture Overview

```
Home.tsx (page-level state owner)
│
├── tasks: CalendarTask[]         ← fetched from DB, shared with children
├── loading: boolean              ← controls loading indicators
├── selectedDate: Date            ← shared between Monthly + Timeline calendars
├── refreshTrigger: number        ← increment to force re-fetch
├── isCreateDialogOpen: boolean   ← controls modal visibility
│
├── MonthlyCalendar (receives tasks, selectedDate)
│   └── currentMonth: Date        ← independent month navigation
│
├── TimelineCalendar (receives tasks, selectedDate)
│   ├── weekStart: Date           ← independent week navigation
│   ├── selectedTask: CalendarTask | null  ← detail dialog state
│   ├── measuredRowTops: number[] ← DOM-measured row positions
│   └── rowHeights: number[]      ← memoized from [tasks, weekDays]
│
├── RemindersWidget (fully independent)
│   ├── reminders: WeeklyReminderItem[]  ← own fetch, own data
│   └── loading: boolean
│
├── NotesWidget (fully independent)
│   ├── content: string
│   ├── noteId: string | null
│   ├── selectedDate: Date        ← own date picker, NOT shared
│   ├── isEditing: boolean
│   ├── loading / saving: boolean
│   └── saveTimeoutRef            ← debounce timer
│
└── CreateDialog (receives isOpen, onClose, onSuccess)
    ├── activeTab: 'booking' | 'task'
    ├── vehicles: Vehicle[]       ← own fetch on dialog open
    ├── isSaving: boolean
    └── task form fields (title, notes, date, time, vehicleId)
```

## State Ownership Details

### Home.tsx — Central State

| State | Type | Initial | Updated By |
|---|---|---|---|
| `tasks` | `CalendarTask[]` | `[]` | `fetchTasks()` result |
| `loading` | `boolean` | `true` | `fetchTasks()` lifecycle |
| `selectedDate` | `Date` | `new Date()` | `MonthlyCalendar.onDateSelect` or `TimelineCalendar.onDateSelect` |
| `refreshTrigger` | `number` | `0` | `handleRefresh()` — incremented after successful create |
| `isCreateDialogOpen` | `boolean` | `false` | Create button click / dialog close |

**Fetch trigger**: `useEffect(() => { fetchTasks(); }, [fetchTasks, refreshTrigger])` — re-fetches when user changes OR after any creation via CreateDialog.

### selectedDate Sharing

`selectedDate` is the **only shared state** between MonthlyCalendar and TimelineCalendar:
- Clicking a day in MonthlyCalendar → calls `onDateSelect(day)` → updates `selectedDate` in Home.tsx → TimelineCalendar highlights that day column
- Clicking a day header in TimelineCalendar → same flow → MonthlyCalendar highlights that day

**However**: `selectedDate` does NOT navigate the timeline week. The timeline has its own `weekStart` state. Selecting a date in the monthly calendar that's outside the current timeline week will highlight it only if it happens to be in view.

### TimelineCalendar — Internal State

| State | Purpose | Dependencies |
|---|---|---|
| `weekStart` | Controls which 7 days are displayed | User navigation (← → buttons) |
| `selectedTask` | Controls detail dialog visibility | Task card click |
| `measuredRowTops` | DOM-measured pixel positions per hour row | ResizeObserver + tasks changes |
| `rowHeights` | `useMemo` — calculated heights per hour | `[tasks, weekDays]` |

`weekDays` is a `useMemo` derived from `weekStart`: `Array.from({length: 7}, (_, i) => addDays(weekStart, i))`.

### NotesWidget — Fully Independent

The NotesWidget has its **own** `selectedDate` state, completely independent from the page-level `selectedDate`. Changing the date in the notes date picker does NOT affect the calendar views, and vice versa.

Save state uses a ref-based debounce pattern:
```typescript
saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
// On content change: clearTimeout → setTimeout(save, 1000)
// On blur: clearTimeout → immediate save
// On unmount: clearTimeout (cleanup)
```

### RemindersWidget — Fully Independent

Fetches its own data (`vehicle_reminders` for today) on mount. Has no connection to any other component's state. Checkbox toggle triggers a DB update followed by a full re-fetch of the reminders list.

### CreateDialog — Transient State

All form state resets on successful creation via `resetTaskForm()`:
```typescript
setTaskTitle(""); setTaskNotes(""); setTaskDate(undefined);
setTaskTime(""); setTaskVehicleId("");
```

The `activeTab` resets to `'booking'` every time the dialog opens (via `useEffect`).

## Data Refresh Pattern

Home uses a **manual refresh** pattern — no Supabase Realtime subscriptions:

```
User action (create booking/task)
    │
    ▼
onSuccess() callback
    │
    ▼
setRefreshTrigger(prev => prev + 1)
    │
    ▼
useEffect detects refreshTrigger change
    │
    ▼
fetchTasks() runs (3 sequential queries)
    │
    ▼
setTasks(mappedTasks) → children re-render
```

**Consequence**: Changes made from other tabs, other devices, or by other system processes (like booking status changes from Fleet) do NOT appear on Home until a manual page refresh or task creation.

## Memoization Strategy

| Memoized Value | Hook | Dependencies | Purpose |
|---|---|---|---|
| `weekDays` | `useMemo` | `[weekStart]` | 7-day array for timeline columns |
| `rowHeights` | `useMemo` | `[tasks, weekDays]` | 24-element array of pixel heights |
| `calendarDays` | `useMemo` | `[currentMonth]` | 35-42 day array for monthly grid |
| `fetchTasks` | `useCallback` | `[user]` | Prevents re-creation on every render |
| `fetchNote` | `useCallback` | `[user, selectedDate]` | Re-fetches when date changes |
| `fetchWeeklyReminders` | `useCallback` | `[user]` | Stable reference for useEffect |
