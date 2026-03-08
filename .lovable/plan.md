

## Plan — Fix Duplicate Vehicle Categories + Grid/Compact Improvements

### 1. Fix Vehicle Category Duplication (Two Safeguards)

**File:** `src/components/finances/AssetTrackingWidget.tsx`

**a) Prevent new duplicates (lines 58-72):**
Before calling `addCategory`, build a `Set` of existing vehicle category names and skip any that already exist:

```typescript
useEffect(() => {
  if (loading || initRef.current || vehicles.length === 0) return;
  initRef.current = true;

  const vehicleTypes = [...new Set(vehicles.map((v) => v.vehicle_type))];
  const existingNames = new Set(categories.filter(c => c.is_vehicle_category).map(c => c.name));

  const missing = vehicleTypes.filter(
    (vt) => !existingNames.has(VEHICLE_TYPE_LABELS[vt]?.en || vt)
  );

  if (missing.length > 0) {
    Promise.all(missing.map((vt) => addCategory(VEHICLE_TYPE_LABELS[vt]?.en || vt, true)));
  }
}, [loading, vehicles, categories]);
```

**b) Deduplicate existing DB entries at render time (line 89):**
Instead of `categories.filter(c => c.is_vehicle_category)`, deduplicate by name — keep only the first category per name:

```typescript
const vehicleCategories = categories
  .filter((c) => c.is_vehicle_category)
  .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i);
```

This ensures even if duplicates exist in the database, each vehicle category renders only once. The assets from duplicate categories are merged by matching `vehicle_id`.

### 2. Fix Widget Height Coupling

**File:** `src/components/finances/FinanceDashboard.tsx` line 645

Add `items-start` to the grid:
```
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
```

### 3. Make Assets Widget More Compact

**File:** `src/components/finances/AssetTrackingWidget.tsx`

Spacing reductions:
- Category section margin: `mb-6` → `mb-3` (lines 117, 170)
- Separator margin: `mb-3` → `mb-1` (lines 118, 171)
- Category header padding: `py-2 mb-2` → `py-1.5 mb-1` (lines 119, 172)
- Grand total: `my-4` → `my-2`, `py-3` → `py-2` (lines 268-269)
- Add category section: `mt-4` → `mt-2` (line 276)
- CardHeader: add `pb-2` to reduce header gap

### Files Modified
- `src/components/finances/AssetTrackingWidget.tsx` — duplication fix (both safeguards), compact spacing
- `src/components/finances/FinanceDashboard.tsx` — `items-start` on grid

