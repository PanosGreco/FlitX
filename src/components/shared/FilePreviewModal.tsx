import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";

type FileType = "image" | "pdf" | "other";

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
  // For PDFs: open in new tab, don't render modal
  if (fileType === "pdf" && url && open) {
    window.open(url, "_blank", "noopener,noreferrer");
    // Close immediately since we opened a new tab
    setTimeout(() => onOpenChange(false), 0);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center w-full h-full">
          {fileType === "image" && url ? (
            <div className="overflow-auto w-full max-h-[95vh] flex items-center justify-center p-4">
              <img
                src={url}
                alt={title}
                className="max-w-full max-h-[85vh] object-contain"
                loading="lazy"
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

          {actions && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 bg-background/80 backdrop-blur border-t border-border">
              {actions}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
