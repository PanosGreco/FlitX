

# Income and Expense Category System Refactor

## Overview

This refactor renames "Walk-In" to "Direct Booking", removes Phone and Internet sources, redesigns "Other" to create autonomous categories, and applies the same logic to both regular and recurring transactions -- while keeping them isolated.

---

## Part A -- Rename "Walk-In" to "Direct Booking"

The internal DB key `walk_in` stays unchanged for backward compatibility. Only the display label changes across all files:

- `IncomeBreakdown.tsx` -- INCOME_SOURCE_LABELS
- `FinanceDashboard.tsx` -- sourceLabels
- `RecurringTransactionsModal.tsx` -- labels
- `Finance.tsx` -- dropdown options
- `AddRecurringTransactionDialog.tsx` -- dropdown options
- `UnifiedBookingDialog.tsx` -- dropdown options
- `RentalBookingDialog.tsx` -- dropdown options

**English**: "Walk-in" becomes "Direct Booking"
**Greek**: "Επιτόπια" / "Επί τόπου" becomes "Απευθείας Κράτηση"

---

## Part B -- Remove Phone and Internet

**Database migration**: Update 15 existing historical records (`phone`: 3, `internet`: 12) by setting their `income_source_type` to `walk_in` (Direct Booking).

**UI removal**: Remove `phone` and `internet` SelectItem entries from all 5 dropdown locations listed above. Remove their entries from all label maps.

---

## Part C -- Redesign "Other" for Income (Non-Recurring)

### New behavior

When user selects "Other" and types a custom name (e.g., "Marketing"):
- Save `income_source_type = 'other'` and `income_source_specification = 'Marketing'` (same DB fields -- no schema change needed)
- Display as **"Marketing"** (not "Other (Marketing)")

### Dynamic dropdown with user-created categories

In `Finance.tsx` Add Record dialog:
1. Query `financial_records` for distinct `income_source_specification` values where `income_source_type = 'other'` and `source_section = 'manual'`
2. Show dropdown structure:
   - Direct Booking
   - Collaboration
   - [User-created categories from DB]
   - Other (always last)

When a user-created category is selected, auto-set `income_source_type = 'other'` and `income_source_specification` to the selected value.

### Display in IncomeBreakdown

Update the aggregation logic in `IncomeBreakdown.tsx`:
- For `sourceType === 'other'` with a specification, use the specification as the standalone display label (e.g., "Marketing") instead of "Other (Marketing)"
- Accumulation into the same category key remains unchanged

### Edge cases
- Case-insensitive duplicate prevention (trim + lowercase comparison)
- Empty names blocked
- Reuse existing category if it already exists

---

## Part D -- Same Logic for Expenses (Non-Recurring)

Apply identical autonomous category behavior to expenses:

In `Finance.tsx` when `expenseCategory === 'other'`:
1. Query `financial_records` for distinct `expense_subcategory` values where `category = 'other'` and `type = 'expense'`
2. Show known user-created expense categories as selectable options above the free-text "Other" option
3. Display in `ExpenseBreakdown.tsx` as standalone categories (not "Other (X)")

---

## Part E -- Recurring Transactions (Isolated)

Apply same logic to `AddRecurringTransactionDialog.tsx` but query from `recurring_transactions` table instead, keeping categories isolated:

- **Recurring Income**: Query distinct `income_source_specification` from `recurring_transactions` where `type = 'income'` and `income_source_type = 'other'`
- **Recurring Expense**: Query distinct `expense_subcategory` from `recurring_transactions` where `type = 'expense'` and `category = 'other'`

Categories created in recurring do NOT appear in non-recurring dropdowns and vice versa.

---

## Part F -- Reporting and Breakdown Updates

- `IncomeBreakdown.tsx`: Update display labels so "Other" specs show as standalone names
- `ExpenseBreakdown.tsx`: Same treatment for expense "other" subcategories  
- `FinanceDashboard.tsx`: Update sourceLabels map, remove phone/internet references
- Pie charts, percentage calculations, and the less-than-5% grouping rule remain untouched

---

## Database Changes

**One migration needed**: Reassign historical phone/internet records to walk_in:

```text
UPDATE financial_records 
SET income_source_type = 'walk_in' 
WHERE income_source_type IN ('phone', 'internet');
```

No new tables or columns needed -- the existing `income_source_specification` and `expense_subcategory` fields already support this pattern.

---

## Files Modified

| File | Changes |
|------|---------|
| `Finance.tsx` | Rename labels, remove phone/internet, add dynamic category fetching for income and expense "Other" |
| `UnifiedBookingDialog.tsx` | Rename labels, remove phone/internet from dropdown |
| `RentalBookingDialog.tsx` | Rename labels, remove phone/internet from dropdown |
| `IncomeBreakdown.tsx` | Rename labels, update display logic for "other" specs as standalone |
| `ExpenseBreakdown.tsx` | Update display for "other" subcategories as standalone |
| `FinanceDashboard.tsx` | Rename labels, remove phone/internet from maps |
| `AddRecurringTransactionDialog.tsx` | Rename labels, remove phone/internet, add isolated dynamic categories |
| `RecurringTransactionsModal.tsx` | Rename labels, remove phone/internet |

