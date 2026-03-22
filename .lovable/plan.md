

# Plan: Fleet Section Documentation — Multi-File Structure

## Overview

Create `/documentation/fleet/` with 8 markdown files documenting the Fleet section — the core asset management system of FlitX — following the exact structure of Analytics and Home documentation.

## Files to Create

### 1. `/documentation/fleet/README.md` (~180 lines)
**System-level context, vehicle lifecycle, and navigation index.**

- Fleet as the core asset management hub (route `/fleet`, rendered by `Fleet.tsx`; detail at `/vehicle/:id` via `VehicleDetail.tsx`)
- System position diagram showing Fleet at the center:
  - **Home**: bookings create `daily_tasks` (delivery/return) displayed on timeline
  - **Analytics**: bookings generate `financial_records` (income); maintenance generates `financial_records` (expense); vehicle sales generate profit/loss records
  - **AI Assistant**: reads `vehicles`, `rental_bookings`, `vehicle_maintenance`, `recurring_transactions` for financial analysis and pricing optimization
- Vehicle lifecycle: **Creation** (Add Vehicle dialog → `vehicles` INSERT) → **Operation** (bookings, maintenance, reminders) → **Sale** (mark `is_sold`, generate profit/loss record) → **Post-sale** (sorted to bottom of grid, excluded from booking selectors, time-aware in AI analysis)
- Source of truth definitions:
  - `vehicles` = authoritative for vehicle attributes (make, model, type, status, daily_rate, is_sold)
  - `rental_bookings` = authoritative for reservations per vehicle
  - `vehicle_maintenance` = authoritative for maintenance history per vehicle
  - `maintenance_blocks` = authoritative for scheduled unavailability periods
  - `vehicle_reminders` = authoritative for vehicle-specific reminders
  - `vehicle_documents` = authoritative for uploaded documents (stored in `vehicle-documents` bucket)
  - `damage_reports` = authoritative for damage history (images in `damage-images` bucket)
  - `financial_records` = derived from bookings + maintenance (not editable from Fleet directly)
- Vehicle sub-sections overview: Reminders, Maintenance, Damages, Documents, Reservations (Calendar + Booking List), Finance
- Links to each sub-document

### 2. `/documentation/fleet/data-flow.md` (~300 lines)
**Step-by-step data lifecycles for all Fleet operations.**

- **Vehicle creation flow**: Add Vehicle dialog → form validation (type, category, make, model, year required) → `vehicles` INSERT with image as base64 data URL → Realtime subscription triggers fleet grid refresh
- **Booking creation flow** (from vehicle calendar): CalendarView date selection → `UnifiedBookingDialog` → `rental_bookings` INSERT → `financial_records` INSERT (rental income + additional costs + optional VAT expense) → `daily_tasks` INSERT (delivery on start_date, return on end_date) → `booking_contacts` INSERT (if email/phone provided) → `booking_additional_info` INSERT (per category) → `refreshBookings` counter increments → CalendarView refetches → status recomputed via `useVehicleStatus`
- **Booking delete cascade**: storage file removal (`rental-contracts` bucket) → `daily_tasks` DELETE → `financial_records` DELETE (by booking_id) → `rental_bookings` DELETE → UI refresh
- **Maintenance creation flow**: VehicleMaintenance dialog → `vehicle_maintenance` INSERT → if cost > 0: `financial_records` INSERT (type=expense, category=maintenance, source_section=vehicle_maintenance) → custom category persisted for future use via `useMaintenanceCategories`
- **Reminder flow**: VehicleReminders → `vehicle_reminders` INSERT (title, due_date, description) → manual refetch → also appears in Home's RemindersWidget when due_date = today
- **Document upload flow**: file validation (`validateFileSize`) → image compression (`compressImage`) → upload to `vehicle-documents` bucket (path: `userId/vehicleId/timestamp_name.ext`) → `vehicle_documents` INSERT → on failure: storage rollback (remove uploaded file)
- **Damage report flow**: category selection (Front/Back/Right/Left/Interior/Tires) → multi-file upload to `damage-images` bucket → `damage_reports` INSERT with image URL array + description
- **Vehicle sale flow**: Finance tab or Analytics "Vehicle Sale" → `financial_records` INSERT (category=vehicle_sale, profit/loss calculated) → `vehicles` UPDATE (is_sold=true, sale_price, sale_date) → vehicle sorted to bottom of grid, excluded from booking/maintenance selectors
- **Vehicle edit flow**: EditVehicleDialog → `vehicles` UPDATE → Realtime subscription triggers refresh on VehicleDetail page (channel per vehicle ID)
- **Status computation flow**: `useVehicleStatus` fetches bookings + maintenance_blocks → `computeStatusForDate()` checks: booking today → "rented", maintenance block today → "maintenance", base_status = "repair" → "repair", else → "available"

