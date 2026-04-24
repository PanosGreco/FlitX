import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Sun, Pause, Play, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDateFnsLocale } from "@/utils/localeMap";
import { useSeasonalMode } from "@/hooks/useSeasonalMode";
import { useToast } from "@/hooks/use-toast";

interface SeasonalModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function SeasonalModeDialog({ open, onOpenChange }: SeasonalModeDialogProps) {
  const { t } = useTranslation("finance");
  const { language } = useLanguage();
  const { toast } = useToast();
  const locale = getDateFnsLocale(language);
  const { settings, updateSettings, isPaused } = useSeasonalMode();

  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync local state with fetched settings whenever the dialog opens
  useEffect(() => {
    if (open) {
      setIsEnabled(settings?.is_seasonal ?? false);
      setSelectedMonths(settings?.season_months ?? []);
      setConfirmingEnd(false);
    }
  }, [open, settings]);

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    if (isEnabled && selectedMonths.length === 0) {
      toast({
        title: t("seasonMinMonths"),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    await updateSettings({
      is_seasonal: isEnabled,
      season_months: selectedMonths,
    });
    setSaving(false);
    onOpenChange(false);
  };

  const handleEndSeason = async () => {
    setSaving(true);
    await updateSettings({
      is_paused: true,
      paused_at: new Date().toISOString(),
    });
    setSaving(false);
    setConfirmingEnd(false);
  };

  const handleResumeSeason = async () => {
    setSaving(true);
    await updateSettings({ is_paused: false, paused_at: null });
    setSaving(false);
  };

  const seasonConfigured = (settings?.season_months?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-primary" />
            {t("seasonalModeTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t("seasonalModeDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Section 1 — Configuration */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="seasonal-toggle" className="text-sm font-medium cursor-pointer">
                {t("seasonalModeToggle")}
              </label>
              <Switch
                id="seasonal-toggle"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            {isEnabled && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground">{t("seasonalMonthsLabel")}</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {MONTHS.map((m) => {
                    const selected = selectedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMonth(m)}
                        className={cn(
                          "px-2 py-1.5 text-xs rounded-md font-medium transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                      >
                        {format(new Date(2024, m - 1, 1), "MMM", { locale })}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{t("seasonalMonthsHint")}</span>
                </p>
              </div>
            )}
          </div>

          {/* Section 2 — Status */}
          {seasonConfigured && settings?.is_seasonal && (
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold">{t("seasonStatus")}</h3>

              {!isPaused ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    ✅ {t("seasonStatusActive")}
                  </p>
                  {!confirmingEnd ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingEnd(true)}
                      className="gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      {t("seasonEndButton")}
                    </Button>
                  ) : (
                    <div className="space-y-2 bg-muted/50 rounded-md p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("seasonEndConfirm")}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleEndSeason}
                          disabled={saving}
                        >
                          {t("seasonEndButton")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingEnd(false)}
                        >
                          {t("common:cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    ⏸️ {t("seasonStatusPaused")}{" "}
                    {settings?.paused_at &&
                      format(new Date(settings.paused_at), "PP", { locale })}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResumeSeason}
                    disabled={saving}
                    className="gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t("seasonResumeButton")}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common:cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {t("common:save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
