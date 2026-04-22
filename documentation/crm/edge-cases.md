# CRM — Edge Cases & Safeguards

## 1. Empty States

| Scenario | Behavior |
|---|---|
| No customers yet | Table shows centered "No customers yet" empty state with `Users` icon. Filter bar still renders but the amount slider falls back to a max of `1000`. Charts render their own empty states (see below). |
| No accidents at all | `AccidentByAgeChart` shows "No accident data" hint. `InsuranceProfitabilityChart` shows revenue-only bars where insurance was sold but never claimed. `AccidentHistory` shows "No accidents recorded". |
| No location data on any customer | `LocationDistributionChart` Countries/Cities pies show "Add country/city info to bookings to see distribution" hint. The Customer Types pie may still render if any booking has a `customer_type`. |
| No insurance bookings | `InsuranceProfitabilityChart` shows "No insurance data" hint. |
| Filters return zero matches | Table shows "No matching customers" with a hint to adjust filters. Charts are unaffected (they describe the full population). |

## 2. Accident Dialog Validation

The Save button is disabled when ANY of:
- `isLoading`
- `!selectedBookingId` — no booking picked
- `!description.trim()`
- `totalDamageCost <= 0`
- `addDamageEntry && !damageCategory` — damage toggle ON but no zone picked

For the `split` payer type, a soft warning appears if the three amounts don't sum to `total_damage_cost` (within €0.01). The save is still allowed — the user may intentionally record a partial split.

## 3. Damage-Linkage Failure Modes

The damage-creation block runs **after** the accident insert succeeds. Possible failures and behavior:

| Failure | Outcome |
|---|---|
| Selected booking has no `vehicle_id` (data anomaly) | Damage block is skipped silently. Accident is saved. |
| File >10 MB | That file is skipped (`validateFileSize`); other files in the batch continue. |
| `compressImage` throws | The original file is uploaded as-is (warning logged). |
| Storage upload error on a single file | That file is skipped (warning logged); remaining files continue. |
| `damage_reports` INSERT fails | Toast: "Accident saved, but damage entry could not be created…". Accident is **NOT rolled back** — it remains in `accidents` and `customers.total_accidents_*` reflects it. |
| Storage upload error on every file AND insert succeeds with empty `images: []` | Damage row is created without photos. User can re-upload from Fleet → Damages later. |

This non-blocking design preserves the primary record (the accident) under any I/O failure.

## 4. Customer Identity Edge Cases

- **Same name, different person**: Two real-world customers with the same `name` will collapse into one `customers` row. Operators are advised to disambiguate via the booking dialog (email/phone). Fixing already-merged records requires manual SQL.
- **Customer has no `birth_date`**: They never appear in any age bucket. Their accidents still count toward totals but not toward the age chart.
- **Customer with NO bookings** (orphan): Cannot exist in the current flow — customers are created from bookings. If one ever exists (manual insert), it shows `total_bookings_count = 0` and `total_lifetime_value = 0` and is filterable but unsortable into useful positions.
- **Booking with `customer_id = NULL`** (legacy or deleted customer): Still shows in `AccidentHistory` via `customer_name` denormalisation but contributes nothing to `customers` aggregates.

## 5. Currency / Number Edge Cases

- All money values are stored as `numeric` and converted via `Number()` on the client. `null` defaults to `0`.
- The amount-range slider's max is recomputed from the data; if all customers have `0` lifetime value, the max is `1000` (default) so the slider is still usable.

## 6. Date Edge Cases

- `accident_date` defaults to today, stored as a date (timezone-agnostic).
- Filter "last booking from/to" is inclusive on both ends.
- A customer whose last booking is in the future (advance reservation) still satisfies any range whose `to` is later.

## 7. Filter Combinations

- Selecting a country filters the city combobox to only that country's cities. If a city was already selected and the chosen country doesn't contain it, the city stays selected (and yields zero matches) — operator must clear it manually. **Future improvement candidate.**
- Customer-types filter is OR-within-list (any match passes), AND-with-other-filters.

## 8. Photo Upload Constraints

- 10 MB hard limit per file (`validateFileSize`).
- All images compressed via `compressImage` before upload (`mem://technical-decisions/file-upload-and-compression-policy`).
- `contentType` is explicitly set on `storage.from('damage-images').upload()` — required to prevent Chrome blocking PDF/HEIC fallbacks (`mem://technical-decisions/storage-upload-metadata-requirement`).
- Storage path is namespaced by `vehicle_id`: `{vehicleId}/{timestamp}_{i}.{ext}` so RLS path-prefix policies on the bucket apply identically to damages created from CRM and from Fleet.

## 9. Chart Pie Labels

`LocationDistributionChart` previously had its percentage labels clipped by sub-headers. The fix uses `cy="55%"` on each `Pie`, explicit `<PieChart margin>`, and `overflow-visible` on the chart container. If labels ever clip again after a Recharts upgrade, revisit this combination first.

## 10. RLS Failures

All CRM queries scope by `auth.uid()` via RLS. If a query unexpectedly returns 0 rows for an authenticated user with data, the most likely cause is a session/JWT issue — not a logic bug. Check `useAuth().user` first.

## 11. Trigger Drift

If a future migration disables one of the recompute triggers, `customers` aggregate columns will go stale. CRM has no client-side "rebuild totals" path. The recovery is a one-shot SQL recompute migration. Always restore the triggers after any maintenance work on `rental_bookings` or `accidents`.
