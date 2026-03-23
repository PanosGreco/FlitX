# Daily Program — Formulas & Logic

## Task Generation Rules

When a booking is created, two tasks are auto-generated:

### Pickup Task (delivery)
```
due_date     = booking.start_date
due_time     = booking.pickup_time
location     = booking.pickup_location
vehicle_id   = booking.vehicle_id
booking_id   = booking.id
contract_path = booking.contract_photo_path
task_type    = 'delivery'
title        = booking.customer_name
```

### Return Task (drop-off)
```
due_date     = booking.end_date
due_time     = booking.return_time
location     = booking.dropoff_location
vehicle_id   = booking.vehicle_id
booking_id   = booking.id
contract_path = booking.contract_photo_path
task_type    = 'return'
title        = booking.customer_name
```

---

## Sorting Algorithm

Tasks within each section are sorted with a two-level comparator:

```typescript
const sortedTasks = [...tasks].sort((a, b) => {
  // Level 1: Completion status (incomplete first)
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  
  // Level 2: Chronological by scheduled time (ascending)
  return a.scheduledTime.localeCompare(b.scheduledTime);
});
```

**Behavior**:
- Incomplete tasks always appear above completed tasks
- Within each group, tasks are ordered by time (earliest first)
- Tasks without a time (`scheduledTime = ""`) sort to the top (empty string < any time string in lexicographic comparison)

---

## Title Derivation

Task display title is derived differently based on type:

| Type | Title Source | Fallback |
|------|-------------|----------|
| `other` | `task.title` (user-defined, mandatory) | N/A |
| `delivery` | `task.vehicleName` (from vehicle join) | Type name capitalized |
| `return` | `task.vehicleName` (from vehicle join) | Type name capitalized |

Vehicle name format: `"{make} {model}"` (constructed from joined vehicle data).

---

## Pagination Logic

### Inline display
```
VISIBLE_TASKS_COUNT = 4
visibleTasks = sortedTasks.slice(0, 4)
hasMoreTasks = sortedTasks.length > 4
```

### Paginated modal
```
TASKS_PER_PAGE = 10
totalPages = Math.ceil(sortedTasks.length / 10)
paginatedTasks = sortedTasks.slice((currentPage - 1) * 10, currentPage * 10)
```

---

## Vehicle Requirement Rules

| Task Type | Vehicle Required | Location Field |
|-----------|-----------------|----------------|
| `delivery` | **Mandatory** | Shown |
| `return` | **Mandatory** | Shown |
| `other` | Optional (can select "None") | **Not shown** |

---

## Time Format

- **Storage**: `HH:MM` (24-hour format) in `daily_tasks.due_time`
- **Selector**: Hourly increments only: `00:00`, `01:00`, ..., `23:00`
- **Display**: Rendered as-is (24h format)
- **Empty time**: Stored as `null`/empty, rendered as blank

---

## Date Filter

```typescript
const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
// Used in query: WHERE due_date = selectedDateString
```

String equality comparison — no timezone conversion, no date range logic.

---

## Task Count Display

Each section header shows a count badge:
```
{title} {tasks.length}
```

This shows the total count for that type on the selected date, regardless of completion status.
