

# Plan: CRM Phase 2 Hotfix — Fix Customer Matching Logic

## Summary
Replace the buggy `upsertCustomer` function (`.ilike()` + `.maybeSingle()`) with a client-side matching approach, add error toast translation keys, and run a one-time migration to merge any duplicate customers.

## Changes

### 1. Replace `upsertCustomer` in `UnifiedBookingDialog.tsx` (lines 417-464)
Replace the entire function with the corrected version from the prompt:
- Fetches up to 50 candidates with `.eq('user_id')` + `.limit(50)`
- Matches in JavaScript using strict case-insensitive equality (no wildcards)
- Uses `.limit(1)` + array access instead of `.maybeSingle()` for the max customer_number lookup
- Adds console logs and toast error messages for failures

### 2. Add 2 translation keys to all 6 locale files
Add `booking_customerLookupFailed` and `booking_customerCreateFailed` to `{en,el,de,fr,it,es}/fleet.json` with the translations from the prompt.

### 3. One-time SQL migration to merge duplicate customers
Create a new migration file that:
- Identifies duplicate groups by `(user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(email, ''))))`
- Keeps the oldest per group, reassigns bookings and accidents to it
- Deletes duplicates
- Force-recomputes all customer aggregates

## Files

| Action | File |
|--------|------|
| Modify | `src/components/booking/UnifiedBookingDialog.tsx` (lines 417-464 only) |
| Modify | `src/i18n/locales/{en,el,de,fr,it,es}/fleet.json` (add 2 keys each) |
| Create | `supabase/migrations/[timestamp]_crm_hotfix_merge_duplicates.sql` |

Nothing else is touched.

