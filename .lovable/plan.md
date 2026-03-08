

## Updated Plan: Analytics Line Graph — Cumulative Data & UI Corrections

### Target File
`src/components/finances/charts.tsx` — only the `LineChart` component and supporting functions. `BarChart`, `PieChart`, and `CategoryBreakdown` remain untouched.

### Confirmed: No Other Charts Affected
- `BarChart` (line 205) uses `aggregateByTimeBuckets` — will continue to use it unchanged.
- `PieChart` (line 388) uses `aggregateByCategory` — completely separate.
- `CategoryBreakdown` (line 463) — unrelated display component.
- The new `aggregateCumulative` function will only be called by `LineChart`.

---

### Change 1 — Update `getTimeBuckets` with Adaptive Custom Range Scaling

Current behavior (lines 71–102): `all` and `custom` only distinguish daily (≤31 days) vs monthly (>31 days).

New behavior — replace the branching logic for `all` and `custom`:

| Range Length | Bucket Type | Label Format |
|---|---|---|
| 1–31 days | Daily | `d MMM` |
| 32–120 days | Weekly | `d MMM` (week start) |
| 121 days – 12 months | Monthly | `MMM yy` |
| `all` timeframe | Always monthly | `MMM yy` |

Implementation: compute `daysDiff`, then call `eachDayOfInterval`, `eachWeekOfInterval`, or `eachMonthOfInterval` accordingly. For `all`, always use monthly.

---

### Change 2 — New `aggregateCumulative` Function

Create a new function that replaces `aggregateByTimeBuckets` for the LineChart only.

Algorithm:
```text
buckets = getTimeBuckets(timeframe, lang, records)

For each bucket at index i:
  bucket_end = end of bucket's date (endOfDay for daily, end of week for weekly, end of month for monthly)
  
  income_total = SUM(all income records where record.date <= bucket_end)
  expense_total = SUM(all expense records where record.date <= bucket_end)
  netIncome = income_total - expense_total

  return { name: bucket.label, income: income_total, expenses: expense_total, netIncome }
```

Key guarantees:
- Uses `date <= bucket_end`, not "records inside bucket" — ensures correct cumulative totals regardless of bucket grouping.
- If no new records exist for a bucket, cumulative totals equal the previous bucket's totals — lines stay flat/horizontal automatically since the SUM result is identical.

---

### Change 3 — Remove All Sampling Logic from LineChart

Remove lines 283–292 (the `filter` calls that sample every 3rd day or every Nth point). Bucket grouping (daily/weekly/monthly) already controls point density — no sampling needed.

---

### Change 4 — Rename "Revenue" → "Net Income"

- Data key: `revenue` → `netIncome`
- `getLineName`: `'revenue'` case → `'netIncome'`, label: `'Net Income'` / `'Καθαρό Εισόδημα'`
- Empty state object: `revenue: 0` → `netIncome: 0`

---

### Change 5 — Fix Line Colors

| Line | Current | New |
|---|---|---|
| Income | `#f59e0b` (amber) | `#22c55e` (green) |
| Expenses | `#ef4444` (red) | `#ef4444` (unchanged) |
| Net Income | `#3b82f6` (blue) | `#3b82f6` (unchanged) |

---

### Change 6 — Fix Currency to Always Use €

- `formatYAxis` (line 197): always use `€` regardless of `lang`.
- `LineChart` tooltip (line 332): always use `€`.
- Format: `{value}€` (euro at end) for consistency with SOLD block.

---

### Change 7 — Tooltip Reads Cumulative Data

The tooltip formatter reads directly from the cumulative dataset produced by `aggregateCumulative`. Each data point already contains cumulative `income`, `expenses`, and `netIncome` — the tooltip simply displays these values with the `€` symbol. No additional calculation needed.

---

### What Does NOT Change
- `BarChart` — keeps using `aggregateByTimeBuckets` with its own sampling
- `PieChart` — keeps using `aggregateByCategory`
- `CategoryBreakdown` — unchanged
- Database schema, financial records, summary cards, transaction history
- All other analytics components

