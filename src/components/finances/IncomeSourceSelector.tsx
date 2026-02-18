import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useCollaborations } from "@/hooks/useCollaborations";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { language } = useLanguage();
  const { userIncomeCategories } = useIncomeCategories();
  const { collaborations, refetchCollaborations } = useCollaborations();
  const [isCreatingCollab, setIsCreatingCollab] = useState(false);
  const [newCollabName, setNewCollabName] = useState("");

  // Build the current select value for controlled display
  const getSelectValue = () => {
    if (incomeSourceType === 'other' && incomeSourceSpecification) {
      // Check if it's a user-created "other" category
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

    if (val.startsWith('__custom__:')) {
      const spec = val.replace('__custom__:', '');
      onSourceChange('other', spec);
    } else if (val.startsWith('__collab__:')) {
      const spec = val.replace('__collab__:', '');
      onSourceChange('collaboration', spec);
    } else if (val === '__new_collab__') {
      setIsCreatingCollab(true);
      onSourceChange('collaboration', '');
    } else if (val === 'collaboration') {
      // Just selected the parent "Collaboration" — show sub-selection
      onSourceChange('collaboration', '');
    } else {
      onSourceChange(val, val === 'other' ? '' : '');
    }
  };

  const handleCreateCollaboration = () => {
    const trimmed = newCollabName.trim();
    if (!trimmed) return;

    // Case-insensitive duplicate check
    const exists = collaborations.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      // Reuse existing
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

  // Show collaboration sub-selector when type is collaboration but no spec selected yet, or creating new
  const showCollabSubSelector =
    incomeSourceType === 'collaboration' &&
    !incomeSourceSpecification &&
    (hasCollaborations || isCreatingCollab);

  return (
    <div className="space-y-3">
      {showLabel && (
        <Label className="text-base font-semibold">
          {labelText || (language === 'el' ? 'Πηγή Κράτησης' : 'Booking Source')}
        </Label>
      )}

      <Select
        value={getSelectValue()}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              language === 'el' ? 'Επιλέξτε πηγή' : 'Select source'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {/* Core Categories */}
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground font-medium">
              {language === 'el' ? 'Βασικές Πηγές' : 'Core Sources'}
            </SelectLabel>
            <SelectItem value="walk_in">
              {language === 'el' ? 'Απευθείας Κράτηση' : 'Direct Booking'}
            </SelectItem>

            {/* Collaboration: if user has existing collabs, show them nested */}
            {hasCollaborations ? (
              <>
                {collaborations.map((collab) => (
                  <SelectItem
                    key={collab}
                    value={`__collab__:${collab}`}
                    className="pl-8"
                  >
                    {collab}
                  </SelectItem>
                ))}
                <SelectItem value="__new_collab__" className="pl-8">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Plus className="h-3.5 w-3.5" />
                    {language === 'el'
                      ? 'Νέα Συνεργασία'
                      : 'New Collaboration'}
                  </span>
                </SelectItem>
              </>
            ) : (
              <SelectItem value="collaboration">
                {language === 'el' ? 'Συνεργασία' : 'Collaboration'}
              </SelectItem>
            )}

            <SelectItem value="other">
              {language === 'el' ? 'Άλλο' : 'Other'}
            </SelectItem>
          </SelectGroup>

          {/* User-Created Categories (from Other) */}
          {hasUserCategories && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground font-medium">
                  {language === 'el'
                    ? 'Προσαρμοσμένες Πηγές'
                    : 'Custom Sources'}
                </SelectLabel>
                {userIncomeCategories.map((cat) => (
                  <SelectItem key={cat} value={`__custom__:${cat}`}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>

      {/* Collaboration: creating new entry */}
      {(isCreatingCollab || (incomeSourceType === 'collaboration' && !incomeSourceSpecification && !hasCollaborations)) && (
        <div className="flex gap-2">
          <Input
            value={newCollabName}
            onChange={(e) => setNewCollabName(e.target.value)}
            placeholder={
              language === 'el'
                ? 'Όνομα συνεργάτη...'
                : 'Collaboration name...'
            }
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
            {language === 'el' ? 'Προσθήκη' : 'Add'}
          </Button>
        </div>
      )}

      {/* Other: free text specification */}
      {incomeSourceType === 'other' && !userIncomeCategories.includes(incomeSourceSpecification) && (
        <Input
          value={incomeSourceSpecification}
          onChange={(e) =>
            onSourceChange('other', e.target.value)
          }
          placeholder={
            language === 'el' ? 'Προσδιορίστε...' : 'Specify source...'
          }
        />
      )}
    </div>
  );
}
