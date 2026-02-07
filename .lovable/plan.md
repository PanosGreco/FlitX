

# Fix Recurring Income & Expense Logic and UI Display

## Overview

This plan addresses six areas: catch-up generation logic, end date support, card display improvements (category-first titles, emoji removal), completed state display, and deletion behavior hardening. No changes to finance calculations, aggregation logic, or other UI elements.

---

## 1. Database Migration: Add `end_date` Column

Add an optional `end_date` column to the `recurring_transactions` table.

```sql
ALTER TABLE public.recurring_transactions
ADD COLUMN end_date date DEFAULT NULL;
```

This column is nullable -- when null, the recurring transaction continues indefinitely (preserving current behavior).

---

## 2. Generation Logic Fix: Catch-Up for Missed Cycles

**File:** `src/components/finances/RecurringTransactionsModal.tsx` -- `generateDueTransactions()`

**Current problem:** Only generates ONE transaction per click, even if multiple cycles have been missed.

**Fix:** Replace the single-pass generation with a `while` loop that keeps generating transactions for each missed interval until `next_generation_date > today`.

**New logic (pseudocode):**

```text
for each due recurring transaction:
  while (next_generation_date <= today):
    -- Check end_date: if end_date exists and next_generation_date > end_date, stop
    -- Insert financial_record with date = next_generation_date
    -- Calculate new_next_date from next_generation_date + frequency
    -- Update last_generated_date = next_generation_date
    -- Update next_generation_date = new_next_date
    -- Increment counter
  -- If end_date passed and all cycles generated, mark is_active = false
```

**Safeguards:**
- Before inserting each financial record, query `financial_records` to check no duplicate exists for the same recurring rule date + category + amount + source_section='recurring'. This prevents double-generation if the user clicks "Generate" multiple times quickly.
- The while loop processes all missed cycles in one click, not just one.
- `next_generation_date` is never advanced without a corresponding `financial_records` insert succeeding first.
- `last_generated_date` is only updated after a successful insert.

---

## 3. First-Time Creation: End Date Support

**File:** `src/components/finances/AddRecurringTransactionDialog.tsx`

### 3a. Add End Date Step

Insert a new optional step after "Start Date" called "End Date":

- New step added to the wizard: `'end_date'` between `'date'` and `'frequency'`
- Step sequence becomes: `type -> date -> end_date -> frequency -> amount -> details -> vehicle`
- The end date input is optional (can be skipped)
- State: `const [endDate, setEndDate] = useState<string>('')`
- Validation: if provided, end date must be >= start date

### 3b. Submit Logic Update

When submitting, include `end_date` in the `recurring_transactions` insert if provided:

```typescript
if (endDate) {
  record.end_date = endDate;
}
```

The first-time immediate generation logic stays exactly the same -- it already correctly:
- Generates one transaction if `start_date <= today`
- Sets `last_generated_date = start_date`
- Advances `next_generation_date` to the next cycle

---

## 4. Completed Recurring State

### 4a. Fetch Logic Change

**File:** `src/components/finances/RecurringTransactionsModal.tsx`

Currently, the modal only fetches `is_active = true` records. Change this to fetch ALL recurring transactions (remove the `.eq('is_active', true)` filter) so that completed items are also visible.

### 4b. Auto-Completion in Generation

During the catch-up generation loop (from section 2), after advancing `next_generation_date`:
- If `end_date` exists and the new `next_generation_date > end_date`, set `is_active = false` on the `recurring_transactions` record
- This marks it as "completed"

### 4c. Visual Display of Completed Items

In the recurring cards list, for items where `is_active === false`:
- Add a "Completed" badge/label (green for income, muted for expense)
- Apply reduced opacity styling (`opacity-60`)
- English: "Completed" / Greek: "Ολοκληρώθηκε"
- The delete button remains available for completed items
- Completed items are displayed at the bottom of each column (income/expense)

### 4d. Hide Generate Button Awareness

Completed items (`is_active = false`) are naturally excluded from generation since the `generateDueTransactions` function only processes `is_active = true` records.

---

## 5. UI Display Changes for Recurring Cards

**File:** `src/components/finances/RecurringTransactionsModal.tsx`

### 5a. Category-First Title

Replace the current card title logic:

**Before:**
```tsx
<p className="font-medium text-sm truncate">
  {t.description || 'Income'/'Expense'}
</p>
```

**After:**
```tsx
<p className="font-medium text-sm truncate">
  {getCategoryLabel(t.category, t.type, language)}
</p>
{t.description && (
  <p className="text-xs text-muted-foreground truncate">
    {t.description}
  </p>
)}
```

Add a helper function `getCategoryLabel()` that maps category keys to localized labels:

| Key | English | Greek |
|-----|---------|-------|
| sales | Sales | Πωλήσεις |
| fuel | Fuel | Καύσιμα |
| maintenance | Maintenance | Συντήρηση |
| vehicle_parts | Vehicle Parts | Ανταλλακτικά |
| carwash | Car Wash | Πλύσιμο |
| insurance | Insurance | Ασφάλεια |
| tax | Taxes/Fees | Φόροι/Τέλη |
| salary | Salaries | Μισθοί |
| marketing | Marketing | Μάρκετινγκ |
| other | Other | Άλλο |
| cleaning | Cleaning | Καθαρισμός |
| docking | Docking | Ελλιμενισμός |
| licensing | Licensing | Άδειες |

For income cards, use the `income_source_type` label if available (e.g., "Sales - Walk-in"), and for maintenance expenses, append the subcategory (e.g., "Maintenance - Oil Change").

### 5b. Remove Vehicle Emoji

**Before (line 371-373 and 419-422):**
```tsx
<p className="text-xs text-muted-foreground truncate">
  🚗 {getVehicleName(t.vehicle_id)}
</p>
```

**After:**
```tsx
<p className="text-xs text-muted-foreground truncate">
  {getVehicleName(t.vehicle_id)}
</p>
```

Simply remove the `🚗` emoji from both income and expense card sections. Vehicle linkage logic stays unchanged.

---

## 6. Deletion Behavior (Already Correct)

The current deletion logic is already correct:
- Permanently deletes the `recurring_transactions` row
- Does NOT delete already-generated `financial_records`
- Shows confirmation dialog with clear messaging
- After deletion, the rule never generates again

No changes needed here -- just confirming the behavior matches requirements.

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database migration** | Add `end_date` column to `recurring_transactions` |
| `src/components/finances/AddRecurringTransactionDialog.tsx` | Add end date step, include `end_date` in submit, add `endDate` state |
| `src/components/finances/RecurringTransactionsModal.tsx` | Catch-up loop in `generateDueTransactions()`, fetch all (not just active), category-first titles, remove emoji, completed state display, auto-deactivation |

---

## Technical Notes

- The `RecurringTransaction` interface in `RecurringTransactionsModal.tsx` needs to be updated to include `end_date?: string | null`
- The Supabase types file (`types.ts`) will auto-update after the migration runs
- Duplicate prevention uses a pre-insert check: query `financial_records` for matching `date + category + amount + source_section + vehicle_id` before inserting
- The while loop in generation has a safety counter (max 100 iterations) to prevent infinite loops from data corruption

