import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface VatControlProps {
  vatEnabled: boolean;
  onVatEnabledChange: (enabled: boolean) => void;
  vatRate: number;
  onVatRateChange: (rate: number) => void;
}

export function VatControl({ vatEnabled, onVatEnabledChange, vatRate, onVatRateChange }: VatControlProps) {
  const { t } = useTranslation('finance');

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="vat-checkbox"
          checked={vatEnabled}
          onCheckedChange={(checked) => onVatEnabledChange(checked === true)}
        />
        <Label htmlFor="vat-checkbox" className="cursor-pointer text-sm font-medium">
          {t('applyVat')}
        </Label>
      </div>

      {vatEnabled && (
        <div className="flex items-center gap-2 pl-6">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">
            {t('vatRate')}
          </Label>
          <Input
            type="number"
            value={vatRate}
            onChange={(e) => onVatRateChange(Number(e.target.value))}
            min={0}
            max={100}
            step="0.1"
            className="w-20 h-8"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}
