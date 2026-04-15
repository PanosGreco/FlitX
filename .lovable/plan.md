

# Plan: CRM Phase 3 — Customer Table Page

## Summary
Create the CRM page at `/crm` with a customer data table, filters, search, sorting, and pagination. 12 new files + modifications to 10 existing files. No database changes.

## New Files (12)

| File | Purpose |
|------|---------|
| `src/pages/CRM.tsx` | Page component with filter state, derived computations, layout |
| `src/components/crm/CustomerTable.tsx` | Table with sorting, pagination, empty/loading states |
| `src/components/crm/CustomerTableRow.tsx` | Single row: 11 columns, action dropdown |
| `src/components/crm/CRMFilterBar.tsx` | Search input + 4 filter pill popovers (Amount, Type, Location, Date) |
| `src/components/crm/CustomerTypeTag.tsx` | Colored pill for customer type display |
| `src/hooks/useCustomers.ts` | Fetches customers + booking types, computes age from birth_date |
| `src/i18n/locales/{en,el,de,fr,it,es}/crm.json` | 6 translation files with ~45 keys each |

## Modified Files (10)

| File | Change |
|------|--------|
| `src/App.tsx` | Add `import CRM` + route `/crm` (line ~37) |
| `src/i18n/index.ts` | Add `crm` imports for all 6 languages, add to resources + `ALL_NAMESPACES` |
| `src/components/layout/DesktopSidebar.tsx` | Add `Users` import, add nav item between finances and home |
| `src/components/layout/MobileSidebar.tsx` | Same nav item addition |
| `src/components/layout/BottomNavigation.tsx` | Same nav item addition |
| `src/i18n/locales/{en,el,de,fr,it,es}/common.json` | Add `"crm": "CRM"` key |

## Technical Details

### Data Hook (`useCustomers.ts`)
- Fetches all customers for `user.id` from `customers` table
- Fetches `customer_type` from `rental_bookings` for those customer IDs to build distinct types per customer
- Computes `age` from `birth_date` using `differenceInYears`
- Returns `{ customers, loading, refresh }`

### Filter Bar (`CRMFilterBar.tsx`)
- Search input + 4 Popover-based filter pills
- Amount Range: dual `Input` fields (min/max) inside popover
- Customer Type: 7 checkboxes with `CustomerTypeTag` labels
- Location: two Select dropdowns (country from customer data, city filtered by country)
- Last Booking: two Calendar pickers (from/to)
- Active pills get primary fill + white text
- "Clear all filters" link when any filter is active
- Shows filtered/total count below

### Customer Table (`CustomerTable.tsx`)
- 11 columns: ID, Name, Age, Location, Total Amount, Bookings, Type, Last Booking, Accidents, Accident €, Actions
- Sorting on 8 columns, default `total_bookings_count` desc
- Pagination footer: total count, rows-per-page select (10/25/50/100), page nav
- Loading: 5 skeleton rows
- Empty states: no-customers vs no-results (differentiated by `totalCustomers` prop)
- Uses shadcn `Table` components, `bg-white rounded-xl shadow-sm border`

### Navigation
- `Users` icon from lucide-react
- Position: between "finances" and "home" in all 3 nav components
- `titleKey: "crm"` maps to `common.json` key

### i18n Registration
- `src/i18n/index.ts`: add 6 `import` statements for `crm.json`, add `crm: xxCrm` to each language in `resources`, add `'crm'` to `ALL_NAMESPACES`

## What stays untouched
- `UnifiedBookingDialog.tsx`, `RentalBookingsList.tsx`, `FinanceDashboard.tsx`
- All Home/Fleet/Calendar components
- No database migrations
- No manual edits to `types.ts`

