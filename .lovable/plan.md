

# Plan: Add Secondary KPI Metric Cards (Total Bookings, Avg Income/Booking, Avg Cost/Booking)

## Overview
Add a row of three secondary metric cards below the primary Income/Expense/Net Income summary cards. These show booking-centric KPIs filtered by the selected timeframe.

## Changes

### 1. `src/components/finances/FinanceDashboard.tsx`

**Data fetching:**
- Add `RentalBooking` interface (`id`, `start_date`, `end_date`, `status`, `total_amount`)
- Add `bookings` state
- Add `fetchBookings` function querying `rental_bookings` table
- Call `fetchBookings()` in the existing `useEffect` alongside `fetchVehicles()`

**KPI calculations (useMemo):**
- Import `getCalendarDateRange` from `@/utils/dateRangeUtils`
- `periodBookings`: filter bookings by `start_date` within selected timeframe
- `totalBookings`: count of period bookings
- `avgIncomePerBooking`: sum of `filteredRecords` where `type === 'income' && booking_id` divided by `totalBookings`
- `avgCostPerBooking`: sum of all expenses in `filteredRecords` divided by `totalBookings`

**UI — new card row (after line 598, before charts):**
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  <KpiCard label={t('totalBookings')} value={totalBookings} format="number" icon="calendar" lang={language} />
  <KpiCard label={t('avgIncomePerBooking')} value={avgIncomePerBooking} format="currency" icon="trendingUp" accentColor="green" lang={language} />
  <KpiCard label={t('avgCostPerBooking')} value={avgCostPerBooking} format="currency" icon="trendingDown" accentColor="red" lang={language} />
</div>
```

**New `KpiCard` component** (at bottom of file):
- Dashed border (`border-dashed border-muted-foreground/20`) — visually secondary
- Smaller value text (`text-xl`)
- Icon in a circular muted container on the right
- Colored value text (green for income, red for cost, primary for bookings)
- No trend badge

### 2. Translation files (6 locales)

Add three keys to each `finance.json`:

| Key | EN | EL | DE | FR | IT | ES |
|---|---|---|---|---|---|---|
| `totalBookings` | Total Bookings | Συνολικές Κρατήσεις | Gesamtbuchungen | Total Réservations | Prenotazioni Totali | Reservas Totales |
| `avgIncomePerBooking` | Avg Income / Booking | Μ.Ο. Εσόδων / Κράτηση | Ø Einnahmen / Buchung | Revenu Moy. / Réservation | Entrata Media / Prenotazione | Ingreso Prom. / Reserva |
| `avgCostPerBooking` | Avg Cost / Booking | Μ.Ο. Κόστους / Κράτηση | Ø Kosten / Buchung | Coût Moy. / Réservation | Costo Medio / Prenotazione | Costo Prom. / Reserva |

## Files Modified
1. `src/components/finances/FinanceDashboard.tsx` — fetch bookings, compute KPIs, add KpiCard row + component
2. `src/i18n/locales/{en,el,de,fr,it,es}/finance.json` — add 3 keys each

## Not Modified
- Summary cards, charts, breakdowns, assets, transactions, delete logic, recurring modal — all untouched

