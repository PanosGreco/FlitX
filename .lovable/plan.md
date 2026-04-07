

# Implementation Plan: Price Seasons — Fleet-Wide Seasonal Price Adjustments

## Step 1: Database Migration
Create two tables with RLS:
- **`price_seasons`**: id, user_id, name, start_month, start_day, end_month, end_day, mode (automatic/manual), is_active, created_at, updated_at
- **`price_season_rules`**: id, season_id (FK CASCADE), user_id, scope (category/vehicle), vehicle_category, vehicle_id (FK CASCADE to vehicles), adjustment_type (percentage/fixed/absolute), adjustment_value, created_at
- RLS: `auth.uid() = user_id` for ALL on both tables

## Step 2: Create `src/utils/priceSeasons.ts`
Pure utility with:
- `isDateInSeason()` — cross-year aware month/day comparison
- `getActiveSeasonsForDate()` — filters by is_active + mode
- `getEffectiveRate()` — vehicle override > category rule > base rate
- `applyAdjustment()` — percentage/fixed/absolute math

## Step 3: Create `src/components/fleet/PriceSeasonsDialog.tsx`
Management dialog with:
- List view: season cards with name, date range, mode badge, status, rule summaries, Edit/Activate/Delete
- 4-step create/edit wizard: Name & Mode → Date Range (month+day dropdowns) → Category Adjustments → Vehicle Overrides (optional)
- CRUD operations against price_seasons and price_season_rules

## Step 4: Modify `src/components/fleet/VehicleGrid.tsx`
- Add "Price Seasons" outline button with CalendarRange icon
- Fetch price_seasons and price_season_rules on mount
- Pass activeSeasons and allRules to VehicleCard

## Step 5: Modify `src/components/fleet/VehicleCard.tsx`
- Add optional activeSeasons/allRules props
- Compute effectiveRate via getEffectiveRate()
- Show strikethrough base rate + adjusted rate + amber season name when active

## Step 6: Modify `src/components/booking/UnifiedBookingDialog.tsx`
- Fetch seasons/rules in fetchAllData()
- Replace vehicleDailyRate (line 307) with seasonal rate using `getActiveSeasonsForDate(seasons, startDate)` — **using startDate (booking pickup date)**, not new Date()
- Show amber annotation on fixed pricing label when seasonal rate applies

## Step 7: Add translations to all 6 locale fleet.json files
~30 keys for season management UI (EN, EL, DE, FR, IT, ES)

## Not Modified
- vehicles.daily_rate, handleSaveBooking, createDailyTasks, Finance pages, depreciation utils, AI edge functions

