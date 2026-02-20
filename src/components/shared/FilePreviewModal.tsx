import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center w-full h-full">
          {fileType === "pdf" && url ? (
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
          ) : fileType === "image" && url ? (
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

          {/* Actions bar for image/other types (PDF has its own bar above) */}
          {fileType !== "pdf" && actions && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 bg-background/80 backdrop-blur border-t border-border">
              {actions}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
