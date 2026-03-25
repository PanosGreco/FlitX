

# Plan: Camper/Motorhome Features Implementation

## Clarifications Incorporated
- Vehicle INSERT in Fleet.tsx will use `.insert({...}).select().single()` to get the new vehicle ID directly
- Supabase types will be regenerated after migration
- Warning toast on camper features INSERT failure: "Vehicle was created but camper features could not be saved. Please edit the vehicle to add camper details."
- Part 7 (documentation updates) is SKIPPED

## Part 1 — Database Migration

Create `camper_features` table with the exact schema from the request (35+ columns), RLS policies for all 4 operations, indexes on `vehicle_id` and `user_id`.

## Part 2 — New Component: `CamperFeaturesForm.tsx`

Shared form component (~300 lines) used by both Add and Edit dialogs. Props receive all camper state values + setters + `disabled` boolean. 6 collapsible groups (all expanded by default) using `Collapsible` from radix. Conditional reveal logic for kitchen sub-fields, fridge size, toilet type.

## Part 3 — Fleet.tsx (Add Vehicle)

- Add ~35 camper state variables after line 73
- Add camper resets to `resetForm()` (line 176)
- Add camper reset to `handleVehicleTypeChange()` (line 198)
- Change vehicle INSERT (line 256) to `.insert({...}).select().single()` to get `data.id`
- After successful insert, if `vehicleType === 'camper'`, INSERT into `camper_features` with the new vehicle ID
- If camper INSERT fails, show warning toast with specified message
- Render `<CamperFeaturesForm />` conditionally before `<DialogFooter>` (before line 735)

## Part 4 — EditVehicleDialog.tsx

- Add ~35 camper state variables + `originalVehicleType` state
- In `useEffect` on `vehicle.id` (line 67): if vehicle is camper, fetch `camper_features` and populate state
- Add camper reset to `handleVehicleTypeChange()` (line 114)
- In `handleSave()` (line 138): after vehicle update, if camper → UPSERT camper_features; if changed FROM camper → DELETE camper_features
- Render `<CamperFeaturesForm />` after the depreciation section (before line 359)

## Part 5 — New Component: `CamperFeaturesDisplay.tsx`

Props: `vehicleId`, `refreshTrigger`. Fetches `camper_features` on mount/trigger change. Filters to only show enabled/non-zero features. Responsive grid (2/3/4 cols). Grouped by category with icon chips. Shows "No camper features configured" if empty. Shows `additional_notes` if present.

## Part 6 — VehicleDetails.tsx

- Import and conditionally render `<CamperFeaturesDisplay>` between the header (line 293) and `<Tabs>` (line 295)
- Only when `vehicle.vehicle_type === 'camper'`

## Part 7 — Translations

Add ~60 camper feature keys to all 6 locale files (en, el, de, fr, it, es) as specified in the request.

## Files Created
1. `src/components/fleet/CamperFeaturesForm.tsx`
2. `src/components/fleet/CamperFeaturesDisplay.tsx`

## Files Modified
1. `src/pages/Fleet.tsx`
2. `src/components/fleet/EditVehicleDialog.tsx`
3. `src/components/fleet/VehicleDetails.tsx`
4. `src/i18n/locales/en/fleet.json`
5. `src/i18n/locales/el/fleet.json`
6. `src/i18n/locales/de/fleet.json`
7. `src/i18n/locales/fr/fleet.json`
8. `src/i18n/locales/it/fleet.json`
9. `src/i18n/locales/es/fleet.json`

## Database Migration
1 new migration: `camper_features` table + RLS + indexes

