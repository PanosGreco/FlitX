

# Plan: Booking System — Consolidation, Bug Fixes & UX Improvements

## Part A: Delete Dead Code
- **Delete** `src/components/fleet/RentalBookingDialog.tsx` — it is not imported anywhere (confirmed by search). Only a comment in `useIncomeCategories.ts` mentions it; update that comment.

## Part B: Bug Fixes in `UnifiedBookingDialog.tsx`

**B1** — After the custom total input (line 722), add hint text: `<p className="text-xs text-muted-foreground mt-1">{t('fleet:booking_customTotalHint')}</p>`

**B2** — After line 361 (rate validation), add: `if (pricingMode === 'custom' && customTotalPrice <= 0) { toast.error(t('fleet:booking_setValidRate')); return; }`

**B3** — Add comment above `calculateRentalDays` (line 279): `// Same-day rental (start === end) = 1 day charge. This is intentional.`

**B4** — Add `image` to Vehicle interface (`image: string | null`) and to the select query on line 213.

## Part C: UX Improvements in `UnifiedBookingDialog.tsx`

**C1 — Inline Date Range Calendar**: Replace the two separate Popover date pickers (lines 526-588) with a single `<Calendar mode="range" selected={{ from: startDate, to: endDate }} onSelect={...} />` rendered inline after Customer Name. Disable past dates. Import `startOfDay` from date-fns.

**C2 — Grouped Time + Location**: Below the calendar, render a `bg-muted/30 rounded-lg p-3` container with two rows:
- "Pick-Up · 15 Apr" header + grid-cols-2 (time Select + location Input)
- "Drop-Off · 18 Apr" header + grid-cols-2 (time Select + location Input)

**C3 — Sticky Price Summary Bar**: Place as a sibling to the `<div className="pt-4">` DialogFooter block (around line 1017), NOT inside the `<div className="space-y-4">` form wrapper. This ensures `sticky bottom-0` actually sticks to the bottom of the `overflow-y-auto` DialogContent. Show `[X days] · €[total]` + Create button. Only visible when `rentalDays > 0 && selectedVehicleId`.

**C4 — Collapsible Sections**: `src/components/ui/collapsible.tsx` already exists (verified). Wrap 4 sections in `<Collapsible>`:
1. "Additional Costs" (insurance, dynamic costs, saved categories, VAT) — collapsed by default, badge with count
2. "Additional Information" — collapsed by default, badge with count
3. "Notes & Contract" — collapsed by default, dot indicator if content exists
4. "Payment & Fuel" — collapsed by default, payment status indicator

Always visible: Income Source, Customer Name, Date Range Calendar, Time/Location, Vehicle Selection, Pricing Mode.

**C5 — Rental Duration Badge**: Below the range calendar, show `Badge variant="secondary"` with `"Tue, Apr 15 → Fri, Apr 18 · 3 nights"`. If only start date: show "Select drop-off date" muted.

**C6 — Vehicle Quick-Info Card**: After vehicle selection, show compact card with vehicle image (40x40) or fallback icon, plus `Make Model · Plate · €XX/day`. Styled `bg-primary/5 rounded-md p-2 border border-primary/20`.

## Part D: Translation Keys

Add to all 6 locale `fleet.json` files:
- `booking_customTotalHint` — EN: "Additional costs below will be added to this amount"
- `booking_selectDropoff` — EN: "Select drop-off date"
- `booking_nights` — EN: "nights"
- `booking_additionalCostsSection` — EN: "Additional Costs"
- `booking_additionalInfoSection` — EN: "Additional Information"  
- `booking_notesContract` — EN: "Notes & Contract"
- `booking_paymentFuel` — EN: "Payment & Fuel"

With proper EL, DE, FR, IT, ES translations.

## Structure Detail for C3 (Sticky Bar Placement)

```text
<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">  ← scroll container
  <DialogHeader>...</DialogHeader>
  <>                                                                 ← formContent
    <div>
      <div className="space-y-4">
        ...all form fields...
      </div>
      <div className="pt-4">                                         ← existing footer
        <DialogFooter>...</DialogFooter>
      </div>
    </div>
    {/* Sticky bar as sibling AFTER the form div, still inside formContent */}
    {rentalDays > 0 && selectedVehicleId && (
      <div className="sticky bottom-0 bg-background border-t z-10 px-4 py-2">
        <div className="flex items-center justify-between">
          <span>{rentalDays} {days} · <span className="text-green-600 font-semibold">€{total}</span></span>
          <Button onClick={handleSaveBooking}>Create</Button>
        </div>
      </div>
    )}
  </>
</DialogContent>
```

## Files Modified
1. `src/components/booking/UnifiedBookingDialog.tsx` — all fixes + improvements
2. `src/components/fleet/RentalBookingDialog.tsx` — **DELETE**
3. `src/hooks/useIncomeCategories.ts` — update comment (remove RentalBookingDialog mention)
4. `src/i18n/locales/{en,el,de,fr,it,es}/fleet.json` — new translation keys

## Not Changed
- `handleSaveBooking`, `createDailyTasks`, all Supabase insert operations
- `VehicleDetails.tsx`, `CalendarView.tsx`, `CreateDialog.tsx`
- Pricing calculations, conflict detection logic
- Any component outside the booking flow

