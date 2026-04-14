

# Plan: CRM Phase 2 — Booking Form Integration + Booking Number Display

## Summary
Connect the booking form to the CRM data model (customer upsert, customer type, insurance FK, booking number display) across 3 components + 6 translation files. No database changes.

## Files to modify (9 total)

| File | Changes |
|------|---------|
| `src/components/booking/UnifiedBookingDialog.tsx` | Add `customerType` state + dropdown, `upsertCustomer` helper, `resolveInsuranceTypeId` helper, wire into `handleSaveBooking`, show booking number in success toast |
| `src/components/fleet/RentalBookingsList.tsx` | Add `booking_number` to interface + SELECT, display as pill badge, extend search filter |
| `src/components/finances/FinanceDashboard.tsx` | Add `bookingNumbersMap` state, fetch booking numbers after records load, append to `getTransactionTitle` output |
| `src/i18n/locales/{en,el,de,fr,it,es}/fleet.json` | Add 11 new keys (customerType options, tooltip, createdWithNumber, searchCustomerOrBookingNumber) |

## Detailed approach

### UnifiedBookingDialog.tsx
- **State**: Add `customerType` (default `"Unknown"`) at line ~114, after `customerCountryCode`
- **Reset**: Add `setCustomerType("Unknown")` in `resetForm()` at line ~576
- **Constants**: Add `CUSTOMER_TYPE_OPTIONS` array before component definition
- **UI**: Add Customer Type Select dropdown as Row 5 in the Customer Information section (after City field)
- **`upsertCustomer` helper**: Conservative match on `(user_id, LOWER(name), LOWER(email))`. If found, update non-empty PII fields. If not found, generate next `C-XXXX` number and insert. Returns `customer_id`
- **`resolveInsuranceTypeId` helper**: Looks up `insurance_types.id` by `name_original` match for current user
- **Save flow** (lines 406-567): Before the `rental_bookings` insert, call `upsertCustomer` and `resolveInsuranceTypeId`. Add `customer_id`, `customer_type`, `insurance_type_id` to the insert payload. Change `.select()` to `.select('id, booking_number')`. Update success toast to include booking number
- **booking_contacts insert**: Left completely untouched (lines 541-557)

### RentalBookingsList.tsx
- Add `booking_number?: string | null` to `RentalBooking` interface
- Add `booking_number` to the `.select(...)` query
- Display pill badge `<span className="px-2 py-0.5 text-xs font-mono font-medium text-slate-600 bg-slate-100 rounded-md">` next to customer name
- Extend `filteredBookings` useMemo to also match `booking_number`
- Change search placeholder to `t('fleet:searchCustomerOrBookingNumber')`

### FinanceDashboard.tsx
- Add `bookingNumbersMap` state (`Map<string, string>`)
- After `financialRecords` are fetched, extract unique `booking_id`s and batch-fetch `booking_number` from `rental_bookings`
- In `getTransactionTitle`: compute final title as before, then append ` ${bookingNumber}` if the record has a `booking_id` with a mapped number

### Translations
All 11 keys added to all 6 locales as specified in the prompt. Merged into existing JSON, no overwrites.

## What stays untouched
- `booking_contacts` insert logic (unchanged)
- All Home components, Calendar, sidebar, navigation
- No database migrations
- No manual edits to `types.ts`

