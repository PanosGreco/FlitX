# Home Section — Formulas & Calculations

## 1. Task Time Placement

```typescript
parseTime(timeStr: string | null): number | null
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
  // "14:30" → 14.5
  // "09:00" → 9.0
```

**Hour row assignment**: `Math.floor(parsedTime) === hour`
- "14:30" → appears in hour 14 row
- "09:45" → appears in hour 9 row

**No-time default**: Tasks with `time === null` default to hour 9 (`return hour === 9`).

---

## 2. Dynamic Row Height

Each hour row must accommodate the busiest day across all 7 days in the week:

```typescript
const HOUR_HEIGHT = 72; // base pixels per hour
const minTaskHeight = 60; // minimum height per task

rowHeight(hour) = {
  maxTasksInHour = max(tasksInHour(day, hour) for each day in week)
  
  if maxTasksInHour <= 1: return HOUR_HEIGHT (72px)
  else: return max(HOUR_HEIGHT, maxTasksInHour × 60 + 12)
}

// Examples:
// 0 or 1 task  → 72px
// 2 tasks      → max(72, 2×60+12) = 132px
// 3 tasks      → max(72, 3×60+12) = 192px
```

This is computed as a `useMemo` array of 24 heights, dependent on `[tasks, weekDays]`.

---

## 3. Current Time Indicator Position

Uses DOM measurement for accuracy (accounts for dynamic row heights):

```typescript
// Primary: DOM-measured positions
if (measuredRowTops available) {
  rowTop = measuredRowTops[hourIndex]
  rowHeight = measuredRowTops[hourIndex + 1] - measuredRowTops[hourIndex]
  topPosition = rowTop + (currentMinutes / 60) × rowHeight
}

// Fallback: Array-based calculation
else {
  topPosition = sum(rowHeights[0..hourIndex-1]) + (currentMinutes / 60) × rowHeights[hourIndex]
}

// Example: 14:30 with hour 14 row starting at 1008px, height 72px
// topPosition = 1008 + (30/60) × 72 = 1008 + 36 = 1044px
```

**ResizeObserver**: Measures `offsetTop` and `offsetHeight` of every `[data-hour-row]` element. Re-measures on grid resize and task changes.

---

## 4. Auto-Scroll on Load

Centers the viewport around the current time:

```typescript
scrollPosition = currentHour × HOUR_HEIGHT + (currentMinutes / 60) × HOUR_HEIGHT
centeredPosition = scrollPosition - containerHeight / 2
scrollTop = max(0, centeredPosition)

// Example: 14:30, container 600px tall
// scrollPosition = 14 × 72 + 0.5 × 72 = 1008 + 36 = 1044
// centeredPosition = 1044 - 300 = 744
// scrollTop = 744
```

**Note**: This uses the base `HOUR_HEIGHT` constant (72px), not dynamic row heights. This is an approximation — with expanded rows, the indicator may not be perfectly centered.

---

## 5. Calendar Grid Generation

MonthlyCalendar generates a full 5-6 week grid:

```typescript
monthStart = startOfMonth(currentMonth)
monthEnd = endOfMonth(currentMonth)
calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })       // Sunday
days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
// Always produces 35 or 42 days (5 or 6 complete weeks)
```

**Out-of-month days**: Rendered with `text-slate-300` (faded). Determined by `isSameMonth(day, currentMonth)`.

---

## 6. Task Dot Rendering

Mini calendar dots per day:

```typescript
types = [...new Set(dayTasks.map(t => t.type))]
// Deduplicates — max 3 unique types: delivery, return, other
dots = types.slice(0, 3) // Guaranteed max 3
```

Each dot is 4px (`w-1 h-1`) with type-specific color. Positioned absolutely below the day number.

---

## 7. Task Grid Layout (Multiple Tasks per Hour)

```typescript
taskCount = tasksInHour.length

if taskCount === 1:
  flex column layout (single task fills width)

if taskCount === 2:
  grid with gridTemplateColumns: "repeat(2, 1fr)" — side by side

if taskCount >= 3:
  grid with gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))"
  isCompact = true → reduced padding (py-0.5), smaller text (text-[10px]), min-height 40px
```

---

## 8. Note Save Debounce

```
User types character
    → setContent(newValue)
    → clearTimeout(previous)
    → setTimeout(saveNote, 1000ms)

User types another character within 1000ms
    → clearTimeout(previous)  // cancels pending save
    → setTimeout(saveNote, 1000ms)  // resets timer

User stops typing for 1000ms
    → saveNote(content) fires

User clicks away (blur event)
    → clearTimeout(pending)
    → saveNote(content) fires immediately
```

This ensures:
- Minimum 1 save per editing session (on blur)
- At most 1 save per second during typing
- No data loss on focus change

---

## 9. Week Number

```typescript
weekNumber = getWeek(weekStart, { weekStartsOn: 1 })
// ISO week numbering, weeks start on Monday
// Displayed as "Week N" badge in timeline header
```

---

## 10. Reminder Sorting

```typescript
sortedReminders = reminders.sort((a, b) => {
  if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
  return 0; // preserve original order within same completion status
});
// Result: incomplete reminders first, completed reminders last
```
