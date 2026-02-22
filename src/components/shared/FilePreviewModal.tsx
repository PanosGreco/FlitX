import { ReactNode, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type FileType = "image" | "pdf" | "other";

function isNestedIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isPdfByExtension(url: string): boolean {
  return url.split('?')[0].split('#')[0].toLowerCase().endsWith('.pdf');
}

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  fileType: FileType;
  title?: string;
  actions?: ReactNode;
}

export function FilePreviewModal({
  open,
  onOpenChange,
  url,
  fileType,
  title = "Document Preview",
  actions,
}: FilePreviewModalProps) {
  const [popupBlocked, setPopupBlocked] = useState(false);

  const effectiveFileType = fileType === "other" && url && isPdfByExtension(url) ? "pdf" : fileType;
  const shouldOpenInNewTab = isNestedIframe() || isSafari();

  // For PDF in nested iframe / Safari: open in new tab via useEffect
  useEffect(() => {
    if (!open || effectiveFileType !== "pdf" || !url || !shouldOpenInNewTab) {
      setPopupBlocked(false);
      return;
    }

    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (newTab) {
      onOpenChange(false);
    } else {
      setPopupBlocked(true);
    }
  }, [open, effectiveFileType, url, shouldOpenInNewTab]);

  // If we opened in new tab, don't render the dialog
  if (effectiveFileType === "pdf" && shouldOpenInNewTab && !popupBlocked) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center w-full h-full">
          {effectiveFileType === "pdf" && url ? (
            popupBlocked ? (
              /* Popup was blocked — show fallback link */
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground text-sm text-center max-w-sm">
                  Your browser blocked the PDF popup. Use the link below to view it.
                </p>
                <div className="flex gap-2">
                  <a href={url} download className="inline-flex">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </a>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Button size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open PDF
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              /* Production: render iframe */
              <div className="w-full h-[85vh] flex flex-col">
                <iframe
                  src={url}
                  className="w-full flex-1 border-none"
                  title={title}
                />
                <div className="flex items-center justify-end gap-2 p-3 bg-background/80 backdrop-blur border-t border-border">
                  {actions}
                  <a href={url} download className="inline-flex">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </a>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open in New Tab
                    </Button>
                  </a>
                </div>
              </div>
            )
          ) : effectiveFileType === "image" && url ? (
            <div className="overflow-auto w-full max-h-[95vh] flex items-center justify-center p-4">
              <img
                src={url}
                alt={title}
                className="max-w-full max-h-[85vh] object-contain"
                loading="lazy"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  console.log(`[FilePreview] natural: ${img.naturalWidth}x${img.naturalHeight}, rendered: ${img.width}x${img.height}`);
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Preview not available for this file type
              </p>
            </div>
          )}

          {/* Actions bar for image/other types (PDF has its own bar above) */}
          {effectiveFileType !== "pdf" && actions && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 bg-background/80 backdrop-blur border-t border-border">
              {actions}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
