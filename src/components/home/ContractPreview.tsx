import { useEffect, useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ContractKind = "pdf" | "image";

function getContractKind(contractPath: string): ContractKind {
  const ext = contractPath
    .split("?")[0]
    .split("#")[0]
    .split(".")
    .pop()
    ?.toLowerCase();

  return ext === "pdf" ? "pdf" : "image";
}

export function ContractPreview({
  contractPath,
  className,
}: {
  contractPath: string;
  className?: string;
}) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const kind = useMemo(() => getContractKind(contractPath), [contractPath]);

  useEffect(() => {
    const { data } = supabase.storage
      .from("rental-contracts")
      .getPublicUrl(contractPath);

    setPublicUrl(data?.publicUrl ?? null);
  }, [contractPath]);

  if (!publicUrl) return null;

  const pdfPreviewUrl = `${publicUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative w-full h-[120px] rounded-md overflow-hidden border border-border bg-muted/20",
          className
        )}
        aria-label="Open contract"
      >
        {kind === "pdf" ? (
          <iframe
            title="Rental contract preview"
            src={pdfPreviewUrl}
            className="w-full h-full pointer-events-none"
          />
        ) : (
          <img
            src={publicUrl}
            alt="Rental contract thumbnail"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Subtle affordance, no visible text */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-background/10">
          <div className="rounded-full bg-background/80 backdrop-blur px-2 py-1">
            <Maximize2 className="h-3 w-3 text-foreground" />
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Rental contract</DialogTitle>
          </DialogHeader>

          {kind === "pdf" ? (
            <iframe
              title="Rental contract"
              src={publicUrl}
              className="w-[95vw] h-[95vh] border-0"
            />
          ) : (
            <div className="bg-background p-4 overflow-auto max-h-[95vh] flex justify-center">
              <img
                src={publicUrl}
                alt="Rental contract"
                className="max-w-none h-auto w-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
