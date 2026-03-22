# Fleet — Performance Considerations

## Overview

This document analyzes the performance characteristics of the Fleet section and identifies scaling bottlenecks and optimization opportunities.

---

## Fleet List View

### Vehicle Fetching
- **Query**: Single `SELECT * FROM vehicles WHERE user_id = $1` — no pagination
- **Limit**: Supabase default 1000-row limit (sufficient for typical fleet sizes)
- **Realtime**: Subscription on `vehicles` table provides live updates without polling
- **Filtering**: All done client-side via `useMemo` on the already-fetched array — instantaneous for < 100 vehicles

### Batch Status Computation (`useFleetStatuses`)
```
3 parallel queries:
  1. All active/confirmed rental_bookings for all vehicle IDs
  2. All maintenance_blocks for all vehicle IDs
  3. All vehicles (for base status)

Computation: O(vehicles × (bookings + blocks))
```
- For 50 vehicles with 200 total bookings and 30 blocks: ~11,500 comparisons (negligible)
- For 500 vehicles with 5,000 bookings: ~2.75M comparisons (may need optimization)
- **Bottleneck**: Network time for 3 parallel queries, not computation

### VehicleGrid Rendering
- `filteredAndSortedVehicles` memoized with `useMemo([vehicles, searchQuery, filters])`
- Re-renders only when search/filter/vehicles change
- Each `VehicleCard` is a simple component — no heavy computation per card

---

## Vehicle Detail Page

### Initial Load
- Single vehicle fetch by ID — fast (indexed primary key lookup)
- Realtime subscription filtered by vehicle ID — minimal overhead

### Tab-Based Lazy Loading
- Each sub-tab fetches its data independently when rendered
- Switching tabs triggers new fetch — no pre-loading of inactive tabs
- **Pro**: Only loads data the user actually views
- **Con**: Visible loading state on each tab switch

### Tab-Specific Performance

#### CalendarView
- Fetches ALL bookings + maintenance_blocks for vehicle (no date range filter)
- Builds `bookedDates: Set<string>` and `dateInfoMap: Map<string, BookingInfo>` on fetch
- Calendar rendering: O(days_in_month) with O(1) lookups per date
- **Optimization opportunity**: Add date range filter to queries (e.g., ±6 months from current view)

#### RentalBookingsList
- Fetches all bookings for vehicle — no server-side pagination
- Client-side search filtering via `useMemo`
- Additional data: `booking_contacts` + `booking_additional_info` fetched separately
- **Optimization opportunity**: Server-side pagination for vehicles with 100+ bookings

#### VehicleMaintenance
- Shows last 4 records in compact view (client-side slice)
- "View All" loads full list — still single fetch, no pagination
- Lightweight component — unlikely to be a bottleneck

#### VehicleFinanceTab
- Fetches ALL `financial_records` for vehicle
- Client-side pagination (10 per page) — only renders 10 rows at a time
- Realtime subscription provides live updates
- Summary calculations memoized

#### VehicleDocuments
- Fetches all documents for vehicle — typically small dataset
- Signed URLs generated on-demand (1-hour TTL) — no pre-fetching
- Download: blob fetch + programmatic anchor — no streaming for large files

#### DamageReport
- Fetches all damage reports for vehicle
- Images loaded as standard `<img>` tags from storage URLs — browser handles caching
- No image lazy loading implemented

---

## Image Handling

### Vehicle Images (Current: Base64 in DB)
- Stored as base64 data URLs in `vehicles.image` column
- **Impact**: Significantly increases row size (~100KB-500KB per image)
- **Consequence**: `SELECT *` on vehicles table transfers all image data
- **Every filter/search re-render** uses memoized data, but initial fetch is heavy

### Storage Bucket Images (Damage, Documents, Contracts)
- Properly stored in storage buckets
- Loaded via URLs — browser caching applies
- Signed URLs for private documents (1-hour TTL)

---

## Cross-Section Query Impact

### Booking Creation Cascade
```
1 booking creation → 5-8 database INSERT operations:
  - rental_bookings (1)
  - financial_records (1-3: income + additional costs + VAT)
  - daily_tasks (2: delivery + return)
  - booking_contacts (0-1)
  - booking_additional_info (0-N)
```
- Sequential inserts — total time: ~500ms-2s depending on network
- No batch insert used — each INSERT is a separate network round-trip

### Booking Delete Cascade
```
1 booking deletion → 4+ DELETE operations:
  - storage.remove (contract photo)
  - daily_tasks DELETE
  - financial_records DELETE
  - rental_bookings DELETE
```
- Sequential deletes — total time: ~400ms-1.5s

---

## Future Optimizations

| Area | Current | Recommended |
|------|---------|-------------|
| Vehicle images | Base64 in DB column | Move to storage bucket with URL reference |
| Vehicle list | No pagination | Add pagination for 100+ vehicles |
| CalendarView queries | All bookings fetched | Date-range filter (±6 months) |
| Booking cascade | Sequential inserts | Database function (single round-trip) |
| Sub-tab loading | Fetch on every tab switch | Cache previous tab data |
| Status computation | Client-side per vehicle | Database view or function for batch status |
| Damage images | No lazy loading | Intersection Observer for image loading |
| Document downloads | Full blob fetch | Streaming for large files |
| Realtime | Only on vehicles + financial_records | Add to maintenance, reminders, documents |
