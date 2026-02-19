

# Damage Section Enhancements + Maintenance Adjustment

## Overview

Six targeted changes across two feature areas: four damage section improvements (fullscreen preview, notes field, notes display, upload icon) and one maintenance form cleanup (remove Next Service Date from UI).

---

## Changes

### A1 -- Fullscreen Image Preview

**File:** `src/components/damage/DamageReport.tsx`

Current state: A lightbox dialog exists (lines 287-291) but uses `max-w-4xl` with basic rendering. Images open on double-click only.

Changes:
- Update the existing lightbox `DialogContent` to use `max-w-[90vw] max-h-[90vh]` with proper centering and `object-contain` on the image so it fills the viewport without cropping
- Add `onClick` alongside the existing `onDoubleClick` on damage thumbnails so single-click also opens the lightbox
- Add dark background via the existing `DialogOverlay` (already `bg-black/80`)
- Escape key and click-outside-to-close are already handled by Radix Dialog

No new components needed -- reuses existing lightbox dialog with improved sizing.

### A2 -- Optional Notes Field in Add Damage Form

**File:** `src/components/damage/DamageReport.tsx`

Changes:
- Add state: `const [damageNotes, setDamageNotes] = useState('')`
- Add a `Textarea` field between the category selector (line 237) and the file upload section (line 238), labeled "Notes (Optional)"
- On submit, pass `damageNotes` as the `description` field instead of the auto-generated `"Damage in ${selectedCategory}"` string (line 120). If notes are empty, keep the auto-generated text
- Reset `damageNotes` on dialog close

No database changes -- the `description` column already exists on `damage_reports` and is nullable.

### A3 -- Display Notes Under Damage Metadata

**File:** `src/components/damage/DamageReport.tsx`

Changes:
- Update the `DamageEntry` interface to include `description: string | null`
- In `fetchDamages`, include `description` in the select query and pass it through to each flattened entry
- Below the "Uploaded: date" text (line 277-279), conditionally render the description if it exists and is not the auto-generated default:

```
Uploaded: 01/01/2025 - 14:00
Notes: [user text]
```

Styling: same `text-sm text-muted-foreground` as the upload date line.

Legacy records with auto-generated descriptions like "Damage in Front" will not display under "Notes" (filtered out by checking if description starts with "Damage in").

### A4 -- Upload Icon on File Input

**File:** `src/components/damage/DamageReport.tsx`

Changes:
- Import `Upload` from `lucide-react` (already using lucide in the file)
- Replace the plain `<Input type="file" />` with a styled button-like label containing the Upload icon + "Choose Files" text, wrapping a hidden file input
- Maintains existing `handleFileChange` handler
- Icon size: `h-4 w-4`, inline with text, subtle appearance

### B1 -- Remove Next Service Date from Maintenance Form

**File:** `src/components/fleet/VehicleMaintenance.tsx`

Changes:
- Remove the "Next Service Date" form field (lines 397-408) from the Add Maintenance dialog
- Keep the `nextServiceDate` state variable but default it to empty -- OR simply always pass `null` for `next_date` on insert (line 125)
- Existing records that have `next_date` populated will continue to display it in the record list (lines 212-216 remain unchanged)
- No database column removal -- column stays for backward compatibility

Additionally, change the cost label from `'Cost ($)'` to `'Cost (€)'` on line 411 (English label currently shows `$`, should show `€` for consistency with the rest of the app).

---

## Database Changes

None. All fields used (`description` on `damage_reports`, `next_date` on `vehicle_maintenance`) already exist.

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/components/damage/DamageReport.tsx` | Fullscreen lightbox improvements, notes field in form, notes display under images, upload icon |
| `src/components/fleet/VehicleMaintenance.tsx` | Remove Next Service Date field from form, fix cost currency label |

---

## Edge Cases

- **Legacy damage records**: Auto-generated descriptions ("Damage in Front") are filtered from notes display
- **Empty notes**: Form submits normally, no notes line rendered
- **Large images**: `object-contain` + viewport-constrained dimensions prevent overflow
- **Mobile**: Lightbox uses percentage-based sizing, responsive by default
- **Existing maintenance records with next_date**: Still displayed in the record list, unaffected

## Risk Assessment

All changes are additive UI modifications or field removals from forms. No data model changes, no aggregation logic affected, no financial module impact. Fully backward compatible.

