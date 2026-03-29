

# Plan: Reminders Time, Vehicle Photos & Analytics Sold Vehicle Fix

## Feature 1: Reminder Time Selection

### 1A. Database Migration
Add `due_time TIME DEFAULT NULL` to `vehicle_reminders` table.

### 1B. VehicleReminders.tsx
- Add `due_time: string | null` to `Reminder` interface
- Add `dueTime` state, time `<Select>` in Add dialog (24 options: 00:00–23:00), between date picker and description
- Include `due_time: dueTime || null` in insert, reset in `resetForm()`
- Display time next to date in reminder cards: `· <Clock> HH:MM` when present
- Import `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from shadcn

### 1C. RemindersWidget.tsx
- Add `due_time` to the `.select()` query
- Map `time: reminder.due_time ? reminder.due_time.substring(0, 5) : null` instead of `time: null`
- Time display already exists in the JSX (Clock icon + time), it will now show real values

---

## Feature 2: Multiple Vehicle Photos

### 2A. Database Migration
Create `vehicle_images` table (id, vehicle_id, user_id, file_path, sort_order, created_at) with RLS policies (SELECT/INSERT/DELETE by user_id). Foreign key to `vehicles(id) ON DELETE CASCADE` and `auth.users(id) ON DELETE CASCADE`.

### 2B. Storage Bucket Migration
Create public `vehicle-images` bucket + RLS policies on `storage.objects` for user-scoped access.

### 2C. Fleet.tsx — Add Vehicle Dialog
- Add state: `additionalImages: File[]`, `additionalImagePreviews: string[]`
- Add 2×2 grid UI after main image upload for up to 4 additional photos
- Each slot: empty = dashed border + icon, filled = preview + remove button
- Validate with `validateFileSize()`, compress with `compressImage()`
- After vehicle insert: upload each file to `vehicle-images` bucket, insert `vehicle_images` records
- Reset in `resetForm()`

### 2D. VehicleDetails.tsx — Gallery Button + Modal
- Add "View Photos" button next to "Edit Vehicle" button in the header action buttons area (line 284)
- Create inline gallery dialog:
  - Fetch from `vehicle_images` WHERE `vehicle_id` ORDER BY `sort_order`
  - Get public URLs from `vehicle-images` bucket
  - Grid display of thumbnails, click for full-size lightbox (Dialog with large img)
  - Upload button (file picker + compress + upload + insert)
  - Delete button per image (delete from storage + delete DB record)
  - 4-image limit enforcement
  - Empty state with upload prompt

---

## Feature 3: Analytics — Exclude Sold Vehicles

### 3A. FinanceDashboard.tsx
- Add `is_sold` to Vehicle interface and `fetchVehicles` select query (currently missing)
- In `vehicleProfitRanking` useMemo, filter: `const activeVehicles = vehicles.filter(v => !v.is_sold)` then use `activeVehicles` in the `.find()` lookup (line 411)

### 3B. IncomeBreakdown.tsx & ExpenseBreakdown.tsx
- These receive `vehicles` prop for category breakdowns. When grouping records by vehicle for category tables and pie charts, skip records where `vehicle.is_sold === true`
- The `vehicleProfitRanking` is already filtered at source (3A), so rankings are automatically clean
- Summary totals and bar/line charts remain unaffected (they use `filteredRecords` directly, not vehicle groupings)

---

## Translations
Add to all 6 locale `fleet.json` files:
- `reminderTime`: "Time (optional)" / "Ώρα (προαιρετικό)" / "Zeit (optional)" / "Heure (optionnel)" / "Ora (opzionale)" / "Hora (opcional)"
- `additionalPhotos`: "Additional Photos (up to 4)" + equivalents
- `viewPhotos`, `noAdditionalPhotos`, `uploadPhotos`, `maxPhotosReached`, `photoDeleted`, `photoUploaded`, `photoUploadFailed` + equivalents

---

## Files Modified
1. `src/components/fleet/VehicleReminders.tsx` — time picker + display
2. `src/components/home/RemindersWidget.tsx` — fetch + map `due_time`
3. `src/pages/Fleet.tsx` — additional image upload in Add Vehicle
4. `src/components/fleet/VehicleDetails.tsx` — gallery button + modal
5. `src/components/finances/FinanceDashboard.tsx` — filter sold vehicles, add `is_sold` to query
6. `src/components/finances/IncomeBreakdown.tsx` — skip sold in category breakdowns
7. `src/components/finances/ExpenseBreakdown.tsx` — skip sold in category breakdowns
8. `src/i18n/locales/{en,el,de,fr,it,es}/fleet.json` — new keys
9. Supabase migrations — `due_time` column + `vehicle_images` table + `vehicle-images` bucket

## Not Modified
- `UnifiedBookingDialog.tsx`, `handleSaveBooking`, `createDailyTasks`
- `EditVehicleDialog.tsx`, `CalendarView.tsx`, `CreateDialog.tsx`
- Financial record insert/delete logic, summary totals, bar/line charts

