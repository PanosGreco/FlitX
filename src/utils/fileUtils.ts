/**
 * Sanitizes a filename to prevent path traversal and other security issues.
 * Generates a safe filename using UUID-style naming while preserving file extension.
 * 
 * @param originalFilename - The original filename from user input
 * @returns A sanitized filename safe for storage
 */
export const sanitizeFilename = (originalFilename: string): string => {
  // Extract extension and sanitize it
  const parts = originalFilename.split('.');
  const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  
  // Sanitize extension - only allow alphanumeric characters
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  
  // Generate a safe base name from original, removing dangerous characters
  const baseName = parts.join('.')
    .replace(/\.\./g, '') // Remove path traversal sequences
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace other special chars with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .substring(0, 100); // Limit length
  
  return safeExtension ? `${baseName}.${safeExtension}` : baseName;
};

/**
 * Extracts and validates file extension from filename.
 * Returns null if extension is invalid or potentially dangerous.
 * 
 * @param filename - The filename to extract extension from
 * @param allowedExtensions - Optional list of allowed extensions
 * @returns The sanitized extension or null if invalid
 */
export const getValidExtension = (
  filename: string, 
  allowedExtensions?: string[]
): string | null => {
  const parts = filename.split('.');
  if (parts.length < 2) return null;
  
  const extension = parts.pop()?.toLowerCase() || '';
  
  // Reject if extension contains path traversal or special characters
  if (/[\/\\]/.test(extension) || /\.\./.test(extension)) {
    return null;
  }
  
  // Sanitize to alphanumeric only
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, '');
  
  if (!safeExtension) return null;
  
  // Check against allowed list if provided
  if (allowedExtensions && !allowedExtensions.includes(safeExtension)) {
    return null;
  }
  
  return safeExtension;
};

/**
 * Allowed image extensions for damage reports
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];

/**
 * Allowed document extensions for vehicle documents
 */
export const ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
