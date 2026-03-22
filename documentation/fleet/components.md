# Fleet — Components

## Overview

This document maps the complete component tree of the Fleet section, covering both the fleet list view and the vehicle detail page with all its sub-sections.

---

## Component Tree

```
Fleet.tsx (page — state owner for vehicle list)
├── VehicleGrid.tsx (list view)
│   ├── Search input (multi-term, space-separated)
│   ├── VehicleFilterPanel.tsx (popover)
│   ├── useFleetStatuses() (batch status computation)
│   └── VehicleCard.tsx × N (linked to /vehicle/:id)
│       └── Computed status badge
├── Add Vehicle Dialog (inline in Fleet.tsx)
│   ├── Vehicle type selector (9 types)
│   ├── Category dropdown/input
│   ├── Form fields (make, model, year, etc.)
│   ├── Purchase price section (optional)
│   └── Image upload with compression
└── (Empty state when no vehicles)

VehicleDetail.tsx (page — single vehicle)
├── VehicleDetails.tsx (main layout)
│   ├── Header (image, name, status, actions)
│   └── Tabs
│       ├── VehicleReminders.tsx
│       ├── VehicleMaintenance.tsx
│       ├── DamageReport.tsx
│       ├── VehicleDocuments.tsx
│       ├── CalendarView.tsx + RentalBookingsList.tsx
│       └── VehicleFinanceTab.tsx
├── EditVehicleDialog.tsx
├── MaintenanceBlockDialog.tsx
└── UnifiedBookingDialog.tsx (shared)
```

---

## Fleet List View

### `Fleet.tsx` — Page Component

**Responsibility**: Owns the vehicle list state, add vehicle dialog, and data fetching.

**Data sources**:
- `vehicles` table: fetches all vehicles for the authenticated user
- Realtime subscription on `vehicles` table for live updates

**State owned**:
- `vehicles: VehicleData[]` — full vehicle list
- `isLoading` — loading state during initial fetch
- Add dialog form state: `vehicleType`, `type`, `customType`, `make`, `model`, `year`, `fuelType`, `transmissionType`, `passengerCapacity`, `licensePlate`, `dailyRate`, `mileage`, `image`, `purchasePrice`, `marketValueAtPurchase`
- `showAddDialog` — dialog visibility

**User interactions**:
- "Add Vehicle" button opens the add dialog
- Form submission validates + inserts + closes dialog
- Vehicle type change resets category field

### `VehicleGrid.tsx` — List Component

**Responsibility**: Renders the searchable, filterable grid of vehicle cards.

**Props**: `vehicles: VehicleData[]`, `onAddVehicle: () => void`, `isLoading: boolean`

**State owned**:
- `searchQuery` — multi-term text search
- `filters: VehicleFilters` — structured filter state
- `isFilterOpen` — filter panel visibility

**Filtering logic** (all client-side via `useMemo`):
1. **Text search**: Space-separated terms, ALL must match against `make + model + year + licensePlate`
2. **Vehicle type filter**: `vehicle_type` field (car, motorbike, atv, etc.)
3. **Category filter**: `type` field (case-insensitive match)
4. **Fuel type filter**: `fuelType` field
5. **Transmission filter**: `transmissionType` field (defaults to 'manual' if unset)
6. **Passenger count filter**: `passengerCapacity` field; special case: filter value 7 matches capacity ≥ 7
7. **Year sort**: ascending or descending
8. **Sold sort**: `is_sold` vehicles always sorted to bottom (final sort pass)

**Batch status**: `useFleetStatuses(vehicleIds)` computes status for all vehicles in one batch call.

### `VehicleFilterPanel.tsx` — Filter Popover

**Responsibility**: Renders filter controls in a popover panel.

**Filter categories**:
- Vehicle type (from `VEHICLE_TYPES` constant — 9 types)
- Vehicle category (dynamic from available vehicles)
- Fuel type (Petrol, Diesel, Electric, Hybrid, LPG)
- Transmission type (from `TRANSMISSION_TYPES` constant)
- Passenger count (2, 4, 5, 7+)
- Year sort (Newest First / Oldest First)

**Active filter count**: Badge on filter button showing total active filters.

### `VehicleCard.tsx` — Individual Vehicle Card

**Responsibility**: Renders a single vehicle card with image, info, and status badge.

**Props**: `vehicle: VehicleData`, `computedStatus: string`

**Display logic**:
- Image: base64 data URL or placeholder
- Status badge: color-coded (green=available, blue=rented, orange=maintenance, red=repair, gray=sold)
- Sold vehicles: reduced image opacity, SOLD badge, sale price replaces daily rate
- Links to `/vehicle/${vehicle.id}` on click

---

## Vehicle Detail Page

### `VehicleDetail.tsx` — Page Component

**Responsibility**: Fetches single vehicle data and renders `VehicleDetails`.

**Data**: Fetches from `vehicles` table by URL param `:id` using `maybeSingle()`.

**Realtime**: Subscribes to `vehicles` table filtered by vehicle ID, UPDATE events only → triggers refetch.

**Error handling**: If vehicle not found → redirects to `/` (home).

### `VehicleDetails.tsx` — Main Layout

**Responsibility**: Renders vehicle header, tab navigation, and all sub-section components.

**State owned**:
- `activeTab` — currently visible tab (reminders/maintenance/damages/documents/reservations/finance)
- `refreshBookings` — counter incremented after booking create/delete
- `refreshVehicle` — counter incremented after vehicle edit
- `needsRepair` — boolean for status override
- Dialog open states for edit, status, maintenance block, booking