### 3. `/documentation/fleet/components.md` (~350 lines)
**Component tree and per-sub-section breakdown.**

```text
Fleet.tsx (page — state owner for vehicle list)
├── VehicleGrid.tsx (list view)
│   ├── Search input (multi-term, space-separated)
│   ├── VehicleFilterPanel.tsx (popover with type/category/fuel/transmission/passengers/year filters)
│   ├── useFleetStatuses() (batch status computation for all vehicles)
│   └── VehicleCard.tsx × N (linked to /vehicle/:id)
│       └── Computed status badge (available/rented/maintenance/repair/sold)
├── Add Vehicle Dialog (inline in Fleet.tsx)
│   ├── Vehicle type selector (9 types from VEHICLE_TYPES)
│   ├── Category: predefined dropdown OR custom input (types with no presets show input directly)
│   ├── Make/Model/Year/Fuel/Transmission/Passengers/Plate/DailyRate/Mileage
│   ├── Purchase price + Depreciation data (optional section)
│   └── Image upload with compression
└── (No vehicle selected state)

VehicleDetail.tsx (page — single vehicle)
├── VehicleDetails.tsx (main layout)
│   ├── Header: image, name, status badge, Edit Vehicle / Edit Status buttons
│   ├── Tabs: Reminders | Maintenance | Damages | Documents | Reservations | Finance
│   │
│   ├── [Reminders Tab] VehicleReminders.tsx
│   │   ├── List of reminders ordered by due_date
│   │   ├── Toggle completion (bell/bell-off icons)
│   │   ├── Delete button per reminder
│   │   └── Add Reminder dialog (title, due_date picker, description)
│   │
│   ├── [Maintenance Tab] VehicleMaintenance.tsx
│   │   ├── History list (last 4 shown, "View All" for paginated dialog)
│   │   ├── Predefined types from MAINTENANCE_TYPES + custom categories from useMaintenanceCategories
│   │   ├── Add Record dialog (type, date, cost, notes, next service date)
│   │   └── Dual insert: vehicle_maintenance + financial_records
│   │
│   ├── [Damages Tab] DamageReport.tsx
│   │   ├── Category-grouped photo grid (Front/Back/Right/Left/Interior/Tires)
│   │   ├── Multi-file upload with compression
│   │   ├── Lightbox image viewer
│   │   └── Delete damage (removes from storage + DB)
│   │
│   ├── [Documents Tab] VehicleDocuments.tsx
│   │   ├── Grid of document cards with search
│   │   ├── Upload dialog (file + name)
│   │   ├── Signed URL viewer (1-hour expiry) via FilePreviewModal
│   │   ├── Download via blob fetch + programmatic anchor click
│   │   └── Delete: storage removal + DB deletion
│   │
│   ├── [Reservations Tab]
│   │   ├── CalendarView.tsx (month-view with date selection)
│   │   │   ├── Color-coded days: red=booked, orange=maintenance, blue=selected
│   │   │   ├── Popover on booked dates: pickup/return info (time, location, customer)
│   │   │   ├── Date range selection (click start → click end)
│   │   │   └── "New Booking" button → passes selected dates to UnifiedBookingDialog
│   │   └── RentalBookingsList.tsx (below calendar)
│   │       ├── Searchable by customer name
│   │       ├── Status badges: Upcoming/Active/Booked
│   │       ├── Contract photo viewer + delete
│   │       ├── Additional info display (from booking_additional_info)
│   │       └── Delete booking (full cascade)
│   │
│   └── [Finance Tab] VehicleFinanceTab.tsx
│       ├── Summary cards: Total Revenue, Total Expenses, Net Income
│       ├── Metrics row (if purchase price exists):
│       │   ├── Card 1: Purchase Value + Depreciation Progress (or Sold summary)
│       │   ├── Card 2: Vehicle Averages (Avg Rental Price, Avg Income/Day, Avg Cost/Day, Avg Profit/Day)
│       │   └── Card 3: Value Loss Over Time (usage-based depreciation from depreciationUtils)
│       ├── Transaction history list (paginated, 10 per page)
│       └── Realtime subscription on financial_records for live updates
│
├── EditVehicleDialog.tsx (update vehicle attributes)
├── EditStatusDialog (inline — available/repair/maintenance)
├── MaintenanceBlockDialog.tsx (schedule unavailability dates)
└── UnifiedBookingDialog.tsx (shared booking creation component)
```

