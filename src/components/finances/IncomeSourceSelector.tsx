import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectContentManualScroll,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useCollaborations } from "@/hooks/useCollaborations";
import { useAdditionalCosts } from "@/hooks/useAdditionalCosts";
import { useInsuranceTypes } from "@/hooks/useInsuranceTypes";
import { useTranslation } from "react-i18next";

interface IncomeSourceSelectorProps {
  incomeSourceType: string;
  incomeSourceSpecification: string;
  onSourceChange: (type: string, specification: string) => void;
  disabled?: boolean;
  showLabel?: boolean;
  labelText?: string;
}

export function IncomeSourceSelector({
  incomeSourceType,
  incomeSourceSpecification,
  onSourceChange,
  disabled = false,
  showLabel = true,
  labelText,
}: IncomeSourceSelectorProps) {
  const { t } = useTranslation('finance');
  const { userIncomeCategories } = useIncomeCategories();
  const { collaborations, refetchCollaborations } = useCollaborations();
  const { savedCategories } = useAdditionalCosts();
  const { insuranceTypes } = useInsuranceTypes();
  const [isCreatingCollab, setIsCreatingCollab] = useState(false);
  const [newCollabName, setNewCollabName] = useState("");

  // Build the current select value for controlled display
  const getSelectValue = () => {
    if (incomeSourceType === 'additional_cost' && incomeSourceSpecification) {
      return `__additional_cost__:${incomeSourceSpecification}`;
    }
    if (incomeSourceType === 'insurance' && incomeSourceSpecification) {
      return `__insurance__:${incomeSourceSpecification}`;
    }
    if (incomeSourceType === 'other' && incomeSourceSpecification) {
      if (userIncomeCategories.includes(incomeSourceSpecification)) {
        return `__custom__:${incomeSourceSpecification}`;
      }
      return 'other';
    }
    if (incomeSourceType === 'collaboration' && incomeSourceSpecification) {
      if (collaborations.includes(incomeSourceSpecification)) {
        return `__collab__:${incomeSourceSpecification}`;
      }
      return 'collaboration';
    }
    return incomeSourceType;
  };

  const handleValueChange = (val: string) => {
    setIsCreatingCollab(false);
    setNewCollabName("");

    if (val.startsWith('__additional_cost__:')) {
      const spec = val.replace('__additional_cost__:', '');
      onSourceChange('additional_cost', spec);
    } else if (val.startsWith('__insurance__:')) {
      const spec = val.replace('__insurance__:', '');
      onSourceChange('insurance', spec);
    } else if (val.startsWith('__custom__:')) {
      const spec = val.replace('__custom__:', '');
      onSourceChange('other', spec);
    } else if (val.startsWith('__collab__:')) {
      const spec = val.replace('__collab__:', '');
      onSourceChange('collaboration', spec);
    } else if (val === '__new_collab__') {
      setIsCreatingCollab(true);
      onSourceChange('collaboration', '');
    } else if (val === 'collaboration') {
      onSourceChange('collaboration', '');
    } else {
      onSourceChange(val, val === 'other' ? '' : '');
    }
  };

  const handleCreateCollaboration = () => {
    const trimmed = newCollabName.trim();
    if (!trimmed) return;
    const exists = collaborations.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      const match = collaborations.find(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      )!;
      onSourceChange('collaboration', match);
    } else {
      onSourceChange('collaboration', trimmed);
    }
    setIsCreatingCollab(false);
    setNewCollabName("");
  };

  const hasCollaborations = collaborations.length > 0;
  const hasUserCategories = userIncomeCategories.length > 0;
  const hasAdditionalCostCategories = savedCategories.length > 0;
  const hasInsuranceTypes = insuranceTypes.length > 0;

  return (
    <div className="space-y-3">
      {showLabel && (
        <Label className="text-base font-semibold">
          {labelText || t('bookingSource')}
        </Label>
      )}

      <Select
        value={getSelectValue()}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('selectSource')} />
        </SelectTrigger>
        <SelectContentManualScroll scrollHeight="280px">
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground font-medium">
              {t('coreSources')}
            </SelectLabel>
            <SelectItem value="walk_in">{t('directBooking')}</SelectItem>
            <SelectItem value="collaboration">{t('collaboration')}</SelectItem>
            <SelectItem value="other">{t('addNewSource')}</SelectItem>
          </SelectGroup>

          {incomeSourceType === 'collaboration' && incomeSourceSpecification && (
            <SelectItem
              value={`__collab__:${incomeSourceSpecification}`}
              className="hidden"
            >
              {t('collaboration')} – {incomeSourceSpecification}
            </SelectItem>
          )}

          {(hasUserCategories || hasAdditionalCostCategories || hasInsuranceTypes) && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground font-medium">
                  {t('customSources')}
                </SelectLabel>
                {userIncomeCategories.map((cat) => (
                  <SelectItem key={cat} value={`__custom__:${cat}`}>{cat}</SelectItem>
                ))}
                {savedCategories
                  .filter(cat => !userIncomeCategories.some(uc => uc.toLowerCase() === cat.name.toLowerCase()))
                  .map((cat) => (
                    <SelectItem key={`ac-${cat.id}`} value={`__additional_cost__:${cat.name}`}>{cat.name}</SelectItem>
                  ))}
                {insuranceTypes.map((ins) => (
                  <SelectItem key={`ins-${ins.id}`} value={`__insurance__:${ins.name_original}`}>
                    {`Insurance - ${ins.name_original}`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContentManualScroll>
      </Select>

      {incomeSourceType === 'collaboration' && (
        <div className="space-y-2">
          {hasCollaborations && (
            <Select
              value={incomeSourceSpecification || ""}
              onValueChange={(val) => {
                if (val === '__new_collab__') {
                  setIsCreatingCollab(true);
                } else {
                  onSourceChange('collaboration', val);
                  setIsCreatingCollab(false);
                  setNewCollabName("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectCollaboration')} />
              </SelectTrigger>
              <SelectContent>
                {collaborations.map((collab) => (
                  <SelectItem key={collab} value={collab}>{collab}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__new_collab__">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Plus className="h-3.5 w-3.5" />
                    {t('newCollaboration')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {(isCreatingCollab || !hasCollaborations) && (
            <div className="flex gap-2">
              <Input
                value={newCollabName}
                onChange={(e) => setNewCollabName(e.target.value)}
                placeholder={t('collaborationName')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCollaboration();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateCollaboration}
                disabled={!newCollabName.trim()}
              >
                {t('add')}
              </Button>
            </div>
          )}
        </div>
      )}

      {incomeSourceType === 'other' && !userIncomeCategories.includes(incomeSourceSpecification) && (
        <Input
          value={incomeSourceSpecification}
          onChange={(e) => onSourceChange('other', e.target.value)}
          placeholder={t('specifySource')}
        />
      )}
    </div>
  );
}
