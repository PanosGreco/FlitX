

## Recurring Transactions Auto-Generation Fix

### Problem
`generateDueTransactions()` in `RecurringTransactionsModal.tsx` only runs on manual button click. No background processing exists.

### Implementation Steps

**1. Create Edge Function `supabase/functions/process-recurring-transactions/index.ts`**
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS and process all users
- Queries `recurring_transactions` where `is_active = true` AND `next_generation_date <= today`
- For each rule, runs catch-up loop (mirrors lines 269-339 of RecurringTransactionsModal):
  - Generates `financial_records` for each missed cycle
  - Duplicate prevention: checks `source_section = 'recurring'` + date + category + amount + type + user_id
  - Advances `next_generation_date` via `calculateNextDate` logic
  - Updates `last_generated_date`
  - Deactivates rules past `end_date`
  - Safety cap: 100 iterations per rule
- Joins `vehicles` table for `vehicle_fuel_type` and `vehicle_year`
- Copies `income_source_type`, `income_source_specification`, `expense_subcategory` to generated records
- `verify_jwt = false` in config.toml; secured by checking `Authorization: Bearer SERVICE_ROLE_KEY`

**2. Set up hourly pg_cron schedule (via database insert tool)**
- Enable `pg_cron` and `pg_net` extensions
- Schedule `process-recurring-transactions-hourly` at `0 * * * *`
- Calls the edge function URL with service role key in Authorization header

**3. Add frontend fallback auto-trigger in `FinanceDashboard.tsx`**
- On mount (when `user` is available), invoke the edge function once via `supabase.functions.invoke('process-recurring-transactions')`
- Fire-and-forget; does not block UI
- Refreshes financial records after completion

**4. No changes to:**
- `RecurringTransactionsModal.tsx` (manual Generate button stays)
- `AddRecurringTransactionDialog.tsx`
- Database schema
- Category/aggregation/breakdown logic

### Files
| Action | File |
|--------|------|
| Create | `supabase/functions/process-recurring-transactions/index.ts` |
| DB Insert | pg_cron + pg_net extensions + hourly schedule |
| Modify | `src/components/finances/FinanceDashboard.tsx` (add auto-trigger on mount) |