### 4. `/documentation/fleet/formulas.md` (~150 lines)
**All calculations and derived metrics in Fleet.**

- **Vehicle status computation**: Priority chain: booking today → "rented" > maintenance block today → "maintenance" > base_status = "repair" → "repair" > "available". Uses `isWithinInterval` from date-fns.
- **Booking duration**: `Math.max(1, differenceInDays(end, start) + 1)` — always at least 1 day
- **Total booked days**: `sum(all bookings' durations)` per vehicle
- **Active days**: `Math.max(1, differenceInDays(today, created_at) + 1)` — rolling timeline from vehicle creation
- **Average rental price**: `totalRevenue / totalBookedDays` (null if 0 booked days)
- **Average income per day**: `totalRevenue / activeDays`
- **Average cost per day**: `totalExpenses / activeDays`
- **Average profit per day**: `(totalRevenue - totalExpenses) / activeDays`
- **Depreciation progress**: `netIncome / purchasePrice * 100` (capped at 100%)
- **Remaining for depreciation**: `max(0, purchasePrice - netIncome)`
- **Net profit after depreciation**: `netIncome - purchasePrice` (only when fully depreciated)
- **Vehicle sale profit/loss**: `salePrice - remainingForDepreciation` where `remainingForDepreciation = max(0, purchasePrice - netIncome)`
- **Usage-based depreciation** (from `depreciationUtils.ts`):
  - Time component: cumulative curve lookup by model year age (0yr=0%, 1yr=20%, 5yr=52%, 10yr=65%), interpolated with 50% damping for fractional years
  - Mileage component: two-tier model — base rate (all km × €0.015/km for cars) + excess penalty (above-average km × €0.025/km)
  - Expected mileage: `yearsOwned × 12000` (car average)
  - Floor protection: 20% minimum residual value
  - Total: `time + mileage`, capped by floor
- **Filter logic**: multi-criteria AND across type, category, fuel, transmission, passengers; text search is multi-term space-separated AND

### 5. `/documentation/fleet/state-management.md` (~150 lines)
**Where state lives and how it propagates.**

- `Fleet.tsx` owns: `vehicles: VehicleData[]`, `isLoading`, add dialog form state (15+ fields). Fetches on mount + Realtime subscription on `vehicles` table.
- `VehicleGrid.tsx` owns: `searchQuery`, `filters: VehicleFilters`, `isFilterOpen`. Uses `useFleetStatuses(vehicleIds)` for batch status computation.
- `VehicleDetail.tsx` owns: `vehicle` (single), `loading`. Fetches by ID on mount + Realtime subscription filtered by vehicle ID (UPDATE events only).
- `VehicleDetails.tsx` owns: `activeTab`, `refreshBookings` counter, `refreshVehicle` counter, `needsRepair`, dialog open states. Uses `useVehicleStatus(vehicleId)` for single-vehicle status.
- Sub-section state isolation: each tab component (VehicleMaintenance, VehicleReminders, etc.) owns its own data state, fetches independently on mount with vehicleId prop. No shared state between tabs.
- **Refresh patterns**:
  - Booking created → `refreshBookings++` → CalendarView + RentalBookingsList re-fetch → `refetchStatus()` → status badge updates
  - Vehicle edited → Realtime subscription on `vehicles` table → VehicleDetail refetches
  - Maintenance added → local refetch in VehicleMaintenance (no cross-tab propagation)
  - Finance tab: own Realtime subscription on `financial_records` table filtered by vehicle_id
- **Cross-section propagation**: Booking creation in Fleet → `financial_records` INSERT → Analytics Realtime subscription fires → Analytics dashboard updates. Also → `daily_tasks` INSERT → Home timeline reflects new task on next fetch.

### 6. `/documentation/fleet/edge-cases.md` (~120 lines)
**Error handling and safeguards.**

