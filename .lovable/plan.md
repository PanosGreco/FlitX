

# PDF Fix + High-Resolution Image Preview Upgrade

## Overview

Two issues to fix: (1) PDFs blocked by Chrome when opened via public URL in iframe, and (2) contract/document image previews rendering at constrained resolution, making them unreadable.

---

## ISSUE 1: PDF Files Blocked by Chrome

### Root Cause Analysis

The `rental-contracts` bucket is **public**, and contracts (including PDFs) are opened using `getPublicUrl()`. Chrome blocks PDF rendering inside iframes when the URL triggers a download (missing `Content-Type` header or `Content-Disposition: attachment`). Supabase Storage public URLs serve files with proper MIME types, but the real problem is that **Chrome sandboxes iframes inside Radix Dialog portals** -- the iframe inherits the `sandbox` attribute from the dialog's focus-trapping mechanism, which blocks PDF plugin rendering.

Additionally, the `ContractPreview.tsx` component embeds a PDF iframe as a thumbnail preview inside a button, then opens another iframe in a dialog -- both contexts can trigger Chrome's built-in PDF viewer block.

### Fix Strategy

- **For full-screen PDF viewing**: Instead of embedding in an iframe inside a Dialog, open PDFs in a **new browser tab** using `window.open(url, '_blank')`. This completely bypasses Chrome's iframe sandbox restrictions and is the most reliable cross-browser approach for PDF viewing.
- **For the thumbnail preview in `ContractPreview.tsx`**: Replace the PDF iframe thumbnail with a static PDF icon/placeholder (since the tiny 120px iframe preview is barely visible anyway and causes the Chrome block). When clicked, open in new tab.
- **For `VehicleDocuments.tsx`**: PDFs are already shown in an iframe inside a Dialog with signed URLs. Switch to opening in a new tab for PDFs while keeping images in the modal.

### Files Changed

| File | PDF Change |
|------|------------|
| `src/components/home/ContractPreview.tsx` | PDF thumbnail becomes icon; click opens new tab |
| `src/components/fleet/VehicleDocuments.tsx` | PDF click opens new tab instead of iframe in dialog |
| `src/components/daily-program/TaskItem.tsx` | No change needed (only shows images for contracts) |
| `src/components/fleet/RentalBookingsList.tsx` | No change needed (only shows images for contracts) |

---

## ISSUE 2: High-Resolution Image Preview

### Current Problems

1. **`RentalBookingsList.tsx`** and **`TaskItem.tsx`**: Contract images use `getPublicUrl()` (public bucket) and render with `max-w-full` + `maxHeight: 65vh` inside a `max-w-4xl` dialog. The `max-w-4xl` (896px) **caps the rendered width**, so high-resolution contract images appear small/blurry.

2. **`VehicleDocuments.tsx`**: Images render with `max-w-full max-h-[70vh]` inside `max-w-4xl` dialog -- same width cap issue. Uses signed URLs (private bucket) which is correct.

3. **`ContractPreview.tsx`**: The full-screen dialog already uses `max-w-[95vw]` and `max-w-none` on the image -- this actually works well. But it uses `getPublicUrl()` for a **public bucket**, which is correct for this bucket.

4. **`DamageReport.tsx`**: Already upgraded with `max-w-[90vw]` dialog and `object-contain` -- works well. This is the reference implementation.

### Fix Strategy: Shared `FilePreviewModal` Component

Create a single reusable component that handles both images and PDFs correctly:

```
src/components/shared/FilePreviewModal.tsx
```

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`  
- `url: string | null`
- `fileType: "image" | "pdf" | "other"`
- `title?: string`
- `actions?: ReactNode` (for delete button, download, etc.)

**Behavior:**
- **Images**: Full viewport modal (`max-w-[95vw] max-h-[95vh]`), image uses `max-w-full max-h-[85vh] object-contain`, no width cap. Renders the original URL at natural resolution.
- **PDFs**: Opens in new tab via `window.open()`, modal does not render.
- **Other**: Shows download prompt.

**Mobile support**: 
- `overflow-auto` on container for scroll
- Touch events naturally supported
- No fixed pixel containers

### Integration Points

**1. `src/components/fleet/RentalBookingsList.tsx`**
- Replace the inline contract viewer Dialog (lines 366-391) with `FilePreviewModal`
- Keep delete button as `actions` prop
- URL source: `getPublicUrl()` (public bucket -- correct)

**2. `src/components/daily-program/TaskItem.tsx`**
- Replace the inline contract viewer Dialog (lines 219-242) with `FilePreviewModal`
- Keep delete button as `actions` prop
- URL source: `getPublicUrl()` (public bucket -- correct)

**3. `src/components/fleet/VehicleDocuments.tsx`**
- Replace the viewing Dialog content (lines 470-523) with `FilePreviewModal`
- Keep download button as `actions` prop
- Distinguish image vs PDF using existing `isImageFile()` and `file_type` check
- URL source: `createSignedUrl()` (private bucket -- correct)

**4. `src/components/home/ContractPreview.tsx`**
- For images: Replace current Dialog (lines 78-100) with `FilePreviewModal` using the full public URL
- For PDFs: Click opens new tab, no modal
- Remove the iframe-based PDF thumbnail, show a PDF icon instead

### What the `FilePreviewModal` renders (images):

```
Dialog (max-w-[95vw] max-h-[95vh], p-0, bg-black/90, border-none)
  -> DialogHeader (sr-only for accessibility)
  -> img (max-w-full, max-h-[85vh], object-contain)
  -> actions slot (absolute positioned bottom bar for delete/download)
```

This matches the working pattern from `DamageReport.tsx`.

---

## Security Considerations

- **`vehicle-documents` bucket (private)**: Already uses signed URLs with 1-hour expiry. No change needed.
- **`rental-contracts` bucket (public)**: Uses `getPublicUrl()`. Files are accessible by URL but paths contain user IDs and timestamps, providing obscurity. No change to access model.
- **`damage-images` bucket (public)**: Same as rental-contracts. No change.
- No `window.open()` with user-controlled URLs -- all URLs come from Supabase storage API.
- No blob URLs or object URLs used -- direct storage URLs only.

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/shared/FilePreviewModal.tsx` | **New** -- reusable image/PDF preview component |
| `src/components/home/ContractPreview.tsx` | Use FilePreviewModal for images; PDF opens in new tab; PDF thumbnail becomes icon |
| `src/components/fleet/VehicleDocuments.tsx` | Use FilePreviewModal for images; PDF opens in new tab |
| `src/components/fleet/RentalBookingsList.tsx` | Use FilePreviewModal with full-viewport sizing |
| `src/components/daily-program/TaskItem.tsx` | Use FilePreviewModal with full-viewport sizing |

---

## No Changes Needed

- `DamageReport.tsx` -- already working correctly with full-viewport lightbox
- Database schema -- no changes
- Storage buckets -- no changes
- RLS policies -- no changes

---

## Expected Results

- PDFs open reliably in a new browser tab (no Chrome iframe blocks)
- Contract images render at full uploaded resolution inside a near-fullscreen modal
- Contract text is readable
- Works on mobile with scroll and native pinch-to-zoom
- ESC and click-outside close the modal
- Existing delete/download actions preserved
- Consistent preview experience across all sections

