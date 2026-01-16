import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { getMaintenanceTypeOptions } from "@/constants/maintenanceTypes";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  fuel_type?: string;
}

interface AddRecurringTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  onSuccess: () => void;
}

type Step = 'type' | 'date' | 'frequency' | 'amount' | 'details' | 'vehicle';

export function AddRecurringTransactionDialog({
  open,
  onOpenChange,
  vehicles,
  onSuccess
}: AddRecurringTransactionDialogProps) {
  const [step, setStep] = useState<Step>('type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequencyValue, setFrequencyValue] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState<'week' | 'month' | 'year'>('month');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [incomeSourceType, setIncomeSourceType] = useState('walk_in');
  const [incomeSourceSpec, setIncomeSourceSpec] = useState('');
  const [expenseSubcategory, setExpenseSubcategory] = useState('');
  
  const { language, isLanguageLoading } = useLanguage();
  const { toast } = useToast();
  const isBoats = isBoatBusiness();

  const resetForm = () => {
    setStep('type');
    setType('income');
    setStartDate(new Date().toISOString().split('T')[0]);
    setFrequencyValue('1');
    setFrequencyUnit('month');
    setAmount('');
    setCategory('');
    setDescription('');
    setVehicleId('');
    setIncomeSourceType('walk_in');
    setIncomeSourceSpec('');
    setExpenseSubcategory('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const steps: Step[] = ['type', 'date', 'frequency', 'amount', 'details', 'vehicle'];
  const currentStepIndex = steps.indexOf(step);

  const canGoNext = () => {
    switch (step) {
      case 'type': return true;
      case 'date': return !!startDate;
      case 'frequency': return !!frequencyValue && parseInt(frequencyValue) > 0;
      case 'amount': return !!amount && parseFloat(amount) > 0;
      case 'details': 
        if (type === 'expense') {
          if (!category) return false;
          if (category === 'maintenance' && !expenseSubcategory) return false;
          if (category === 'other' && !expenseSubcategory) return false;
        }
        return true;
      case 'vehicle': return true;
      default: return true;
    }
  };

  const goNext = () => {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    }
  };

  const goPrev = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setStep(steps[idx - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast({
          title: language === 'el' ? 'Σφάλμα' : 'Error',
          description: language === 'el' ? 'Πρέπει να είστε συνδεδεμένοι' : 'You must be logged in',
          variant: 'destructive'
        });
        return;
      }

      const record: any = {
        user_id: session.session.user.id,
        type,
        amount: parseFloat(amount),
        category: type === 'income' ? 'sales' : (category || 'other'),
        description: description || null,
        start_date: startDate,
        frequency_value: parseInt(frequencyValue),
        frequency_unit: frequencyUnit,
        next_generation_date: startDate,
        is_active: true,
      };

      if (vehicleId) {
        record.vehicle_id = vehicleId;
      }

      if (type === 'income') {
        record.income_source_type = incomeSourceType;
        if ((incomeSourceType === 'collaboration' || incomeSourceType === 'other') && incomeSourceSpec) {
          record.income_source_specification = incomeSourceSpec;
        }
      }

      if (type === 'expense' && expenseSubcategory) {
        record.expense_subcategory = expenseSubcategory;
      }

      const { error } = await supabase
        .from('recurring_transactions')
        .insert(record);

      if (error) throw error;

      toast({
        title: language === 'el' ? 'Επιτυχία' : 'Success',
        description: language === 'el' 
          ? 'Η επαναλαμβανόμενη συναλλαγή δημιουργήθηκε'
          : 'Recurring transaction has been created',
      });

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία δημιουργίας' : 'Failed to create recurring transaction',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'type': return language === 'el' ? 'Τύπος Συναλλαγής' : 'Transaction Type';
      case 'date': return language === 'el' ? 'Ημερομηνία Έναρξης' : 'Start Date';
      case 'frequency': return language === 'el' ? 'Συχνότητα' : 'Frequency';
      case 'amount': return language === 'el' ? 'Ποσό' : 'Amount';
      case 'details': return language === 'el' ? 'Κατηγορία & Περιγραφή' : 'Category & Description';
      case 'vehicle': return language === 'el' ? 'Σύνδεση με Όχημα' : 'Link to Vehicle';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {language === 'el' ? 'Νέα Επαναλαμβανόμενη Συναλλαγή' : 'New Recurring Transaction'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {language === 'el' ? 'Βήμα' : 'Step'} {currentStepIndex + 1} / {steps.length}: {getStepTitle()}
          </p>
        </DialogHeader>

        <div className="py-4 min-h-[200px]">
          {/* Step 1: Type */}
          {step === 'type' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'el' 
                  ? 'Επιλέξτε αν πρόκειται για έσοδο ή έξοδο:'
                  : 'Select whether this is income or expense:'}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={type === 'income' ? 'default' : 'outline'}
                  className={type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setType('income')}
                >
                  {language === 'el' ? 'Έσοδο' : 'Income'}
                </Button>
                <Button
                  variant={type === 'expense' ? 'default' : 'outline'}
                  className={type === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setType('expense')}
                >
                  {language === 'el' ? 'Έξοδο' : 'Expense'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Start Date */}
          {step === 'date' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'el' 
                  ? 'Ορίστε πότε θα ξεκινήσει η επανάληψη:'
                  : 'Set when the repetition will start:'}
              </p>
              <div className="space-y-2">
                <Label>{language === 'el' ? 'Ημερομηνία Έναρξης' : 'Start Date'}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Frequency */}
          {step === 'frequency' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'el' 
                  ? 'Ορίστε πόσο συχνά θα δημιουργείται:'
                  : 'Define how often it will be generated:'}
              </p>
              <div className="flex items-center gap-3">
                <div className="space-y-2 flex-1">
                  <Label>{language === 'el' ? 'Κάθε' : 'Every'}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={frequencyValue}
                    onChange={(e) => setFrequencyValue(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>{language === 'el' ? 'Μονάδα' : 'Unit'}</Label>
                  <Select value={frequencyUnit} onValueChange={(v) => setFrequencyUnit(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">{language === 'el' ? 'Εβδομάδα(ες)' : 'Week(s)'}</SelectItem>
                      <SelectItem value="month">{language === 'el' ? 'Μήνα(ες)' : 'Month(s)'}</SelectItem>
                      <SelectItem value="year">{language === 'el' ? 'Έτος(η)' : 'Year(s)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {language === 'el' 
                  ? `Παράδειγμα: Θα δημιουργείται συναλλαγή κάθε ${frequencyValue} ${frequencyUnit === 'week' ? 'εβδομάδα(ες)' : frequencyUnit === 'month' ? 'μήνα(ες)' : 'έτος(η)'}`
                  : `Example: A transaction will be created every ${frequencyValue} ${frequencyUnit}(s)`}
              </p>
            </div>
          )}

          {/* Step 4: Amount */}
          {step === 'amount' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'el' 
                  ? 'Εισάγετε το ποσό για κάθε συναλλαγή:'
                  : 'Enter the amount for each transaction:'}
              </p>
              <div className="space-y-2">
                <Label>{language === 'el' ? 'Ποσό (€)' : 'Amount (€)'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Step 5: Category & Description */}
          {step === 'details' && (
            <div className="space-y-4">
              {type === 'income' && (
                <>
                  <div className="space-y-2">
                    <Label>{language === 'el' ? 'Πηγή Εσόδου' : 'Income Source'}</Label>
                    <Select value={incomeSourceType} onValueChange={setIncomeSourceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk_in">{language === 'el' ? 'Επιτόπια' : 'Walk-in'}</SelectItem>
                        <SelectItem value="internet">{language === 'el' ? 'Διαδίκτυο' : 'Internet'}</SelectItem>
                        <SelectItem value="phone">{language === 'el' ? 'Τηλέφωνο' : 'Phone'}</SelectItem>
                        <SelectItem value="collaboration">{language === 'el' ? 'Συνεργασία' : 'Collaboration'}</SelectItem>
                        <SelectItem value="other">{language === 'el' ? 'Άλλο' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(incomeSourceType === 'collaboration' || incomeSourceType === 'other') && (
                    <div className="space-y-2">
                      <Label>{language === 'el' ? 'Προσδιορισμός' : 'Specification'}</Label>
                      <Input
                        value={incomeSourceSpec}
                        onChange={(e) => setIncomeSourceSpec(e.target.value)}
                        placeholder={language === 'el' ? 'π.χ. Hotel Blue Bay' : 'e.g. Hotel Blue Bay'}
                      />
                    </div>
                  )}
                </>
              )}

              {type === 'expense' && (
                <>
                  <div className="space-y-2">
                    <Label>{language === 'el' ? 'Κατηγορία' : 'Category'}</Label>
                    <Select value={category} onValueChange={setCategory} disabled={isLanguageLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {isBoats ? (
                            <>
                              <SelectItem value="fuel">{language === 'el' ? 'Καύσιμα' : 'Fuel'}</SelectItem>
                              <SelectItem value="maintenance">{language === 'el' ? 'Συντήρηση' : 'Maintenance'}</SelectItem>
                              <SelectItem value="cleaning">{language === 'el' ? 'Καθαρισμός' : 'Cleaning'}</SelectItem>
                              <SelectItem value="docking">{language === 'el' ? 'Ελλιμενισμός' : 'Docking'}</SelectItem>
                              <SelectItem value="licensing">{language === 'el' ? 'Άδειες' : 'Licensing'}</SelectItem>
                              <SelectItem value="salary">{language === 'el' ? 'Μισθοί' : 'Salaries'}</SelectItem>
                              <SelectItem value="other">{language === 'el' ? 'Άλλο' : 'Other'}</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="fuel">{language === 'el' ? 'Καύσιμα' : 'Fuel'}</SelectItem>
                              <SelectItem value="maintenance">{language === 'el' ? 'Συντήρηση' : 'Maintenance'}</SelectItem>
                              <SelectItem value="carwash">{language === 'el' ? 'Πλύσιμο' : 'Car Wash'}</SelectItem>
                              <SelectItem value="insurance">{language === 'el' ? 'Ασφάλεια' : 'Insurance'}</SelectItem>
                              <SelectItem value="tax">{language === 'el' ? 'Φόροι/Τέλη' : 'Taxes/Fees'}</SelectItem>
                              <SelectItem value="salary">{language === 'el' ? 'Μισθοί' : 'Salaries'}</SelectItem>
                              <SelectItem value="other">{language === 'el' ? 'Άλλο' : 'Other'}</SelectItem>
                            </>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {category === 'maintenance' && (
                    <div className="space-y-2">
                      <Label>{language === 'el' ? 'Τύπος Συντήρησης' : 'Maintenance Type'} *</Label>
                      <Select value={expenseSubcategory} onValueChange={setExpenseSubcategory}>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {getMaintenanceTypeOptions(language).map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {category === 'other' && (
                    <div className="space-y-2">
                      <Label>{language === 'el' ? 'Προσδιορισμός' : 'Specification'} *</Label>
                      <Input
                        value={expenseSubcategory}
                        onChange={(e) => setExpenseSubcategory(e.target.value)}
                        placeholder={language === 'el' ? 'Περιγράψτε...' : 'Describe...'}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>{language === 'el' ? 'Περιγραφή (προαιρετικό)' : 'Description (optional)'}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={language === 'el' ? 'Σημειώσεις...' : 'Notes...'}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 6: Vehicle Link */}
          {step === 'vehicle' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'el' 
                  ? 'Προαιρετικά, συνδέστε με όχημα για να επηρεάζει το κέρδος/ζημία του:'
                  : 'Optionally, link to a vehicle to affect its profit/loss:'}
              </p>
              <div className="space-y-2">
                <Label>{language === 'el' ? 'Όχημα' : 'Vehicle'}</Label>
                <Select value={vehicleId || "__none__"} onValueChange={(v) => setVehicleId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Κανένα (γενικό)' : 'None (general)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{language === 'el' ? 'Κανένα (γενικό)' : 'None (general)'}</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.make} {v.model} ({v.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {vehicleId && (
                <p className="text-xs text-muted-foreground">
                  {language === 'el' 
                    ? 'Οι συναλλαγές θα επηρεάζουν τα οικονομικά αυτού του οχήματος.'
                    : 'Transactions will affect this vehicle\'s finances.'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={currentStepIndex === 0 || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'el' ? 'Πίσω' : 'Back'}
          </Button>

          {step === 'vehicle' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {language === 'el' ? 'Δημιουργία' : 'Create'}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canGoNext()}>
              {language === 'el' ? 'Επόμενο' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
