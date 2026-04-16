

# Plan: CRM Phase 4 — Accident Record System

## Summary
Add accident recording UI to the CRM page: a dialog to create accidents linked to bookings, and a collapsible history section. No database changes — the `accidents` table and triggers already exist.

## New Files (2)

| File | Purpose |
|------|---------|
| `src/components/crm/AddAccidentDialog.tsx` | Dialog with booking selector, date, description, damage cost, payer type (insurance/user/split) with auto-calculating split amounts, notes |
| `src/components/crm/AccidentHistory.tsx` | Collapsible section below customer table showing recent accidents with booking/customer/vehicle references and amount breakdowns |

## Modified Files (7)

| File | Change |
|------|--------|
| `src/pages/CRM.tsx` | Destructure `refresh` from `useCustomers`; add accident dialog state + button (orange, AlertTriangle icon) in header; add AccidentHistory below table; add handleAccidentSuccess handler |
| `src/i18n/locales/{en,el,de,fr,it,es}/crm.json` | Add ~30 accident-related keys each (merge, no overwrites) |

## Technical Details

### AddAccidentDialog
- Booking selector: fetches 100 most recent bookings via `rental_bookings` joined with `vehicles(make, model)`, displayed as `#00042 — Name — Vehicle (dates)`, filterable client-side
- Date picker: shadcn Calendar in Popover, default today, `pointer-events-auto`
- Payer type radio group: `insurance` / `user` / `split` — auto-fills amounts when switching; split mode shows two linked number inputs that auto-calculate complement
- Save: inserts into `accidents` table; `customer_id` and `vehicle_id` auto-filled by existing DB trigger `sync_accident_denorm_fields`; customer aggregates recomputed by `recompute_customer_accident_totals` trigger
- On success: calls `onSuccess()` which triggers customer refresh + accident history refresh

### AccidentHistory
- Fetches 20 most recent accidents with joined booking/customer/vehicle data
- Uses shadcn `Collapsible`, collapsed by default
- Each row shows: date, booking ref, description (line-clamp-2), amount breakdown (total, insurance in teal, customer in orange), payer badge
- Shows first 10 with "Show all" expand if more
- Empty state when no accidents

### CRM.tsx Changes
- Line 10: destructure `refresh` from `useCustomers()`
- Add `isAccidentDialogOpen` and `accidentRefreshKey` state
- Header becomes flex row with title left, orange button right
- After `<CustomerTable>`: add `<AccidentHistory>` and `<AddAccidentDialog>`

## What stays untouched
- CustomerTable, CustomerTableRow, CRMFilterBar, CustomerTypeTag, useCustomers
- No database migrations
- No non-CRM files