**Header elements**:
- Vehicle image (large)
- Vehicle name (`year make model`)
- License plate
- Status badge (computed via `useVehicleStatus`)
- Edit Vehicle button → `EditVehicleDialog`
- Edit Status button → inline status selector

---

## Sub-Section: Reminders

### `VehicleReminders.tsx`

**Responsibility**: CRUD for vehicle-specific reminders.

**Data source**: `vehicle_reminders` table filtered by `vehicle_id`.

**Features**:
- List ordered by `due_date` (ascending)
- Toggle completion via bell/bell-off icon → UPDATE `is_completed`
- Delete button per reminder → DELETE with confirmation
- Add Reminder dialog: title (required), due_date (date picker, required), description (optional)

**Cross-section**: Reminders with `due_date = today` also appear in Home's `RemindersWidget`.

---

## Sub-Section: Maintenance

### `VehicleMaintenance.tsx`

**Responsibility**: Track vehicle service history with cost integration.

**Data source**: `vehicle_maintenance` table filtered by `vehicle_id`, ordered by `date` descending.

**Features**:
- Shows last 4 records in compact view; "View All" opens paginated dialog
- Add Record dialog with:
  - Type: predefined from `MAINTENANCE_TYPES` + custom from `useMaintenanceCategories`
  - Date picker
  - Cost input (optional)
  - Description/notes
  - Next service date (optional)
- **Dual insert**: `vehicle_maintenance` INSERT + `financial_records` INSERT (if cost > 0)
- Financial record uses: `type='expense'`, `category='maintenance'`, `expense_subcategory=maintenanceType`, `source_section='vehicle_maintenance'`

---

## Sub-Section: Damages

### `DamageReport.tsx`

**Responsibility**: Photo-documented damage tracking by vehicle zone.

**Data source**: `damage_reports` table filtered by `vehicle_id`.

**Features**:
- 6 damage zones: Front, Back, Right Side, Left Side, Interior, Tires
- Per-zone: add damage with description + multi-file photo upload
- Photos uploaded to `damage-images` storage bucket
- Image compression before upload
- Lightbox viewer for full-size photos
- Delete: removes images from storage + DB record

---

## Sub-Section: Documents

### `VehicleDocuments.tsx`

**Responsibility**: File management for vehicle-related documents.

**Data source**: `vehicle_documents` table filtered by `vehicle_id`.

**Features**:
- Grid of document cards with search by name
- Upload dialog: file picker + custom name
- File validation: `validateFileSize()` enforces size limit
- Image compression for image files
- Storage path: `userId/vehicleId/timestamp_name.ext` in `vehicle-documents` bucket
- View: `FilePreviewModal` generates signed URL (1-hour TTL)
- Download: Blob fetch via signed URL → programmatic `<a>` click
- Delete: Storage removal + DB deletion
- **Rollback**: If DB insert fails after storage upload, the uploaded file is explicitly removed

---

## Sub-Section: Reservations

### `CalendarView.tsx` — Monthly Calendar

**Responsibility**: Visual booking calendar with date selection for new bookings.

**Data sources**:
- `rental_bookings` filtered by `vehicle_id` (active/confirmed/pending)
- `maintenance_blocks` filtered by `vehicle_id`

**Display logic**:
- Month grid with color-coded dates:
  - **Red**: Booked (has active/confirmed booking)
  - **Orange**: Maintenance block
  - **Blue**: Selected by user
- Popover on booked dates: shows customer name, pickup/return time and location
- Date range selection: first click = start date, second click = end date
- Booked/maintenance dates are unclickable (click handler returns early)
- "New Booking" button → opens `UnifiedBookingDialog` with pre-filled vehicle + dates

### `RentalBookingsList.tsx` — Booking List

**Responsibility**: Searchable list of all bookings for the vehicle.

**Data sources**:
- `rental_bookings` filtered by `vehicle_id`
- `booking_contacts` for email/phone
- `booking_additional_info` + `additional_info_categories` for metadata

**Features**:
- Search by customer name
- Status badges: Upcoming (future start), Active (current), Booked (confirmed)
- Contract photo viewer (from `rental-contracts` bucket)
- Additional info display (expandable)
- Delete booking (full cascade — see data-flow.md)
- Payment status indicator

---

## Sub-Section: Finance

### `VehicleFinanceTab.tsx`

**Responsibility**: Per-vehicle financial overview with depreciation tracking.

**Data source**: `financial_records` filtered by `vehicle_id`.

**Features**:
- **Summary cards**: Total Revenue, Total Expenses, Net Income
- **Metrics row** (visible when `purchase_price > 0`):
  - Card 1: Purchase Value + Depreciation Progress bar (or Sold summary with profit/loss)
  - Card 2: Vehicle Averages (Avg Rental Price, Avg Income/Day, Avg Cost/Day, Avg Profit/Day)
  - Card 3: Value Loss Over Time (usage-based depreciation from `depreciationUtils`)
- **Transaction history**: Paginated list (10 per page) of all financial records for this vehicle
- **Realtime subscription**: On `financial_records` table filtered by `vehicle_id` — live updates when bookings or maintenance create new records

---

## Shared Components

### `EditVehicleDialog.tsx`
- Pre-filled form with current vehicle data
- Same fields as Add Vehicle dialog
- UPDATE on submit → Realtime triggers refresh

### `MaintenanceBlockDialog.tsx`
- Date range picker (start + end)
- Optional description
- INSERT to `maintenance_blocks` → blocks dates in CalendarView

### `UnifiedBookingDialog.tsx`
- Shared across Fleet and Home sections
- Full booking form with additional costs, contacts, info categories
- Can be embedded (`embedded=true` prop for Home's CreateDialog) or standalone
