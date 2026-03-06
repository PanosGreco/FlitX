import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface VatControlProps {
  vatEnabled: boolean;
  onVatEnabledChange: (enabled: boolean) => void;
  vatRate: number;
  onVatRateChange: (rate: number) => void;
}

export function VatControl({ vatEnabled, onVatEnabledChange, vatRate, onVatRateChange }: VatControlProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="vat-checkbox"
          checked={vatEnabled}
          onCheckedChange={(checked) => onVatEnabledChange(checked === true)}
        />
        <Label htmlFor="vat-checkbox" className="cursor-pointer text-sm font-medium">
          {language === 'el' ? 'Εφαρμογή ΦΠΑ' : 'Apply VAT'}
        </Label>
      </div>

      {vatEnabled && (
        <div className="flex items-center gap-2 pl-6">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">
            {language === 'el' ? 'Ποσοστό:' : 'Rate:'}
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
