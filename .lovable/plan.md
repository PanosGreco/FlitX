

# Plan: CRM Vehicle Types + Customer Distribution + Relationship Chart

## Summary
Three additions to the CRM: vehicle types tags column in the customer table, a third pie (Customer Types) inside the renamed "Customer Distribution" chart, and a new full-width stacked bar chart showing the booking-level relationship between customer type and vehicle subcategory. No DB changes — all data derives from existing `rental_bookings` joined to `vehicles.type`.

## New Files (2)

| File | Purpose |
|------|---------|
| `src/components/crm/VehicleTypeTag.tsx` | Compact tag (`px-1.5 text-[9px]`) with deterministic hash-based color from an 8-color palette (cyan, indigo, lime, rose, violet, teal, fuchsia, sky) |
| `src/components/crm/charts/CustomerTypeVsVehicleChart.tsx` | Recharts stacked BarChart (one bar per customer type, segments per vehicle type), with Info popover and empty state |

## Modified Files

### `src/hooks/useCustomers.ts`
- Add `vehicle_types: string[]` to `CustomerRow`.
- Extend bookings query to `select('customer_id, customer_type, vehicle_id, vehicles(type)')` and remove the `.not('customer_type','is',null)` filter (filter inline instead, since a booking can be null on customer_type but valid on vehicle).
- Build `vehicleTypesByCustomer: Map<string, Set<string>>` in the same loop and emit it on each row.

### `src/hooks/useCRMChartData.ts`
- Add 4th parallel fetch: `rental_bookings.select('customer_type, vehicle_id, vehicles(type)')` filtered by user, store in `bookingsWithTypes` state.
- Reuse the existing `toLocationData` helper to compute `customerTypeDistribution` from booking-level customer_type counts.
- Compute `customerTypeVsVehicle: CustomerTypeVsVehicleData[]` (matrix of customerType → {vehicleType: count}) sorted by total desc.
- Compute `allVehicleTypes: string[]` (sorted unique set).
- Extend `hasLocationData` to also be true when customer types exist.
- Export all four new fields.

### `src/components/crm/CustomerTable.tsx`
- Add column `{ key: 'vehicle_types', label: t('col_vehicleTypes'), sortable: false }` between `customer_types` and `last_booking_date`.

### `src/components/crm/CustomerTableRow.tsx`
- New `<TableCell>` rendering up to 2 `VehicleTypeTag` chips, with a `+N` Popover trigger for overflow listing all tags. `e.stopPropagation()` on trigger and content.

### `src/components/crm/charts/LocationDistributionChart.tsx`
- Rename header to `t('crm:chart_customerDistribution')`.
- Grid changes from `grid-cols-2` to `grid-cols-3 gap-4`.
- Add `customerTypeDistribution: LocationData[]` prop and render a third `PieSection`.
- Shrink each pie (`innerRadius=20, outerRadius=40`) and legend font (`9px`) so all three fit comfortably in narrower columns.

### `src/pages/CRM.tsx`
- Pass `customerTypeDistribution` to `LocationDistributionChart`.
- Add a second chart row below the existing 3-col grid: `<CustomerTypeVsVehicleChart>` taking full width (`grid-cols-1`), receiving `data`, `vehicleTypes`, `hasData`, `loading` from the hook.

### `src/i18n/locales/{en,el,de,fr,it,es}/crm.json`
- Add 7 new keys: `col_vehicleTypes`, `chart_customerDistribution`, `chart_customerTypes`, `chart_customerTypeVsVehicle`, `chart_customerTypeVsVehicleHint`, `chart_noTypeVsVehicleData`, `chart_noTypeVsVehicleDataHint`.
- Keep `chart_locationDistribution` as legacy alias (don't delete to avoid breaking anything; the component just stops referencing it).

## Technical Notes

- **Booking-level vs customer-level**: The Customer Types pie and the relationship chart both count BOOKINGS, not unique customers. A customer with 2 Family + 1 Business bookings contributes 2 + 1.
- **Vehicle subcategory**: Uses `vehicles.type` (e.g., "SUV", "Sedan"), not the broad `vehicles.vehicle_type`.
- **Color consistency**: VehicleTypeTag and the stacked bar chart segments share a parallel palette so the same vehicle type appears in similar hues across table and chart.
- **No DB migration. No edits to** AccidentByAgeChart, InsuranceProfitabilityChart, CRMFilterBar, AddAccidentDialog, AccidentHistory, CustomerTypeTag, or any non-CRM file.

## Layout

```
Header (title + Add Accident)
[Age] [Customer Distribution: Countries|Cities|CustomerTypes] [Insurance]
[Customer Type vs Vehicle Type — full width]
Filter Bar
Customer Table (cols: ID, Name, Contact, Age, Location, Total, Bookings, Type, VehicleTypes, LastBooking, Accidents, Accident€)
Accident History
```

