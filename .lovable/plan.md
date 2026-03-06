

## Revised Plan: Automatic VAT / Income Tax Handling

### Target Files
- `src/hooks/useVatSettings.ts` (new) — localStorage-based VAT rate persistence
- `src/components/finances/VatControl.tsx` (new) — reusable checkbox + rate input
- `src/pages/Finance.tsx` — add VAT control to income form, auto-generate tax expense
- `src/components/booking/UnifiedBookingDialog.tsx` — add VAT control below Additional Costs
- `src/components/fleet/RentalBookingDialog.tsx` — add VAT control below Additional Costs

### No Database Changes
The VAT rate is stored in `localStorage` (key: `fleetx_vat_rate`). No new tables, no schema modifications.

---

### 1. VAT Rate Storage — `useVatSettings` Hook

New file: `src/hooks/useVatSettings.ts`

- Reads/writes `localStorage.getItem('fleetx_vat_rate')`
- Returns `{ vatRate: number, setVatRate: (rate: number) => void }`
- Default: `10` if no stored value
- When user edits the rate and submits a form, the new rate is saved to localStorage automatically

---

### 2. VAT UI Component — `VatControl`

New file: `src/components/finances/VatControl.tsx`

UI when unchecked:
```
☐ Apply VAT
```

UI when checked:
```
☑ Apply VAT
Rate: [ 10 ] %
```

Props: `{ vatEnabled, onVatEnabledChange, vatRate, onVatRateChange }`

The rate input only appears when the checkbox is enabled.

---

### 3. Integration — Finance.tsx (Analytics Add Record)

When `recordType === 'income'`, render `<VatControl />` below the Notes field, before DialogFooter.

On submit, if VAT is enabled:
1. Insert the income record as normal
2. Calculate `vatAmount = amount * (vatRate / 100)`
3. Insert a second record:
   - `type: 'expense'`
   - `category: 'tax'`
   - `expense_subcategory: 'Income Tax'`
   - `amount: vatAmount`
   - `date: same as income`
   - `description: 'Income Tax (VAT {rate}%) - auto'`
   - `source_section: 'vat_auto'`
   - `vehicle_id: same if applicable`
4. Save the rate to localStorage

---

### 4. Integration — UnifiedBookingDialog

Render `<VatControl />` below the Additional Costs section.

On booking submit, if VAT is enabled:
- VAT applies to the **total booking amount** (base rental + all additional costs)
- `vatAmount = totalAmount * (vatRate / 100)`
- Insert expense record with same fields as above, plus `booking_id`

---

### 5. Integration — RentalBookingDialog

Same pattern as UnifiedBookingDialog. VAT applies to the full `totalAmount` which already includes additional costs.

---

### 6. Anti-Recursion Guarantee

All VAT auto-generated records use `source_section: 'vat_auto'`. The VAT checkbox only appears on income creation forms. Since auto-generated VAT records are expenses (not income), they can never trigger the VAT checkbox flow. There is no code path where an expense record could re-trigger VAT generation.

---

### 7. What Does NOT Change

- Database schema — no new tables, no column changes
- `financial_records` structure — only new rows inserted
- Analytics aggregation, cumulative charts, expense breakdown
- Transaction history display (VAT records appear naturally as tax expenses)
- Category system, recurring transactions, existing booking logic

