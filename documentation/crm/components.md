# CRM — Component Tree & Responsibilities

## 1. Component Tree

```
CRM.tsx  (page, route /crm)
│
├── AppLayout                                  (global sidebar/header)
│
├── Header
│    └── Button "Add Accident Record"          → opens AddAccidentDialog
│
├── Charts row (3 columns on lg+)
│    ├── AccidentByAgeChart                    (bar chart, age buckets)
│    ├── LocationDistributionChart             (3 pies: Countries / Cities / Customer Types)
│    └── InsuranceProfitabilityChart           (revenue vs cost vs net profit per insurance type)
│
├── CRMFilterBar                               (search, amount range, type, country, city, date range)
│
├── CustomerTable                              (paginated, sortable)
│    └── CustomerTableRow  (×N)
│         ├── customer_number, name, contact, age, location
│         ├── total_lifetime_value, total_bookings_count
│         ├── CustomerTypeTag  (chips for each booked type)
│         ├── VehicleTypeTag   (chips for each booked vehicle category)
│         ├── last_booking_date
│         └── total_accidents_count, total_accidents_amount
│
├── AccidentHistory                            (collapsible, flat list)
│
└── AddAccidentDialog                          (modal — controlled by CRM.tsx)
     ├── Booking selector (combobox over rental_bookings)
     ├── Accident date (Calendar in Popover)
     ├── Description, total damage cost, payer split, notes
     └── [Optional] "Also record as vehicle damage" Switch
          ├── Damage zone Select (Front / Back / Right Side / Left Side / Interior / Tires)
          ├── Damage notes Textarea
          └── Photo upload (multi-file, compressed via imageUtils)
```

---

## 2. File-by-File Responsibilities

### Page

| File | Responsibility |
|---|---|
| `src/pages/CRM.tsx` | Owns top-level state: `filters`, `isAccidentDialogOpen`, `accidentRefreshKey`. Calls `useCustomers()` and `useCRMChartData()`. Derives `filteredCustomers`, `availableCountries`, `availableCities`, `amountMax` via `useMemo`. Composes the layout. |

### Hooks (state + data fetching)

| File | Responsibility |
|---|---|
| `src/hooks/useCustomers.ts` | Fetches `customers` for the current user, joins booking-level `customer_type` and `vehicles.type` into `customer_types[]` / `vehicle_types[]` sets, joins `accidents.total_damage_cost` into `total_damage_cost_sum`. Returns `{ customers, loading, refresh }`. |
| `src/hooks/useCRMChartData.ts` | Fetches `accidents`, `customers`, `booking_additional_costs` (insurance), and `rental_bookings` (customer_type + vehicle.type). Computes `ageGroups`, `countries`, `cities`, `customerTypeDistribution`, `insuranceProfitability` via `useMemo`. Returns `loading`, `hasAccidentData`, `hasLocationData`, `hasInsuranceData` flags for empty-state rendering. |

### Table

| File | Responsibility |
|---|---|
| `src/components/crm/CustomerTable.tsx` | Owns sort + pagination state. Receives the already-filtered customers prop. Sortable on the 8 numeric/date columns. Default sort: `total_bookings_count` DESC. Page sizes 10/25/50. |
| `src/components/crm/CustomerTableRow.tsx` | Renders a single customer row including chip stacks for `customer_types` and `vehicle_types`. |
| `src/components/crm/CustomerTypeTag.tsx` | Small colored chip; color is type-driven (e.g. Family / Business / Tourist / Local). |
| `src/components/crm/VehicleTypeTag.tsx` | Small colored chip per `vehicles.type`. Order is alphabetic (set in `useCustomers`). |

### Filter Bar

| File | Responsibility |
|---|---|
| `src/components/crm/CRMFilterBar.tsx` | Controlled component. Search input, amount range slider (max derived from `customers`), customer-type multi-select, country combobox, city combobox (dependent on country), last-booking date range. Shows `filteredCount / totalCustomers`. |

### Charts

| File | Responsibility |
|---|---|
| `src/components/crm/charts/AccidentByAgeChart.tsx` | Recharts `BarChart` over 5 age buckets. Y-axis = total damage cost. Tooltip shows count + cost. Empty state when `!hasAccidentData`. |
| `src/components/crm/charts/LocationDistributionChart.tsx` | Three `PieChart`s side-by-side (Countries / Cities / Customer Types). Slices <5% grouped into "Other". Sub-headers + percentage labels positioned with explicit `cy="55%"` and container `overflow-visible` to avoid label clipping. |
| `src/components/crm/charts/InsuranceProfitabilityChart.tsx` | Recharts grouped/composed chart per insurance type: revenue from `booking_additional_costs`, business-paid cost from `accidents`, net profit. |

### Accident Subsystem

| File | Responsibility |
|---|---|
| `src/components/crm/AddAccidentDialog.tsx` | Booking lookup, accident form, payer-type radio (insurance / customer / business / split with auto-balance hint), and the optional damage-linkage section. Performs `accidents` INSERT then conditionally photo-uploads + `damage_reports` INSERT. |
| `src/components/crm/AccidentHistory.tsx` | Collapsible flat list of all accidents for the user. Refetches when `refreshKey` increments. Joins booking number, customer name/number, and vehicle make/model for display. |

---

## 3. Data Ownership

| State | Owner | Lifetime |
|---|---|---|
| `filters` | `CRM.tsx` | Component (page) |
| `isAccidentDialogOpen` | `CRM.tsx` | Component |
| `accidentRefreshKey` | `CRM.tsx` | Component |
| `customers` array | `useCustomers` | Hook (re-fetched on `refresh()`) |
| Chart raw data + memos | `useCRMChartData` | Hook (re-fetched on user change) |
| Sort + pagination | `CustomerTable` | Component-local |
| Accident form fields | `AddAccidentDialog` | Component-local; cleared on close |

CRM does **not** use Zustand, Redux, or Context for its own data. All state is hook- or component-local.

---

## 4. Reused Components

CRM intentionally reuses cross-section primitives instead of forking copies:

- `@/components/ui/*` — shadcn/ui primitives (Dialog, Popover, Select, Switch, Calendar, Table, Badge, Button)
- `validateFileSize`, `compressImage` from `@/utils/imageUtils` — shared with `DamageReport.tsx`
- `getDateFnsLocale()` and `getBcp47Locale()` from `@/utils/localeMap.ts`
- The damage-zone categories and translation keys (`fleet:damageCategories.*`) are reused verbatim from Fleet's `DamageReport.tsx` so a damage created from CRM is indistinguishable from one created from Fleet.
