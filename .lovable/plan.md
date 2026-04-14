

# Plan: CRM Phase 1 — Database Foundation

## Summary
Create one migration file with the `customers` table, `accidents` table, new columns on `rental_bookings`, back-fill triggers, and historical data migration. Update two documentation files. No code changes.

## Migration SQL

The migration will contain exactly the SQL from the prompt, in order:

1. **Part A** — `CREATE TABLE public.customers` with RLS (4 policies), `updated_at` trigger, indexes, comments
2. **Part B** — `ALTER TABLE public.rental_bookings` adding `customer_id`, `booking_number`, `customer_type`, `insurance_type_id` with indexes, comments, and CHECK constraint on `customer_type`
3. **Part C** — `CREATE TABLE public.accidents` with RLS (4 policies), `updated_at` trigger, indexes, comments, CHECK constraints on `payer_type` and `amounts_sum_check`
4. **Part D** — Three trigger functions: `sync_accident_denorm_fields`, `recompute_customer_accident_totals`, `recompute_customer_booking_totals`
5. **Part E** — Back-fill: assign `booking_number` to existing bookings, add UNIQUE + NOT NULL constraints, auto-generate trigger, create `customers` from grouped booking data, back-fill `customer_id` and `insurance_type_id` on bookings

**Note on CHECK constraints**: The `amounts_sum_check` and `valid_payer_type` constraints are purely arithmetic/value checks (not time-dependent), so CHECK constraints are appropriate here per the guidelines.

**Note on `auth.users` FK**: The `customers.user_id` and `accidents.user_id` both reference `auth.users(id) ON DELETE CASCADE`. This is acceptable because these are ownership references, not profile data references — and the prompt explicitly specifies this.

## Documentation Updates

1. **`documentation/architecture/crm-roadmap.md`** — Append a new section at the bottom: "## 5. Phase 2 Status" noting that the CRM database foundation (customers table, accidents table, booking numbers, data migration) was executed on 2026-04-14.

2. **`documentation/data-management/gdpr-compliance.md`** — Add `customers` and `accidents` to the "Tables Missing from Account Deletion" table with appropriate risk levels (High for customers due to PII, Medium for accidents).

## Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/[timestamp]_crm_foundation.sql` |
| Modify | `documentation/architecture/crm-roadmap.md` |
| Modify | `documentation/data-management/gdpr-compliance.md` |

No `.tsx`, `.ts`, or other source files will be touched.

## Potential Concerns

- The back-fill query in Step E5 uses correlated subqueries which may be slow on large datasets, but is correct and runs once.
- The `booking_number` NOT NULL + UNIQUE constraint is added *after* back-fill, which is the correct order.
- The `recompute_customer_booking_totals` trigger fires on `rental_bookings` INSERT/UPDATE/DELETE — the back-fill UPDATE in E6 will trigger it, but since customers are freshly created with correct aggregates, the recomputation will produce the same values (harmless).

