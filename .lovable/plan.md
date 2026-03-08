

## Updated Plan — Vehicle System Expansion with Migration

### 1. Database Migration: Convert Van/Truck to Standalone Types

**One-time migration SQL:**
```sql
UPDATE vehicles
SET vehicle_type = 'van', type = CASE WHEN type = 'van' THEN '' ELSE type END
WHERE vehicle_type = 'car' AND LOWER(type) = 'van';

UPDATE vehicles
SET vehicle_type = 'truck', type = CASE WHEN type = 'truck' THEN '' ELSE type END
WHERE vehicle_type = 'car' AND LOWER(type) = 'truck';
```

This ensures all existing van/truck entries are migrated to the new vehicle_type values. The `type` column (subcategory) is cleared if it was just "van"/"truck" to avoid redundancy.

---

### 2. Update Vehicle Types Configuration

**File:** `src/constants/vehicleTypes.ts`

Expand `VEHICLE_TYPES`:
```typescript
export const VEHICLE_TYPES = [
  'car', 'van', 'truck', 'motorbike', 'atv', 
  'snowmobile', 'camper', 'bicycle', 'jet_ski'
] as const;
```

Remove `van` and `truck` from `VEHICLE_CATEGORIES.car`.

Add `VEHICLE_TYPE_LABELS` for all new types (EN + EL).

Add `VEHICLE_CATEGORIES` entries for new types:
- **Snowmobile**: `touring`, `mountain`, `utility`
- **Jet Ski**: `recreational`, `performance`
- **Van, Truck, Camper, Bicycle**: empty arrays (custom subcategories only)

---

### 3. Universal Custom Subcategory Support

**Files:** `src/pages/Fleet.tsx`, `src/components/fleet/EditVehicleDialog.tsx`

Current logic (line 390 in Fleet.tsx):
```typescript
{vehicleType !== 'atv' && (
```

Update to show subcategory selector for ALL types, including those with empty category arrays. Users can always use "Custom Category..." even if no predefined options exist:
```typescript
{/* Always show category selector - allows custom categories for all types */}
<div className="space-y-1">
  ...
  {VEHICLE_CATEGORIES[vehicleType]?.length > 0 ? (
    // Show predefined + custom option
  ) : (
    // Show only custom input for types with no predefined categories
  )}
</div>
```

Apply same logic to `EditVehicleDialog.tsx`.

---

### 4. Update Fleet Filter Panel

**File:** `src/components/fleet/VehicleFilterPanel.tsx`

- Change `flex gap-2` to `flex flex-wrap gap-2` so 9 buttons wrap gracefully
- Add icons: Truck for van/truck, Snowflake for snowmobile, Waves for jet_ski, etc.
- Filter buttons will only appear for vehicle types that exist in the user's fleet (existing dynamic logic)

---

### 5. Update Add Vehicle Form Layout

**File:** `src/pages/Fleet.tsx`

Reorder fields for better UX:
```
Row 1: Make | Model     ← most important identification fields
Row 2: Year | Fuel Type
Row 3: Transmission
Row 4: Passengers | (other)
```

---

### 6. Validation Confirmation

The system uses text columns (`vehicle_type`, `type`) in the database—no enum constraints. The `VEHICLE_TYPES` constant is only used for UI rendering. Since we're expanding this constant and the DB accepts any text, no schema changes are needed beyond the migration.

---

### Files Modified
1. **Database migration** — convert existing van/truck vehicles
2. `src/constants/vehicleTypes.ts` — add 6 new types, remove van/truck from car subcategories
3. `src/pages/Fleet.tsx` — universal subcategory selector, form layout reorder
4. `src/components/fleet/EditVehicleDialog.tsx` — universal subcategory selector
5. `src/components/fleet/VehicleFilterPanel.tsx` — flex-wrap layout for 9+ types

