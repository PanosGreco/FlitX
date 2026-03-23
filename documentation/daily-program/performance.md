# Daily Program — Performance

## Query Efficiency

### Primary query
```sql
SELECT daily_tasks.*, vehicles.make, vehicles.model, vehicles.type, vehicles.license_plate
FROM daily_tasks
LEFT JOIN vehicles ON daily_tasks.vehicle_id = vehicles.id
WHERE daily_tasks.due_date = $selectedDate
AND daily_tasks.user_id = $userId
AND daily_tasks.status NOT IN ('completed', 'cancelled')
ORDER BY daily_tasks.due_time ASC
```

This is efficient: single-date filter + user_id filter. Typical result set: < 50 rows per day.

### Enrichment queries (sequential)
After the primary query, 3 additional queries run **sequentially**:

1. `rental_bookings` — fetch by `id IN (booking_ids...)` — O(bookings on that day)
2. `booking_additional_info` — fetch by `booking_id IN (...)` — O(info rows)
3. `additional_info_categories` — fetch by `id IN (category_ids...)` — O(categories)

**Optimization opportunity**: Queries 2 and 3 could be parallelized with `Promise.all()`, and potentially merged into a single query with a join.

### Vehicle dropdown query
```sql
SELECT * FROM vehicles WHERE user_id = $userId AND is_sold = false
```

Fetched on mount for `AddTaskDialog`. No search/filter capability — all vehicles loaded at once. For fleets with 100+ vehicles, this could be slow but is cached for the session.

---

## Rendering Performance

### Component count per render
```
3 DailyProgramSection components
  × max 4 TaskItem components each (inline)
  = max 12 TaskItem components
```

This is lightweight. The "View All" dialog adds up to 10 more TaskItem components (paginated).

### Sorting
Each `DailyProgramSection` sorts its tasks on every render:
```typescript
const sortedTasks = [...tasks].sort(...)
```

This is O(n log n) per column but with n typically < 20, it's negligible.

### No memoization
`sortedTasks` in `DailyProgramSection` is recalculated on every render (no `useMemo`). Given the small dataset size, this is acceptable but could be optimized for large task lists.

---

## Real-Time Updates

### Current: No Realtime
Daily Program has **no Supabase Realtime subscription**. Changes made from other sections (Fleet booking creation, Home task creation) do not appear until:
- User changes the selected date and changes back
- User navigates away and returns to Daily Program

### Impact
In a multi-device or multi-tab scenario, task changes are not reflected in real-time. This is acceptable for single-operator use but would need Realtime for team environments.

---

## Scalability Considerations

| Factor | Current Approach | Concern Level |
|--------|-----------------|---------------|
| Tasks per day | Single-date query, < 50 typical | ✅ Low |
| Enrichment queries | 4 sequential | ⚠️ Medium — could parallelize |
| Vehicle dropdown | Full fetch, no search | ⚠️ Medium for large fleets |
| Sorting | Per-render, no memo | ✅ Low (small n) |
| Rendering | Max 12 inline components | ✅ Low |
| Real-time | None | ⚠️ Medium for multi-user |

---

## Future Optimizations

1. **Parallelize enrichment queries**: Use `Promise.all()` for booking + additional_info fetches
2. **Add Realtime subscription**: Subscribe to `daily_tasks` changes for the selected date
3. **Vehicle search**: Add text search to vehicle dropdown for large fleets
4. **Memoize sorting**: Wrap `sortedTasks` in `useMemo` dependent on `[tasks]`
5. **Batch date prefetch**: Pre-load adjacent dates for faster date navigation
6. **Server-side join**: Create a database view or RPC that returns fully enriched tasks in one query
