# Home Section — Edge Cases & Error Handling

## 1. Empty States

### No tasks at all
- **TimelineCalendar**: Renders the full 24-hour × 7-day grid with empty cells. The current time indicator still appears.
- **MonthlyCalendar**: Renders month grid with no dots. All days are clickable but popovers don't appear (only rendered when `dayTasks.length > 0`).

### No reminders today
- **RemindersWidget**: Shows formal guidance text explaining that reminders are vehicle-specific and managed from the Vehicle's Reminders section.

### Empty note
- **NotesWidget**: Shows italic placeholder text: "Take quick notes for {date}". Clicking enters edit mode with an empty textarea.

---

## 2. Tasks Without Time

Tasks where `due_time` is `null` (common for manually created "other" tasks) default to the **9:00 AM hour row**:

```typescript
getTasksForHour(dayTasks, hour) {
  return dayTasks.filter(task => {
    const time = parseTime(task.time);
    if (time === null) return hour === 9; // Default placement
    return Math.floor(time) === hour;
  });
}
```

**Consequence**: If a user creates many time-less tasks, they all stack in the 9 AM row, which expands dynamically to accommodate them.

---

## 3. Multiple Tasks in Same Hour

The timeline handles task overlap with a responsive grid layout:

| Task Count | Layout | Compact Mode |
|---|---|---|
| 1 | Flex column, full width | No |
| 2 | CSS Grid, 2 columns | No |
| 3+ | CSS Grid, auto-fit minmax(60px, 1fr) | Yes — reduced padding, smaller font, 40px min-height |

The hour row itself expands: `max(72px, taskCount × 60px + 12px)`. This expansion is calculated across **all 7 days** for each hour — if Monday has 3 tasks at 9 AM but Tuesday has 1, both get the 192px row height.

---

## 4. Note Fetch — PGRST116 Error

When fetching a note for a date that has none:

```typescript
const { data, error } = await supabase.from('user_notes')
  .select('id, content').eq('user_id', user.id).eq('note_date', dateStr)
  .single(); // .single() throws PGRST116 when 0 rows

if (error && error.code !== 'PGRST116') {
  console.error('Error fetching note:', error); // Only log real errors
} else if (data) {
  setNoteId(data.id); setContent(data.content);
} else {
  setNoteId(null); setContent(""); // Treat as empty note
}
```

**PGRST116** = "JSON object requested, multiple (or no) rows returned". This is expected for new dates and silently handled.

---

## 5. Booking Without Vehicle Data

If a `daily_task` references a `vehicle_id` but the vehicle join returns null (e.g., vehicle was deleted):

```typescript
vehicleName: task.vehicles
  ? `${task.vehicles.make} ${task.vehicles.model}`
  : null
```

The task still renders — the vehicle name line simply doesn't appear. No crash or error state.

---

## 6. Contract Photo Missing

`ContractPreview` only renders when `contractPath` is truthy:

```typescript
{selectedTask.contractPath && <ContractPreview contractPath={selectedTask.contractPath} />}
```

If `publicUrl` resolves to null (e.g., file deleted from storage), the component returns `null`. The task detail dialog simply shows no contract section.

---

## 7. Sold Vehicles in Create Dialog

The `CreateDialog.fetchVehicles()` query does **NOT** filter out sold vehicles:

```typescript
await supabase.from('vehicles').select('id, make, model, license_plate').eq('user_id', user.id);
```

This means sold vehicles appear in the "Other Task" vehicle dropdown. However, the `UnifiedBookingDialog` (New Booking tab) handles its own vehicle filtering and typically excludes sold vehicles.

**Note**: This is a known inconsistency — creating an "other" task linked to a sold vehicle is technically possible.

---

## 8. Large Dataset Handling

### daily_tasks query
- No date range filter — fetches ALL non-completed/cancelled tasks for the user
- Supabase default limit: 1000 rows
- For large fleets with many active bookings, this could silently truncate results
- No pagination implemented

### rental_bookings enrichment
- Fetches ALL bookings for the user (no limit specified, defaults to 1000)
- Creates a full Map in memory — only a subset is actually used (tasks with booking_id)

### booking_additional_info
- Uses `.in('booking_id', allBookingIds)` — if bookingIds > 1000, the IN clause could be large
- No chunking implemented

---

## 9. Timezone Handling

All dates in the Home section use **string-based comparison**, not timezone-aware Date objects:

```typescript
// Task filtering
const dateStr = format(date, 'yyyy-MM-dd');
return tasks.filter(task => task.date === dateStr);

// Reminder filtering
const today = format(new Date(), 'yyyy-MM-dd');
.eq('due_date', today)
```

**Implication**: The "today" boundary is determined by the user's **browser timezone**. A user in UTC+12 will see a different "today" than a user in UTC-12. Since all dates are stored as plain dates (no timezone), there's no mismatch with the database — but there's also no way to handle users traveling across timezones.

---

## 10. Time Truncation

`due_time` is stored as `time without time zone` (e.g., `"14:30:00"`). The mapping truncates to HH:MM:

```typescript
time: task.due_time ? task.due_time.substring(0, 5) : null
// "14:30:00" → "14:30"
```

This is safe because the database stores only hour/minute precision for these tasks.

---

## 11. Concurrent Widget Saves

NotesWidget and RemindersWidget operate independently. There's no conflict because:
- Notes use `user_notes` table
- Reminders use `vehicle_reminders` table
- No shared state between widgets
- Each widget handles its own loading/saving states

However, if two browser tabs are open on Home, both editing the same day's note, the last save wins (no conflict resolution or optimistic locking).
