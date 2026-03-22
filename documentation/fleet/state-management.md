# Fleet — State Management

## Overview

This document explains where state lives within the Fleet section, how it propagates between components, and how changes in Fleet affect other sections of the application.

---

## State Ownership Map

### `Fleet.tsx` (Page Level)

| State | Type | Purpose |
|-------|------|---------|
| `vehicles` | `VehicleData[]` | Complete list of user's vehicles |
| `isLoading` | `boolean` | Initial fetch loading state |
| Add dialog form fields | `string/number/null` (15+ fields) | Form state for new vehicle creation |
| `showAddDialog` | `boolean` | Dialog visibility |

**Data fetching**: On mount + Realtime subscription on `vehicles` table (all events for user).

### `VehicleGrid.tsx` (List View)

| State | Type | Purpose |
|-------|------|---------|
| `searchQuery` | `string` | Text filter input |
| `filters` | `VehicleFilters` | Structured filter object |
| `isFilterOpen` | `boolean` | Filter popover visibility |

**Derived data**: `filteredAndSortedVehicles` — memoized from `vehicles` + `searchQuery` + `filters`.

**Batch status**: `useFleetStatuses(vehicleIds)` returns `Map<string, string>` of computed statuses.

### `VehicleDetail.tsx` (Detail Page)

| State | Type | Purpose |
|-------|------|---------|
| `vehicle` | `VehicleData \| null` | Single vehicle data |
| `loading` | `boolean` | Fetch loading state |

**Realtime**: Channel subscription filtered by vehicle ID, UPDATE events only → triggers refetch.

### `VehicleDetails.tsx` (Detail Layout)

| State | Type | Purpose |
|-------|------|---------|
| `activeTab` | `string` | Currently visible tab |
| `refreshBookings` | `number` | Counter — incremented to trigger booking refetch |
| `refreshVehicle` | `number` | Counter — incremented to trigger vehicle refetch |
| `needsRepair` | `boolean` | Status override flag |
| Dialog open states | `boolean` | For edit, status, maintenance block, booking dialogs |

**Status**: `useVehicleStatus(vehicleId)` returns computed status + `refetchStatus()` callback.

---

## Sub-Section State Isolation

Each tab component manages its own state independently:

| Component | Owns | Fetches On |
|-----------|------|------------|
| `VehicleReminders` | `reminders[]`, `isLoading` | Mount + after CRUD operations |
| `VehicleMaintenance` | `maintenanceRecords[]`, `isLoading` | Mount + after add |
| `DamageReport` | `damages[]`, `isLoading` | Mount + after add/delete |
| `VehicleDocuments` | `documents[]`, `isLoading` | Mount + after upload/delete |
| `CalendarView` | `bookings[]`, `maintenanceBlocks[]`, `selectedRange` | Mount + `refreshBookings` change |
| `RentalBookingsList` | `bookings[]`, `searchQuery` | Mount + `refreshBookings` change |
| `VehicleFinanceTab` | `records[]`, `currentPage` | Mount + Realtime subscription |

**Key principle**: Tabs do NOT share state with each other. Creating a maintenance record does not refresh the finance tab (unless Realtime catches the `financial_records` INSERT).

---

## Refresh Patterns

### Pattern 1: Counter-Based Refresh (`refreshBookings`)

```
Booking created/deleted in CalendarView or RentalBookingsList
  → refreshBookings++ (in VehicleDetails.tsx)
  → useEffect in CalendarView triggers refetch (depends on refreshBookings)
  → useEffect in RentalBookingsList triggers refetch (depends on refreshBookings)
  → refetchStatus() called → status badge updates
```

### Pattern 2: Realtime Subscription

```
Vehicle edited via EditVehicleDialog
  → vehicles UPDATE in database
  → Realtime channel (filtered by vehicle ID) fires
  → VehicleDetail.tsx refetches vehicle data
  → Re-renders VehicleDetails with updated data
```

```
Financial record created (booking or maintenance)
  → financial_records INSERT in database
  → VehicleFinanceTab Realtime subscription fires
  → Finance tab refetches records
  → Summary cards + transaction list update
```

### Pattern 3: Local Refetch

```
Maintenance record added in VehicleMaintenance
  → Local fetchMaintenanceRecords() called
  → Only VehicleMaintenance re-renders
  → No cross-tab propagation
  → (Analytics Realtime catches the financial_records INSERT separately)
```

---

## Cross-Section Propagation

### Fleet → Analytics
```
Booking created in Fleet
  → financial_records INSERT (income + additional costs + VAT)
  → Analytics has Realtime subscription on financial_records
  → Analytics dashboard auto-refreshes with new data
```

### Fleet → Home
```
Booking created in Fleet
  → daily_tasks INSERT (delivery + return tasks)
  → Home does NOT have Realtime subscription
  → Tasks appear on next Home page load / manual refresh
```

### Fleet → AI
```
Any Fleet data change (vehicle, booking, maintenance)
  → No immediate propagation
  → AI reads fresh data on next user query
  → computeFinancialContext() fetches current state from DB
```

---

## `useFleetStatuses` Hook — Batch Status Computation

```typescript
useFleetStatuses(vehicleIds: string[])
  → 3 parallel queries:
      1. rental_bookings WHERE vehicle_id IN vehicleIds AND status IN ('active', 'confirmed')
      2. maintenance_blocks WHERE vehicle_id IN vehicleIds
      3. vehicles WHERE id IN vehicleIds (for base status)
  → For each vehicle: computeStatusForDate(today, vehicleBookings, vehicleBlocks, baseStatus)
  → Returns Map<vehicleId, computedStatus>
```

- Runs once on mount with all vehicle IDs
- Re-runs when `vehicleIds` array changes (new vehicle added/removed)
- Returns `isLoading` flag used by VehicleGrid to show loading state

---

## `useVehicleStatus` Hook — Single Vehicle Status

```typescript
useVehicleStatus(vehicleId: string)
  → Same logic as batch but for single vehicle
  → Returns { status, isLoading, refetchStatus }
  → refetchStatus() allows manual refresh after booking changes
```