- **Vehicle not found**: `VehicleDetail.tsx` → `maybeSingle()` returns null → `navigate('/')` redirect
- **No bookings**: CalendarView shows empty calendar; RentalBookingsList shows empty state with icon
- **No maintenance**: VehicleMaintenance shows empty state with "Add first record" CTA
- **No reminders**: VehicleReminders shows descriptive empty state
- **No documents**: VehicleDocuments shows icon + "No documents yet"
- **Sold vehicle behavior**: `is_sold = true` → sorted to bottom in grid, opacity reduced on card image, SOLD badge replaces status badge, sale price shown instead of daily rate, excluded from booking dialogs via `is_sold` filter
- **Booking on booked/maintenance dates**: CalendarView click handler returns early if `isBooked || isMaintenance` — dates are unclickable
- **Document upload failure**: if DB insert fails after storage upload, storage file is explicitly removed (rollback pattern)
- **File size validation**: `validateFileSize()` checks before upload; images compressed via `compressImage()` before processing
- **Custom category normalization**: `normalizeCategory()` trims, lowercases, replaces spaces with underscores to prevent duplicates
- **Status computation race**: `useFleetStatuses` fetches bookings + maintenance + vehicle status in parallel; if any query fails, that dataset defaults to empty array
- **Zero purchase price**: depreciation section hidden entirely (`purchaseValue && purchaseValue > 0` guard)
- **Vehicle with no created_at**: `calculateActiveDays` returns 0, all daily averages show as null

### 7. `/documentation/fleet/ai-integration.md` (~120 lines)
**How Fleet data feeds the AI Assistant.**

- `computeFinancialContext()` in `ai-chat` edge function reads:
  - `vehicles`: all user vehicles (make, model, year, type, daily_rate, is_sold, sale_date, sale_price, created_at)
  - `rental_bookings`: last 12 months of bookings per vehicle (start_date, end_date, total_amount)
  - `vehicle_maintenance`: last 12 months of maintenance costs per vehicle
  - `recurring_transactions`: where `is_fixed_cost = true` for fixed cost annualization
- Pre-computed per-vehicle metrics sent to AI:
  - `avgRevenuePerBooking`, `variableCostPerBooking`, `contributionPerBooking`
  - `utilization` (booked_days / available_days)
  - `demandLevel` (high/medium/low based on utilization vs fleet average)
  - `targetDailyRate` (variable cost + fixed cost share + 15% margin, divided by avg duration)
  - `status` (profitable / underutilized / below_fixed_cost_share / loss / insufficient_data)
- Sold vehicle handling: pre-sale bookings included in global totals, post-sale excluded, vehicle excluded from per-vehicle table
- Vehicle attributes (transmission_type, fuel_type, vehicle_type) available to AI for filtering and comparative analysis
- AI does NOT compute any financial numbers — all values are pre-calculated and passed as formatted text

### 8. `/documentation/fleet/performance.md` (~100 lines)
**Scaling considerations and optimizations.**

- **Fleet list**: all vehicles fetched in one query (no pagination) — Realtime subscription for live updates. `useFleetStatuses` makes 3 parallel queries (bookings, maintenance_blocks, vehicles) for all vehicle IDs in one batch.
- **Vehicle detail**: single vehicle fetch + Realtime subscription filtered by ID. Each sub-tab fetches independently only when active (lazy loading via tab switching).
- **Calendar view**: fetches ALL bookings + maintenance_blocks for vehicle (no date filtering) → generates `bookedDates` Set and `dateInfoMap` Map for O(1) date lookups during render.
- **Booking list**: full fetch per vehicle, client-side search filtering via `useMemo`.
- **Status computation**: `computeStatusForDate` iterates all bookings + maintenance blocks per vehicle — O(bookings + blocks) per vehicle. Fleet batch: O(vehicles × (bookings + blocks)).
- **Filter panel**: all filtering done client-side via `useMemo` on already-fetched vehicles array.
- **Image handling**: base64 data URLs stored directly in `vehicles.image` column — simple but increases row size. Damage images use Storage bucket (better for multiple files).
- **Document viewer**: signed URLs generated on-demand (1-hour TTL) — no pre-fetching.
- **Future optimizations**: paginate vehicle list for large fleets (100+ vehicles), add date-range filtering to CalendarView queries, move vehicle images to Storage bucket, add Realtime subscriptions to sub-tabs (currently manual refetch only).

## Files Modified
1-8: All new files in `/documentation/fleet/`

