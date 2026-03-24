# Data Management — Storage Optimization

## Overview

FlitX optimizes storage costs and performance through upload limits, client-side image compression, efficient bucket usage, and automated cleanup. This document details every optimization in place.

## File Upload Limits

### Maximum File Size: 10 MB

Enforced by `validateFileSize()` in `src/utils/imageUtils.ts`:

```
File size check: file.size / (1024 * 1024) > maxSizeMB → reject
Default maxSizeMB = 10
```

This applies to ALL file uploads:
- Vehicle documents (PDFs, images)
- Contract photos
- Damage report images
- Vehicle photos (stored as base64 in DB)

### Allowed File Extensions

Validated by `getValidExtension()` in `src/utils/fileUtils.ts`:

| Context | Allowed Extensions |
|---|---|
| Damage report images | jpg, jpeg, png, gif, webp, heic |
| Vehicle documents | pdf, doc, docx, jpg, jpeg, png, gif, webp |

Extensions are sanitized: lowercased, stripped of special characters, limited to 10 chars.

## Image Compression

### Compression Rules

Implemented in `compressImage()` in `src/utils/imageUtils.ts`:

| File Type | Size | Action |
|---|---|---|
| JPG/PNG/WebP | ≥ 500 KB | Compress: resize to max 2000px width, 85% JPEG quality |
| JPG/PNG/WebP | < 500 KB | No compression — returned unchanged |
| HEIC/HEIF | Any size | **Always** convert to JPEG (browser compatibility) |
| PNG | ≥ 500 KB | Compress but keep PNG format (preserves transparency) |
| PDF | Any size | Never compressed — returned unchanged |
| GIF | Any size | Never compressed — animation would be lost |
| SVG | Any size | Never compressed — vector format |
| Non-image files | Any size | Never compressed — returned unchanged |

### Compression Pipeline

```
1. Check file.type → skip non-images, GIF, SVG
2. Check if HEIC → always process (convert to JPEG)
3. Check if compressible (JPG/PNG/WebP) AND < 500KB → skip
4. Create object URL → load into Image element
5. Calculate scaled dimensions (max width = 2000px, maintain aspect ratio)
6. Draw onto canvas at scaled dimensions
7. Export as:
   - PNG → PNG (preserves transparency)
   - Everything else → JPEG at 85% quality
8. HEIC files: rename extension from .heic/.heif to .jpg
9. Return new File object with compressed blob
```

### Compression Failure Handling

If canvas loading fails (e.g., HEIC on Chrome desktop where native HEIC support is absent):
- The **original file is returned unchanged**
- No error is thrown to the user
- Upload proceeds with the uncompressed file

## Storage Buckets

### Bucket Configuration

| Bucket | Type | Access | Use Case |
|---|---|---|---|
| `vehicle-documents` | **Private** | Signed URLs (1-hour TTL) | Vehicle PDFs, insurance documents, registration papers |
| `rental-contracts` | Public | Direct URL (path-scoped) | Booking contract photos |
| `damage-images` | Public | Direct URL (path-scoped) | Damage report photographs |

### Path Structure

All buckets use user-scoped paths to prevent cross-tenant access:

```
vehicle-documents/{user_id}/{vehicle_id}/{sanitized_filename}
rental-contracts/{user_id}/{booking_id}/{sanitized_filename}
damage-images/{user_id}/{vehicle_id}/{sanitized_filename}
```

### Private vs Public Buckets

- **Private (`vehicle-documents`)**: files cannot be accessed without a signed URL. The app generates signed URLs on-demand with 1-hour expiry via `supabase.storage.from('vehicle-documents').createSignedUrl(path, 3600)`. This is used for sensitive documents (insurance, registration).

- **Public (`rental-contracts`, `damage-images`)**: files are accessible via direct URL, but path knowledge is required. Paths contain UUIDs (user_id, booking_id, vehicle_id) which are effectively unguessable. RLS on the referencing tables (`rental_bookings`, `damage_reports`) prevents unauthorized users from discovering paths.

## Vehicle Image Storage

### Current Implementation: Base64 in Database

Vehicle photos are stored as base64 data URLs directly in the `vehicles.image` column:

```
data:image/jpeg;base64,/9j/4AAQSkZJRg...
```

**Advantages**:
- Simple implementation — single column, no storage bucket needed
- No signed URL management
- Loaded with vehicle data in one query

**Disadvantages**:
- Increases `vehicles` row size significantly (100KB–2MB per image)
- Fetching all vehicles loads all images, even for list views
- No CDN caching possible
- Base64 encoding adds ~33% overhead vs binary

### Future Optimization

Move vehicle images to a Storage bucket (like `vehicle-images`):
- Store only the path in `vehicles.image`
- Use signed URLs or public bucket for access
- Enable lazy loading of images
- Reduce `vehicles` table query payload by 90%+

## Automated Cleanup

### Contract Attachment Cleanup

The `cleanup-completed-tasks` edge function handles automated data retention:

**Trigger**: admin-initiated (requires admin role)

**Logic**:
1. Find completed bookings where `end_date < now() - 30 days`
2. For each booking with `contract_photo_path`:
   - Delete file from `rental-contracts` bucket
   - Set `contract_photo_path = null` in `rental_bookings`
3. For each related `daily_tasks` with `contract_path`:
   - Delete file from `rental-contracts` bucket
   - Set `contract_path = null` in `daily_tasks`

**What is NOT cleaned**:
- Core booking data (dates, customer name, amounts) — persists
- Financial records — persists
- Vehicle documents — no automatic cleanup
- Damage images — no automatic cleanup

## Database Efficiency

### Query Optimization

- **RLS filtering**: all queries are filtered server-side by `user_id` before results reach the client — no unnecessary data transfer
- **Selective fetching**: sub-tabs in Fleet detail page fetch data only when tab is active (lazy loading)
- **Client-side aggregation**: `useMemo` used for financial totals, chart data, calendar computations — recomputed only when dependencies change

### Write Optimization

| Operation | Debounce | Reason |
|---|---|---|
| Asset value updates | 600ms | Prevents rapid DB writes during slider/input changes |
| Note content saves | 1000ms | Prevents save-per-keystroke; force-save on blur |
| Search filtering | Immediate (useMemo) | Client-side only, no DB call |

### Pagination Limits

- Default query limit: 1000 rows (provider default)
- No explicit pagination implemented for most views
- Potential issue for users with 1000+ bookings, financial records, or tasks
- Mitigation: most views are date-filtered or vehicle-filtered, reducing result sets
