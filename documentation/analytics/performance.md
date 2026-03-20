# Analytics — Performance Considerations

This document covers scaling behavior, current optimizations, and potential future improvements.

---

## 1. Data Fetching

### Current Approach
All `financial_records` are fetched in a single query without pagination:

```typescript
supabase.from('financial_records').select('*').order('created_at', { ascending: false })
```

**Scaling:** Works well up to ~1000 records (Supabase default row limit). Beyond 1000, the oldest records will be silently truncated.

### Vehicles
Vehicles are fetched twice (once by `Finance.tsx`, once by `FinanceDashboard.tsx`) with different field selections. This is a minor redundancy but avoids coupling the two components.

---

## 2. Client-Side Computation

### Memoized Computations

| Computation | Complexity | Dependencies |
|---|---|---|
| `filteredRecords` | O(n) filter | `financialRecords`, `timeframe`, `customRange` |
| `allTransactions` | O(n log n) sort | `financialRecords` |
| `vehicleProfitRanking` | O(n + v) aggregate + map | `financialRecords`, `vehicles` |
| `IncomeBreakdown` aggregation | O(n) per source/category | `filteredRecords` |
| `ExpenseBreakdown` aggregation | O(n) per category/subcategory | `filteredRecords` |

All use `useMemo` to avoid recalculation on unrelated re-renders.

### Chart Data Processing

| Function | Complexity | Notes |
|---|---|---|
| `getTimeBuckets()` | O(days_in_range) | Generates date intervals |
| `aggregateByTimeBuckets()` | O(records × buckets) | Assigns records to buckets |
| `aggregateCumulative()` | O(records × buckets) | Cumulative sum up to each bucket |
| `aggregateByCategory()` | O(records) | Single pass grouping |

For typical use cases (<5000 records, <365 buckets), this is <2M operations — well within browser capabilities.

### Sampling for Dense Charts
```typescript
// Month view: show every 3rd day if >15 data points
if (timeframe === 'month' && data.length > 15) {
  return data.filter((_, i) => i % 3 === 0 || i === data.length - 1);
}

// All time / custom: sample to ~15 points if >20
if (data.length > 20) {
  const step = Math.ceil(data.length / 15);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}
```

This prevents chart overcrowding without losing boundary data points.

---

## 3. Real-time Updates

**Current:** Full refetch on every `postgres_changes` event.

```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'financial_records' }, () => {
  fetchFinancialRecords(); // Full refetch
})
```

**Impact:** Each insert/update/delete triggers a full SELECT of all records. For users with many records, this could cause noticeable latency.

---

## 4. Asset Widget Debouncing

```typescript
const handleDebouncedUpsert = useCallback(
  (key: string, data) => {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => upsertAsset(data), 600);
  },
  [upsertAsset]
);
```

600ms debounce prevents rapid-fire DB writes during inline editing. Each input field has its own timer key, so editing multiple fields in parallel works correctly.

---

## 5. Recurring Transaction Processing

**Cap:** 100 iterations per rule per run prevents runaway generation.

**Frequency:** Hourly via pg_cron + frontend fallback on mount.

**Scaling:** For a user with 50 active rules, each requiring 1-2 iterations, processing takes <5 seconds. The cap prevents pathological cases.

---

## 6. AI Edge Function

**Data volume:** Fetches ALL records for the user (no pagination). For users with thousands of bookings, this could be slow.

**Context window:** The formatted context string can be very large for fleet operators with many vehicles. The AI model (Gemini 3 Flash Preview) has a large context window, so this is typically not a bottleneck.

**Computation:** `computeFinancialContext()` does O(vehicles × bookings) work for per-vehicle breakdowns. For 50 vehicles × 500 bookings, this is ~25K operations — negligible.

---

## 7. Known Bottlenecks

| Area | Bottleneck | Severity | Mitigation |
|---|---|---|---|
| Record fetching | 1000 row limit | Medium (for heavy users) | Pagination needed |
| Real-time updates | Full refetch per event | Low (for typical use) | Incremental updates |
| Duplicate checks | Per-record SELECT in recurring loop | Low | Batch check possible |
| Vehicle fetch duplication | Two components fetch separately | Negligible | Could lift to shared context |

---

## 8. Future Optimization Opportunities

1. **Server-side aggregation:** Move summary calculations (totalIncome, totalExpenses) to a Postgres function or view for large datasets
2. **Pagination for transaction list:** Load in batches of 50-100 instead of all at once
3. **Incremental real-time updates:** Instead of full refetch, merge the changed record into existing state
4. **Batch duplicate prevention:** For recurring transactions, check all dates in a single query instead of one-by-one
5. **Computed columns or materialized views:** For frequently accessed aggregations like monthly totals
6. **Virtual scrolling:** For the transaction list and chart data when datasets are large
