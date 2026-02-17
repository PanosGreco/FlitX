import { useState, useEffect } from "react";
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

type Step = 'type' | 'date' | 'end_date' | 'frequency' | 'amount' | 'details' | 'vehicle';

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
  const [endDate, setEndDate] = useState<string>('');
  const [frequencyValue, setFrequencyValue] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState<'week' | 'month' | 'year'>('month');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [incomeSourceType, setIncomeSourceType] = useState('walk_in');
  const [incomeSourceSpec, setIncomeSourceSpec] = useState('');
  const [expenseSubcategory, setExpenseSubcategory] = useState('');
  const [recurringIncomeCategories, setRecurringIncomeCategories] = useState<string[]>([]);
  const [recurringExpenseCategories, setRecurringExpenseCategories] = useState<string[]>([]);
  
  const { language, isLanguageLoading } = useLanguage();
  const { toast } = useToast();
  const isBoats = isBoatBusiness();

  // Fetch isolated recurring categories
  useEffect(() => {
    if (open) {
      fetchRecurringCategories();
    }
  }, [open]);

  const fetchRecurringCategories = async () => {
    try {
      // Recurring income: distinct specs where income_source_type = 'other'
      const { data: incomeData } = await supabase
        .from('recurring_transactions')
        .select('income_source_specification')
        .eq('type', 'income')
        .eq('income_source_type', 'other')
        .not('income_source_specification', 'is', null);

      if (incomeData) {
        const unique = [...new Set(
          incomeData.map(r => r.income_source_specification?.trim()).filter(Boolean)
        )] as string[];
        setRecurringIncomeCategories(unique);
      }

      // Recurring expense: distinct subcategories where category = 'other'
      const { data: expenseData } = await supabase
        .from('recurring_transactions')
        .select('expense_subcategory')
        .eq('type', 'expense')
        .eq('category', 'other')
        .not('expense_subcategory', 'is', null);

      if (expenseData) {
        const unique = [...new Set(
          expenseData.map(r => r.expense_subcategory?.trim()).filter(Boolean)
        )] as string[];
        setRecurringExpenseCategories(unique);
      }
    } catch (error) {
      console.error('Error fetching recurring categories:', error);
    }
  };

  const resetForm = () => {
    setStep('type');
    setType('income');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
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

  const steps: Step[] = ['type', 'date', 'end_date', 'frequency', 'amount', 'details', 'vehicle'];
  const currentStepIndex = steps.indexOf(step);

  const canGoNext = () => {
    switch (step) {
      case 'type': return true;
      case 'date': return !!startDate;
      case 'end_date': {
        // End date is optional, but if provided must be >= start date
        if (endDate && startDate) {
          return endDate >= startDate;
        }
        return true;
      }
      case 'frequency': return !!frequencyValue && parseInt(frequencyValue) > 0;
      case 'amount': return !!amount && parseFloat(amount) > 0;
      case 'details': 
        if (type === 'expense') {
          if (!category) return false;
          if (category === 'maintenance' && !expenseSubcategory) return false;
          if (category === 'other' && !expenseSubcategory) return false;
          // Marketing specification is optional
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      // Check if start date is today or in the past
      const shouldGenerateImmediately = startDateObj <= today;

      // Calculate initial next_generation_date
      let initialNextGenerationDate = startDate;
      
      if (shouldGenerateImmediately) {
        const nextDate = new Date(startDate);
        switch (frequencyUnit) {
          case 'week':
            nextDate.setDate(nextDate.getDate() + (7 * parseInt(frequencyValue)));
            break;
          case 'month':
            nextDate.setMonth(nextDate.getMonth() + parseInt(frequencyValue));
            break;
          case 'year':
            nextDate.setFullYear(nextDate.getFullYear() + parseInt(frequencyValue));
            break;
        }
        initialNextGenerationDate = nextDate.toISOString().split('T')[0];
      }

      // Determine if already completed at creation (end_date exists and next_generation_date > end_date)
      let isActiveAtCreation = true;
      if (endDate && shouldGenerateImmediately) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(0, 0, 0, 0);
        const nextGenObj = new Date(initialNextGenerationDate);
        nextGenObj.setHours(0, 0, 0, 0);
        if (nextGenObj > endDateObj) {
          isActiveAtCreation = false;
        }
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
        next_generation_date: initialNextGenerationDate,
        last_generated_date: shouldGenerateImmediately ? startDate : null,
        is_active: isActiveAtCreation,
      };

      if (endDate) {
        record.end_date = endDate;
      }

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

      // If start date is today or in the past, immediately generate the first transaction
      if (shouldGenerateImmediately) {
        const selectedVehicle = vehicles.find(v => v.id === vehicleId);
        
        const financialRecord: any = {
          user_id: session.session.user.id,
          type,
          category: type === 'income' ? 'sales' : (category || 'other'),
          amount: parseFloat(amount),
          date: startDate,
          description: description || `${type === 'income' ? 'Recurring Income' : 'Recurring Expense'}`,
          source_section: 'recurring',
          vehicle_id: vehicleId || null,
        };

        if (selectedVehicle) {
          financialRecord.vehicle_fuel_type = selectedVehicle.fuel_type || 'petrol';
          financialRecord.vehicle_year = selectedVehicle.year;
        }

        if (type === 'income' && incomeSourceType) {
          financialRecord.income_source_type = incomeSourceType;
          if ((incomeSourceType === 'collaboration' || incomeSourceType === 'other') && incomeSourceSpec) {
            financialRecord.income_source_specification = incomeSourceSpec;
          }
        }

        if (type === 'expense' && expenseSubcategory) {
          financialRecord.expense_subcategory = expenseSubcategory;
        }

        const { error: recordError } = await supabase
          .from('financial_records')
          .insert(financialRecord);

        if (recordError) {
          console.error('Error creating first financial record:', recordError);
        }
      }

      toast({
        title: language === 'el' ? 'Επιτυχία' : 'Success',
        description: shouldGenerateImmediately
          ? (language === 'el' 
              ? 'Η επαναλαμβανόμενη συναλλαγή δημιουργήθηκε και η πρώτη καταχώρηση προστέθηκε'
              : 'Recurring transaction created and first record added')
          : (language === 'el' 
              ? 'Η επαναλαμβανόμενη συναλλαγή δημιουργήθηκε'
              : 'Recurring transaction has been created'),
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
      case 'end_date': return language === 'el' ? 'Ημερομηνία Λήξης' : 'End Date';
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

          {/* Step 3: End Date (Optional) */}
          {step === 'end_date' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'el' 
                  ? 'Προαιρετικά, ορίστε πότε θα σταματήσει η επανάληψη:'
                  : 'Optionally, set when the repetition will stop:'}
              </p>
              <div className="space-y-2">
                <Label>{language === 'el' ? 'Ημερομηνία Λήξης (προαιρετικό)' : 'End Date (optional)'}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
              {endDate && endDate < startDate && (
                <p className="text-xs text-destructive">
                  {language === 'el' 
                    ? 'Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης'
                    : 'End date must be after the start date'}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {language === 'el'
                  ? 'Αν δεν ορίσετε ημερομηνία λήξης, η επανάληψη θα συνεχίζεται επ\' αόριστον.'
                  : 'If no end date is set, the recurrence will continue indefinitely.'}
              </p>
            </div>
          )}

          {/* Step 4: Frequency */}
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

          {/* Step 5: Amount */}
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

          {/* Step 6: Category & Description */}
          {step === 'details' && (
            <div className="space-y-4">
              {type === 'income' && (
                <>
                  <div className="space-y-2">
                    <Label>{language === 'el' ? 'Πηγή Εσόδου' : 'Income Source'}</Label>
                    <Select value={incomeSourceType} onValueChange={(val) => {
                      if (val.startsWith('__rcustom__:')) {
                        const spec = val.replace('__rcustom__:', '');
                        setIncomeSourceType('other');
                        setIncomeSourceSpec(spec);
                      } else {
                        setIncomeSourceType(val);
                        if (val !== 'collaboration' && val !== 'other') {
                          setIncomeSourceSpec('');
                        }
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk_in">{language === 'el' ? 'Απευθείας Κράτηση' : 'Direct Booking'}</SelectItem>
                        <SelectItem value="collaboration">{language === 'el' ? 'Συνεργασία' : 'Collaboration'}</SelectItem>
                        {recurringIncomeCategories.map((cat) => (
                          <SelectItem key={cat} value={`__rcustom__:${cat}`}>{cat}</SelectItem>
                        ))}
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
                    <Select value={category} onValueChange={(val) => {
                      if (val.startsWith('__rcustom_exp__:')) {
                        const spec = val.replace('__rcustom_exp__:', '');
                        setCategory('other');
                        setExpenseSubcategory(spec);
                      } else {
                        setCategory(val);
                        if (val !== 'maintenance' && val !== 'other' && val !== 'marketing') {
                          setExpenseSubcategory('');
                        }
                      }
                    }} disabled={isLanguageLoading}>
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
                              {recurringExpenseCategories.map((cat) => (
                                <SelectItem key={cat} value={`__rcustom_exp__:${cat}`}>{cat}</SelectItem>
                              ))}
                              <SelectItem value="other">{language === 'el' ? 'Άλλο' : 'Other'}</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="fuel">{language === 'el' ? 'Καύσιμα' : 'Fuel'}</SelectItem>
                              <SelectItem value="maintenance">{language === 'el' ? 'Συντήρηση' : 'Maintenance'}</SelectItem>
                              <SelectItem value="vehicle_parts">{language === 'el' ? 'Ανταλλακτικά Οχήματος' : 'Vehicle Parts'}</SelectItem>
                              <SelectItem value="carwash">{language === 'el' ? 'Πλύσιμο' : 'Car Wash'}</SelectItem>
                              <SelectItem value="insurance">{language === 'el' ? 'Ασφάλεια' : 'Insurance'}</SelectItem>
                              <SelectItem value="tax">{language === 'el' ? 'Φόροι/Τέλη' : 'Taxes/Fees'}</SelectItem>
                              <SelectItem value="salary">{language === 'el' ? 'Μισθοί' : 'Salaries'}</SelectItem>
                              <SelectItem value="marketing">{language === 'el' ? 'Μάρκετινγκ' : 'Marketing'}</SelectItem>
                              {recurringExpenseCategories.map((cat) => (
                                <SelectItem key={cat} value={`__rcustom_exp__:${cat}`}>{cat}</SelectItem>
                              ))}
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
                        placeholder={language === 'el' ? 'π.χ. Γραφική ύλη' : 'e.g. Office supplies'}
                      />
                    </div>
                  )}

                  {category === 'marketing' && (
                    <div className="space-y-2">
                      <Label>{language === 'el' ? 'Προσδιορισμός (προαιρετικό)' : 'Specification (optional)'}</Label>
                      <Input
                        value={expenseSubcategory}
                        onChange={(e) => setExpenseSubcategory(e.target.value)}
                        placeholder={language === 'el' ? 'π.χ. Social Media, Google Ads...' : 'e.g. Social Media, Google Ads...'}
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

          {/* Step 7: Vehicle Link */}
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
