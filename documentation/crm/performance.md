# CRM — Performance & Scaling

## 1. Query Inventory

On a single CRM page mount, the following queries fire (all RLS-scoped):

| Source | Query | Frequency |
|---|---|---|
| `useCustomers` | `SELECT customers` (single row per customer) | Once + on `refresh()` |
| `useCustomers` | `SELECT rental_bookings (customer_id, customer_type, vehicle_id, vehicles(type)) WHERE customer_id IN (…)` | Same |
| `useCustomers` | `SELECT accidents (customer_id, total_damage_cost) WHERE customer_id IN (…)` | Same |
| `useCRMChartData` | `SELECT accidents JOIN rental_bookings JOIN insurance_types` | Once per user-change |
| `useCRMChartData` | `SELECT customers (id, birth_date, city, country, country_code)` | Same |
| `useCRMChartData` | `SELECT booking_additional_costs WHERE name='Insurance'` | Same |
| `useCRMChartData` | `SELECT rental_bookings (customer_type, vehicles(type))` | Same |
| `AccidentHistory` | `SELECT accidents JOIN rental_bookings JOIN customers JOIN vehicles ORDER BY accident_date DESC` | Once + when `refreshKey` changes |
| `AddAccidentDialog` (open) | `SELECT rental_bookings JOIN vehicles ORDER BY start_date DESC` | Once per dialog open |

**Total cold-start round trips:** ~8 SELECTs.

## 2. Supabase 1000-Row Default Limit

All CRM SELECTs are subject to PostgREST's **1000-row default limit**. For typical fleets (≤500 customers, ≤2000 bookings, ≤200 accidents) this is a non-issue. Beyond those thresholds:

| Table | Risk threshold | Mitigation when reached |
|---|---|---|
| `customers` | >1000 active customers | Add `.range()` pagination in `useCustomers` and switch the table to server-side pagination. |
| `rental_bookings` | >1000 bookings (chart hook + customers hook both fetch) | Add aggregate views (`customer_type` counts) to the DB and select pre-aggregated rows. |
| `accidents` | >1000 accidents | Filter the chart query to last 12 months (`accident_date >= now() - interval '12 months'`). |

Today's `useCustomers` does NOT paginate — the full set is loaded so client-side filtering can produce instant results without round-tripping. This is the right choice for the current scale.

## 3. Filter Performance

Filtering happens in `useMemo` over the in-memory `customers` array. Even with 1000 rows, the filter loop is O(N) and runs in <5 ms. **No queries fire on filter changes.** This is the largest single perf win of the current architecture.

## 4. Sort & Pagination

Sorting and pagination in `CustomerTable` are local — they operate on the already-filtered array. Sorts on string columns use `String#localeCompare`, on numeric and date columns use direct comparisons. All O(N log N) on a small set.

## 5. Chart Computation

Each chart memo in `useCRMChartData` is O(rows). The "Other" bucketing pass is O(distinct names). Recharts re-renders only when its `data` prop changes referentially — the `useMemo` outputs guarantee that.

## 6. Image Upload Path (Damage Linkage)

When the damage toggle is ON and N photos are attached:
1. N × `compressImage` (CPU, sequential — typical: ~150 ms per 4 MP photo).
2. N × storage upload (network, sequential).
3. 1 × `damage_reports` INSERT.

Photos are processed sequentially in the current implementation. For large batches (>10 photos) consider parallelising with `Promise.all` over the per-file pipeline. Keep RLS path scoping intact (`{vehicleId}/...`).

## 7. Trigger Cost

The triggers `recompute_customer_booking_totals` and `recompute_customer_accident_totals` execute a single `UPDATE customers ...` per affected customer per write. Each runs aggregate queries scoped to one `customer_id`, which is indexed via the FK. Cost is sub-millisecond at any realistic fleet size.

## 8. Caching

CRM uses no client-side cache (no React Query, no SWR). State is held in component/hook closures. Re-mounting the page re-fetches. The trade-off is simplicity at the cost of one extra round-trip on navigation away/back. At current scale this is invisible.

If/when CRM is upgraded to React Query, the cache key set should be:
- `['crm', 'customers', userId]`
- `['crm', 'chart-data', userId]`
- `['crm', 'accident-history', userId, refreshKey]`

## 9. Cold-Start Budget

For a typical fleet (50 customers, 200 bookings, 20 accidents), the page is interactive within ~400–600 ms on a warm Supabase connection: ~150 ms for the parallel SELECTs, ~50 ms for client aggregation, ~200 ms for chart layout/Recharts mount.

## 10. Monitoring Suggestions

If CRM ever feels slow:
1. Check the Supabase Logs for any single SELECT exceeding 200 ms — usually a missing index on `(user_id, customer_id)` or `(user_id, booking_id)`.
2. Check `useCustomers` payload size in the Network tab — if >500 KB on a small fleet, a denormalised `vehicles` join is over-fetching.
3. Confirm RLS policies are using the indexed column (`user_id`) and not a function call that bypasses indexes.
