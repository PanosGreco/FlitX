

# 10 MB File Size Limit + Conditional Client-Side Image Compression (with HEIC Conversion)

## Overview

Create a shared utility for file validation (10 MB limit) and client-side image compression (max 2000px width), then integrate it into all 7 upload points across the application. Compression is **conditional**: only applied to image files (JPG, PNG, WebP) that are over 500 KB. PDFs, documents, and small images are left untouched. **HEIC files (default iPhone format) are always converted to JPEG for browser compatibility**, regardless of size.

---

## New File: `src/utils/imageUtils.ts`

Two exported functions:

### `validateFileSize(file, maxSizeMB = 10)`
- Returns `{ valid: boolean; message: string }`
- Rejects files exceeding 10 MB with a user-friendly message showing actual size

### `compressImage(file, maxWidth = 2000, quality = 0.85)`
- Returns `Promise<File>` (the compressed file, or the original if skipped)
- **Skip conditions** (returns original file unchanged):
  - File is not an image (`!file.type.startsWith('image/')`)
  - File type is GIF or SVG (not suitable for canvas re-encoding)
- **HEIC handling** (always converts):
  - If file type is `image/heic` or `image/heif`, or filename ends in `.heic`/`.heif`: always convert to JPEG via canvas, regardless of file size
  - This ensures iPhone uploads are browser-compatible for previews and display
  - After conversion, the returned File has a `.jpg` extension and `image/jpeg` MIME type
- **Size-based skip** (for non-HEIC images):
  - If file is under 500 KB and is already JPG/PNG/WebP: return original unchanged
- **Compression logic** (for JPG, PNG, WebP over 500 KB):
  - Load image into HTMLImageElement via object URL
  - Calculate scaled dimensions preserving aspect ratio (max 2000px wide)
  - Draw onto canvas at new dimensions
  - Export as JPEG at 85% quality (for JPG/WebP originals) or PNG (for PNG originals)
  - Wrap blob in new File object preserving original name (with corrected extension for HEIC)

---

## Compression Rules Summary

| File Type | Size < 500 KB | Size >= 500 KB |
|-----------|--------------|----------------|
| JPG/JPEG  | No compression | Compress to max 2000px, 85% quality |
| PNG       | No compression | Compress to max 2000px, PNG output |
| WebP      | No compression | Compress to max 2000px, 85% JPEG quality |
| HEIC/HEIF | **Always convert to JPEG** | **Always convert to JPEG + compress** |
| PDF       | Size check only | Size check only |
| DOC/DOCX  | Size check only | Size check only |
| GIF/SVG   | Size check only | Size check only |

---

## Integration Points (7 files)

Each handler gets two additions at the top: size validation with toast on failure, then conditional compression for qualifying images.

### 1. `src/components/damage/DamageReport.tsx` -- `handleFileChange`
- Multi-file input: loop through files, validate each, skip oversized ones with toast
- Compress/convert qualifying images before setting state
- For HEIC files: converted to JPEG so previews work in browser and stored file is compatible
- Existing upload loop uses the already-processed files

### 2. `src/components/fleet/VehicleDocuments.tsx` -- `handleFileSelect`
- Single file: validate size, show toast if rejected
- Compress if qualifying image, convert if HEIC, skip for PDFs/docs
- Then proceed to set state as normal

### 3. `src/components/booking/UnifiedBookingDialog.tsx` -- `handleFileSelect`
- Single contract photo: validate size, compress/convert if image
- Then proceed with FileReader for preview

### 4. `src/components/fleet/RentalBookingDialog.tsx` -- `handleFileSelect`
- Same pattern as UnifiedBookingDialog

### 5. `src/pages/Fleet.tsx` -- `handleVehicleImageUpload`
- Single vehicle photo: validate size, compress/convert image
- Then proceed with FileReader for data URL conversion

### 6. `src/components/fleet/EditVehicleDialog.tsx` -- `handleImageUpload`
- Same pattern as Fleet.tsx

### 7. `src/components/profile/UserProfile.tsx` -- `handleProfilePhotoUpload`
- Single profile photo: validate size, compress/convert image
- Then proceed with FileReader for data URL

---

## HEIC Conversion Details

- iPhones default to HEIC format for photos
- HEIC is not natively supported by most browsers for `<img>` display
- The `compressImage` function detects HEIC via MIME type (`image/heic`, `image/heif`) and file extension (`.heic`, `.heif`)
- Canvas API can load HEIC on Safari/iOS (where it originates), enabling client-side conversion
- On browsers that cannot decode HEIC (Chrome desktop), the canvas load will fail gracefully -- the original file is returned and uploaded as-is (Supabase storage will still accept it)
- The converted output uses `image/jpeg` MIME type and `.jpg` extension
- This is a best-effort approach: works on the devices most likely to produce HEIC (iPhones using Safari)

---

## Technical Details

- All handlers become `async` (canvas compression is async)
- Toast notifications use existing `useToast` or `sonner` toast already in each component
- No new dependencies -- uses native Canvas API, HTMLImageElement, Blob
- The 10 MB limit applies to the **original** file (validated before compression)
- File extension in upload path is derived from the processed file (so HEIC -> `.jpg` in storage)

## Database Changes

None.

## Files Summary

| File | Change |
|------|--------|
| `src/utils/imageUtils.ts` | **New** -- validateFileSize + compressImage (with HEIC conversion) |
| `src/components/damage/DamageReport.tsx` | Add validation + compression to handleFileChange |
| `src/components/fleet/VehicleDocuments.tsx` | Add validation + compression to handleFileSelect |
| `src/components/booking/UnifiedBookingDialog.tsx` | Add validation + compression to handleFileSelect |
| `src/components/fleet/RentalBookingDialog.tsx` | Add validation + compression to handleFileSelect |
| `src/pages/Fleet.tsx` | Add validation + compression to handleVehicleImageUpload |
| `src/components/fleet/EditVehicleDialog.tsx` | Add validation + compression to handleImageUpload |
| `src/components/profile/UserProfile.tsx` | Add validation + compression to handleProfilePhotoUpload |

## Edge Cases

- **HEIC on non-Safari browsers**: Canvas load fails silently, original file uploaded as-is (acceptable fallback)
- **HEIC under 500 KB**: Still converted to JPEG (format conversion always applies, size threshold only governs resolution downscaling)
- **Corrupted files**: Canvas load error caught, original file returned
- **Multiple oversized files**: Single toast listing all rejected filenames
- **Files exactly at 10 MB**: Accepted (limit is exclusive >10 MB)

## Risk Assessment

- Zero database changes
- Zero breaking changes to existing upload flows
- Canvas re-encoding at 85% quality is visually lossless for vehicle/damage photos
- Non-image files (PDF, DOC) are never touched by the compressor
- HEIC conversion is best-effort and fails gracefully
- All changes are fully backward compatible

