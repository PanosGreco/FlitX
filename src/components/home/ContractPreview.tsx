import { useEffect, useMemo, useState } from "react";
import { Maximize2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { FilePreviewModal } from "@/components/shared/FilePreviewModal";

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

  const handleClick = () => {
    if (kind === "pdf") {
      // Open PDF in new tab to avoid Chrome iframe blocking
      window.open(publicUrl, "_blank", "noopener,noreferrer");
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative w-full h-[120px] rounded-md overflow-hidden border border-border bg-muted/20",
          className
        )}
        aria-label="Open contract"
      >
        {kind === "pdf" ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <FileText className="h-8 w-8" />
            <span className="text-xs">PDF</span>
          </div>
        ) : (
          <img
            src={publicUrl}
            alt="Rental contract thumbnail"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Subtle affordance */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-background/10">
          <div className="rounded-full bg-background/80 backdrop-blur px-2 py-1">
            <Maximize2 className="h-3 w-3 text-foreground" />
          </div>
        </div>
      </button>

      {/* Image preview modal (PDFs open in new tab instead) */}
      <FilePreviewModal
        open={open}
        onOpenChange={setOpen}
        url={publicUrl}
        fileType="image"
        title="Rental contract"
      />
    </>
  );
}