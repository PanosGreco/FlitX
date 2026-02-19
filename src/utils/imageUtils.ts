/**
 * File size validation and conditional image compression utilities.
 * 
 * Compression rules:
 * - JPG/PNG/WebP >= 500KB: compress to max 2000px width
 * - HEIC/HEIF: always convert to JPEG (for browser compatibility)
 * - PDF/DOC/GIF/SVG: size check only, never compressed
 * - Images < 500KB (non-HEIC): returned unchanged
 */

export function validateFileSize(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; message: string } {
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      message: `File "${file.name}" is too large (${fileSizeMB.toFixed(1)} MB). Maximum allowed size is ${maxSizeMB} MB.`,
    };
  }
  return { valid: true, message: "" };
}

function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const ext = file.name.toLowerCase().split(".").pop();
  return ext === "heic" || ext === "heif";
}

function isCompressibleImage(file: File): boolean {
  const type = file.type.toLowerCase();
  return (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp"
  );
}

export async function compressImage(
  file: File,
  maxWidth: number = 2000,
  quality: number = 0.85
): Promise<File> {
  // Skip non-images entirely
  if (!file.type.startsWith("image/")) return file;

  // Skip GIF and SVG (not suitable for canvas re-encoding)
  const type = file.type.toLowerCase();
  if (type === "image/gif" || type === "image/svg+xml") return file;

  const heic = isHeicFile(file);
  const compressible = isCompressibleImage(file);

  // For non-HEIC, non-compressible formats: return as-is
  if (!heic && !compressible) return file;

  // For non-HEIC compressible images under 500KB: skip compression
  const SIZE_THRESHOLD = 500 * 1024; // 500 KB
  if (!heic && file.size < SIZE_THRESHOLD) return file;

  // Attempt canvas-based compression/conversion
  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    URL.revokeObjectURL(objectUrl);

    // Calculate scaled dimensions
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }

    // Draw onto canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    // Determine output format
    // PNG stays PNG (preserves transparency), everything else becomes JPEG
    const isPng = type === "image/png";
    const outputType = isPng ? "image/png" : "image/jpeg";
    const outputQuality = isPng ? undefined : quality;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, outputQuality)
    );

    if (!blob) return file;

    // Build output filename
    let outputName = file.name;
    if (heic) {
      // Replace .heic/.heif extension with .jpg
      outputName = outputName.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
      // If no extension was replaced, append .jpg
      if (!outputName.endsWith(".jpg")) {
        outputName += ".jpg";
      }
    }

    return new File([blob], outputName, { type: outputType });
  } catch {
    // Canvas load failed (e.g. HEIC on Chrome desktop) — return original
    return file;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
