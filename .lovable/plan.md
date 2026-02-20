

# PDF Fix + Upload MIME Correction + In-App PDF Viewer

## Summary

Three interconnected issues are causing PDFs to fail:

1. **Missing `contentType` on uploads** -- All 4 upload handlers pass the file to storage without specifying `contentType`. This means storage may not set the correct `Content-Type: application/pdf` header, causing browsers to treat the file as a download instead of rendering it inline.

2. **Async `window.open()` blocked by browsers** -- In `VehicleDocuments.tsx`, the click handler fetches a signed URL (async), then `FilePreviewModal` fires `window.open()` during its render cycle. This loses the user gesture context, so the browser blocks the popup or navigates to a broken page.

3. **`FilePreviewModal` has a render-time side effect** -- The component calls `window.open()` inside the render body (not in an event handler), which is unreliable and causes the redirect-to-Supabase-domain issue.

---

## Fix 1: Add `contentType` to All Uploads

All 4 upload points currently omit `contentType`. This must be added so storage serves files with the correct MIME type.

| File | Upload Call |
|------|-----------|
| `src/components/fleet/VehicleDocuments.tsx` (line 150-152) | `.upload(filePath, selectedFile)` |
| `src/components/fleet/RentalBookingDialog.tsx` (line 221-223) | `.upload(fileName, file)` |
| `src/components/booking/UnifiedBookingDialog.tsx` (line 367-369) | `.upload(fileName, file)` |
| `src/components/damage/DamageReport.tsx` (line 136) | `.upload(fileName, file)` |

Each becomes:
```typescript
.upload(path, file, { contentType: file.type })
```

This ensures `Content-Type: application/pdf` is set for PDFs, and correct MIME types for all other files.

---

## Fix 2: PDF Viewing Strategy -- In-App Modal with iframe

Instead of opening PDFs in a new tab (which fails due to popup blocking and gesture context loss), render PDFs **inside the app** using an iframe within the existing `FilePreviewModal`.

### Changes to `FilePreviewModal.tsx`

Remove the render-time `window.open()` side effect entirely. Instead, add a PDF rendering path:

```
if fileType === "pdf" && url:
  Render Dialog with:
    <iframe 
      src={url} 
      className="w-full h-[85vh]"
      title={title}
    />
    Actions bar with:
      - Download button
      - "Open in New Tab" button (using <a> tag, not window.open)
```

Key implementation details:
- The iframe is inside a Dialog (not a Radix portal with sandbox restrictions -- the `DialogContent` component does NOT add `sandbox` attributes; the previous Chrome blocking was from the tiny thumbnail iframe in `ContractPreview`, which has already been replaced with a static icon)
- The signed URL includes proper `Content-Type` header (fixed by Fix 1)
- Fallback: if iframe fails to load, show a "Download" button

### Changes to `VehicleDocuments.tsx`

The `handleViewDocument` function already fetches the signed URL and sets state. No change needed -- the `FilePreviewModal` now handles PDFs in-modal instead of trying to `window.open()`.

### Changes to `ContractPreview.tsx`

For PDF contracts: instead of `window.open(publicUrl)` on click, set `open = true` and pass `fileType="pdf"` to `FilePreviewModal`. The modal handles the iframe rendering.

---

## Fix 3: Error Fallback Handling

In `VehicleDocuments.tsx` `handleViewDocument`:
- If `createSignedUrl` fails, show toast AND ensure `viewingDocument` is cleared
- Already implemented correctly (lines 256-262)

In `FilePreviewModal`:
- If `url` is null when open, show a friendly error state instead of blank modal
- Already handled by the "other" fileType fallback

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/shared/FilePreviewModal.tsx` | Remove `window.open()` side effect; add iframe-based PDF rendering with download/open-in-tab buttons |
| `src/components/fleet/VehicleDocuments.tsx` | Add `contentType: file.type` to upload call |
| `src/components/fleet/RentalBookingDialog.tsx` | Add `contentType: file.type` to upload call |
| `src/components/booking/UnifiedBookingDialog.tsx` | Add `contentType: file.type` to upload call |
| `src/components/damage/DamageReport.tsx` | Add `contentType: file.type` to upload call |
| `src/components/home/ContractPreview.tsx` | Change PDF click to open `FilePreviewModal` with `fileType="pdf"` instead of `window.open()` |

## No Changes Needed

- Database schema -- no changes
- Storage buckets -- no changes  
- RLS policies -- no changes
- CORS -- storage buckets already allow GET requests with standard headers

## Expected Results

- PDFs render inside the app in a full-screen modal (iframe-based)
- Users can view, download, and optionally open in new tab
- No popup blocking issues
- No redirect to broken Supabase domain
- Correct MIME types on all uploaded files
- Images continue to work as before (high-res modal)
- Works on both desktop and mobile

