# Daily Program — State Management

## State Ownership Map

### DailyProgram.tsx (Page Level)

| State | Type | Purpose |
|-------|------|---------|
| `selectedDate` | `Date` | Controls which day's tasks are displayed |
| `isAddDialogOpen` | `boolean` | Controls AddTaskDialog visibility |

`selectedDate` is the primary driver — changing it triggers a complete refetch of tasks for the new date.

### useDailyTasks(selectedDate) Hook

| State | Type | Purpose |
|-------|------|---------|
| `tasks` | `DailyTask[]` | All tasks for the selected date (enriched with booking + vehicle data) |
| `loading` | `boolean` | Fetch loading state |
| `vehicles` | `Vehicle[]` | All non-sold vehicles (for AddTaskDialog dropdown) |

**Derived value**: `selectedDateString = format(selectedDate, 'yyyy-MM-dd')` — used as the query filter.

**Fetch trigger**: `useEffect` dependent on `[user, selectedDateString]` — fires on mount, on date change, and when `fetchTasks` is called manually after mutations.

### DailyProgramSection.tsx (Column Level)

| State | Type | Purpose |
|-------|------|---------|
| `isViewAllOpen` | `boolean` | Controls paginated dialog |
| `currentPage` | `number` | Current page in paginated view |

Pure UI state — no data fetching. Resets `currentPage` to 1 when "View All" is opened.

### TaskItem.tsx (Task Level)

| State | Type | Purpose |
|-------|------|---------|
| `isEditDialogOpen` | `boolean` | Controls EditTaskDialog |
| `isUpdating` | `boolean` | Loading state during complete/reopen toggle |
| `isContractOpen` | `boolean` | Controls FilePreviewModal |
| `contractUrl` | `string \| null` | Signed URL for contract viewer |

Per-task isolated state — no cross-task communication.

---

## Refresh Patterns

### After Mutation (Add/Update/Delete)

All CRUD operations follow the same pattern:
```
mutation (INSERT/UPDATE/DELETE)
  → success
  → fetchTasks() called
  → re-fetches all tasks for selectedDate
  → UI re-renders with new data
```

There is **no Supabase Realtime subscription** on `daily_tasks`. All updates are manual refetch after explicit user actions.

### After Date Change

```
selectedDate changes (via calendar picker)
  → selectedDateString recalculated
  → useEffect fires
  → fetchTasks() with new date
  → tasks state updated
  → 3 columns re-render with new data
```

---

## Cross-Section Data Flow

### Tasks Created from Other Sections

When a booking is created from Fleet (`CalendarView`) or Home (`CreateDialog`):
1. `UnifiedBookingDialog` inserts into `rental_bookings` + `daily_tasks`
2. Daily Program has **no awareness** of this insertion
3. Tasks only appear when user navigates to the matching date in Daily Program
4. No push notification or real-time update

### Data Independence

Each section fetches `daily_tasks` independently:
- **Home**: fetches ALL non-completed tasks (no date filter) for timeline display
- **Daily Program**: fetches tasks filtered by `selectedDate` only
- Neither section shares state with the other

---

## Data Shape (DailyTask Interface)

The `useDailyTasks` hook transforms raw DB data into enriched `DailyTask` objects:

```typescript
interface DailyTask {
  id: string;
  type: 'delivery' | 'return' | 'other';
  title: string;
  scheduledTime: string;        // HH:MM or empty
  location: string;
  notes: string;
  completed: boolean;           // derived from status === 'completed'
  vehicleName: string | null;   // "{make} {model}" from join
  vehicleId: string | null;
  vehiclePlate: string | null;
  bookingId: string | null;
  contractPath: string | null;
  customerName: string | null;  // from rental_bookings enrichment
  fuelLevel: string | null;     // from rental_bookings enrichment
  paymentStatus: string | null; // from rental_bookings enrichment
  balanceDueAmount: number | null;
  additionalInfo: Array<{ categoryName: string; subcategoryValue: string }>;
}
```

---

## Vehicle State

Vehicles are fetched once by `useDailyTasks` on mount:
```
SELECT * FROM vehicles WHERE user_id = auth.uid() AND is_sold = false
```

This list is passed to `AddTaskDialog` for the vehicle selector. It is NOT refetched when tasks change — only on page mount or date change.
