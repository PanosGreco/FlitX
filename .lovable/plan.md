

# Plan: Customer Information Fields in Booking Form

## Overview
Add five optional customer fields (Name stays required, plus Email, Phone, Birth Date, Country, City) to the booking dialog, with auto-age computation, country/city autocomplete, and info tooltips. Data is stored in the existing `booking_contacts` table.

## 1. Database Migration

SQL migration with security roadmap comment block at top, then:

```sql
ALTER TABLE public.booking_contacts
  ADD COLUMN IF NOT EXISTS customer_birth_date DATE,
  ADD COLUMN IF NOT EXISTS customer_city TEXT,
  ADD COLUMN IF NOT EXISTS customer_country TEXT,
  ADD COLUMN IF NOT EXISTS customer_country_code TEXT;
```

Plus `COMMENT ON TABLE` and `COMMENT ON COLUMN` statements as specified. No new RLS policies needed. The `customer_email` and `customer_phone` columns already exist.

## 2. Package Installation

Add `country-state-city` as a direct dependency for offline country/city data.

## 3. New Component Files (src/components/booking/)

| File | Purpose |
|------|---------|
| `InfoTooltip.tsx` | Reusable `(i)` icon using shadcn Tooltip + lucide `Info` icon |
| `CountryCombobox.tsx` | Searchable dropdown using shadcn Popover+Command, data from `Country.getAllCountries()` |
| `CityCombobox.tsx` | Searchable dropdown, data from `City.getCitiesOfCountry()`, limited to 50 results, falls back to plain Input |

No similar components exist in the project currently.

## 4. Form UI Changes (UnifiedBookingDialog.tsx)

Replace lines 570-574 (the current Customer Name block) with a "Customer Information" section using the muted container style:

```
<div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
```

Layout inside:
- **Row 1**: Customer Name (full width, required — unchanged)
- **Row 2**: Email + Phone (2-col grid on md+)
- **Row 3**: Birth Date + Country (2-col grid on md+)
- **Row 4**: City (full width)

Each optional field gets an `InfoTooltip` next to its label.

## 5. State & Logic Changes

New state variables added at line ~105:
- `customerEmail`, `customerPhone`, `customerBirthDate`, `customerCity`, `customerCountry`, `customerCountryCode` — all `useState("")`

Computed age via `useMemo` from `customerBirthDate` — displayed inline, never stored.

## 6. Submit Logic

After the existing booking insert (around line 422), add a `booking_contacts` insert:

```typescript
if (customerEmail || customerPhone || customerBirthDate || customerCity || customerCountry) {
  const { error } = await supabase.from('booking_contacts').insert({
    booking_id: booking.id, user_id: user.id,
    customer_email: customerEmail || null,
    customer_phone: customerPhone || null,
    customer_birth_date: customerBirthDate || null,
    customer_city: customerCity || null,
    customer_country: customerCountry || null,
    customer_country_code: customerCountryCode || null,
  });
  if (error) toast.warning('Customer details partially saved');
}
```

Failure does NOT roll back the booking.

## 7. Reset Logic

Add all 6 new fields to `resetForm()` (line 531).

## 8. Translations

Add ~13 keys to `fleet.json` in all 6 locales (EN, EL, DE, FR, IT, ES):
`booking_customerInfo`, `booking_email`, `booking_phone`, `booking_birthDate`, `booking_age`, `booking_country`, `booking_city`, `booking_selectCountry`, `booking_selectCountryFirst`, `booking_searchCity`, `booking_tooltipEmail`, `booking_tooltipPhone`, `booking_tooltipBirthDate`, `booking_tooltipLocation`

## Files Summary

| Action | File |
|--------|------|
| Create | Migration (ALTER booking_contacts + comments) |
| Create | `src/components/booking/InfoTooltip.tsx` |
| Create | `src/components/booking/CountryCombobox.tsx` |
| Create | `src/components/booking/CityCombobox.tsx` |
| Modify | `src/components/booking/UnifiedBookingDialog.tsx` |
| Modify | `src/i18n/locales/{en,el,de,fr,it,es}/fleet.json` |
| Modify | `package.json` (add country-state-city) |

