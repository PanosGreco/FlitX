

# Smart PDF Preview: Iframe in Production, New Tab in Preview/Safari

## Overview

The current `FilePreviewModal` always renders PDFs in an iframe, which fails inside Lovable's nested preview iframe. The fix: detect if the app is running inside an iframe (or Safari) and only then fall back to opening PDFs in a new tab. In production, the iframe preview works and should be kept.

---

## Changes

### 1. `src/components/shared/FilePreviewModal.tsx` -- Smart PDF rendering

Add environment detection and conditional rendering:

- **Detect nested iframe**: `window.self !== window.top` means we're inside Lovable preview (or any iframe embed)
- **Detect Safari**: Safari has known issues with PDF iframe rendering
- **Production (not in iframe, not Safari)**: Keep the current iframe-based PDF preview with Download and Open in New Tab buttons
- **Preview/Safari**: When user opens the modal with a PDF, automatically open in a new tab using `window.open(url, '_blank', 'noopener,noreferrer')` and close the modal
- **Popup blocked handling**: If `window.open` returns `null`, show a fallback UI with a direct link instead of a blank screen
- **File extension check**: Add extension-based PDF detection alongside MIME type (check for `.pdf` extension in the URL)
- **Image resolution logging**: When an image loads in the modal, log `naturalWidth x naturalHeight` vs rendered dimensions to console for debugging blur issues

### 2. `src/components/home/ContractPreview.tsx` -- No changes needed

Already correctly uses `FilePreviewModal` which will handle the smart routing.

### 3. `src/components/fleet/VehicleDocuments.tsx` -- Add file extension fallback for fileType detection

Currently checks `file_type === 'application/pdf'` from the database. Add a fallback check on the file extension from `file_path` in case the stored MIME type is `application/octet-stream` (for files uploaded before the `contentType` fix).

### 4. Upload logic -- Already correct

All 4 upload points already include `{ contentType: file.type }`. No changes needed:
- `VehicleDocuments.tsx` line 152
- `RentalBookingDialog.tsx` line 223
- `UnifiedBookingDialog.tsx` line 369
- `DamageReport.tsx` line 136

### 5. `src/components/fleet/RentalBookingsList.tsx` and `src/components/daily-program/TaskItem.tsx` -- Add PDF extension detection

Currently hardcode `fileType="image"`. Add a check: if the contract path ends in `.pdf`, pass `fileType="pdf"` instead.

---

## Technical Details

### Environment detection helper (inside FilePreviewModal):

```text
function isNestedIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

const shouldOpenInNewTab = isNestedIframe() || isSafari();
```

### PDF rendering logic:

```text
if fileType === "pdf" && url:
  if shouldOpenInNewTab:
    useEffect: open window.open(url, '_blank', 'noopener,noreferrer')
    if popup is null (blocked): show fallback UI with direct <a> link
    else: close modal via onOpenChange(false)
  else:
    render iframe (current behavior, works in production)
```

### File extension helper:

```text
function isPdfByExtension(path: string): boolean {
  return path.split('?')[0].split('#')[0].toLowerCase().endsWith('.pdf');
}
```

### Image resolution logging:

```text
<img onLoad={(e) => {
  const img = e.currentTarget;
  console.log(`[FilePreview] natural: ${img.naturalWidth}x${img.naturalHeight}, rendered: ${img.width}x${img.height}`);
}} />
```

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/shared/FilePreviewModal.tsx` | Add iframe/Safari detection; conditional new-tab for PDFs; popup null check with fallback UI; image resolution logging |
| `src/components/fleet/VehicleDocuments.tsx` | Add file extension fallback for PDF detection in fileType prop |
| `src/components/fleet/RentalBookingsList.tsx` | Detect PDF contracts by extension, pass correct fileType |
| `src/components/daily-program/TaskItem.tsx` | Detect PDF contracts by extension, pass correct fileType |

## No Changes Needed

- Upload logic (already has `contentType: file.type`)
- `ContractPreview.tsx` (already works via FilePreviewModal)
- Storage buckets, database, RLS policies

## Expected Results

- In production: PDFs render inside the app via iframe (professional SaaS feel)
- In Lovable preview / Safari: PDFs open in new tab reliably
- If popup is blocked: user sees a clickable link fallback
- Files uploaded before the MIME fix are detected by extension
- Image blur can be diagnosed via console resolution logs

