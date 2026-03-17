import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { getMaintenanceTypeOptions } from "@/constants/maintenanceTypes";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation(['finance', 'common']);
  const [step, setStep] = useState<Step>('type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  useEffect(() => {
    if (open) {
      fetchRecurringCategories();
    }
  }, [open]);

  const fetchRecurringCategories = async () => {
    try {
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
          title: t('finance:error'),
          description: t('finance:mustBeLoggedIn'),
          variant: 'destructive'
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      const shouldGenerateImmediately = startDateObj <= today;

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

      if (endDate) record.end_date = endDate;
      if (vehicleId) record.vehicle_id = vehicleId;

      if (type === 'income') {
        record.income_source_type = incomeSourceType;
        if ((incomeSourceType === 'collaboration' || incomeSourceType === 'other') && incomeSourceSpec) {
          record.income_source_specification = incomeSourceSpec;
        }
      }

      if (type === 'expense' && expenseSubcategory) {
        record.expense_subcategory = expenseSubcategory;
      }

      const { error } = await supabase.from('recurring_transactions').insert(record);
      if (error) throw error;

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

        const { error: recordError } = await supabase.from('financial_records').insert(financialRecord);
        if (recordError) {
          console.error('Error creating first financial record:', recordError);
        }
      }

      toast({
        title: t('finance:success'),
        description: shouldGenerateImmediately
          ? t('finance:recurringCreatedFirst')
          : t('finance:recurringCreated'),
      });

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      toast({
        title: t('finance:error'),
        description: t('finance:failedToCreate'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'type': return t('finance:transactionTypeStep');
      case 'date': return t('finance:startDate');
      case 'end_date': return t('finance:endDate');
      case 'frequency': return t('finance:frequency');
      case 'amount': return t('finance:amount');
      case 'details': return t('finance:categoryDescription');
      case 'vehicle': return t('finance:linkToVehicle');
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('finance:newRecurring')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('finance:step')} {currentStepIndex + 1} / {steps.length}: {getStepTitle()}
          </p>
        </DialogHeader>

        <div className="py-4 min-h-[200px]">
          {step === 'type' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('finance:selectIncomeOrExpense')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={type === 'income' ? 'default' : 'outline'}
                  className={type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setType('income')}
                >
                  {t('finance:income')}
                </Button>
                <Button
                  variant={type === 'expense' ? 'default' : 'outline'}
                  className={type === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setType('expense')}
                >
                  {t('finance:expense')}
                </Button>
              </div>
            </div>
          )}

          {step === 'date' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('finance:setRepetitionStart')}
              </p>
              <div className="space-y-2">
                <Label>{t('finance:startDate')}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
          )}

          {step === 'end_date' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('finance:setRepetitionEnd')}
              </p>
              <div className="space-y-2">
                <Label>{t('finance:endDateOptional')}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
              </div>
              {endDate && endDate < startDate && (
                <p className="text-xs text-destructive">{t('finance:endDateAfterStart')}</p>
              )}
              <p className="text-xs text-muted-foreground">{t('finance:noEndDateNote')}</p>
            </div>
          )}

          {step === 'frequency' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('finance:defineFrequency')}
              </p>
              <div className="flex items-center gap-3">
                <div className="space-y-2 flex-1">
                  <Label>{t('finance:every')}</Label>
                  <Input type="number" min="1" value={frequencyValue} onChange={(e) => setFrequencyValue(e.target.value)} placeholder="1" />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>{t('finance:unit')}</Label>
                  <Select value={frequencyUnit} onValueChange={(v) => setFrequencyUnit(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">{t('finance:weekUnit')}</SelectItem>
                      <SelectItem value="month">{t('finance:monthUnit')}</SelectItem>
                      <SelectItem value="year">{t('finance:yearUnit')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('finance:frequencyExample', { value: frequencyValue, unit: frequencyUnit })}
              </p>
            </div>
          )}

          {step === 'amount' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('finance:enterAmount')}</p>
              <div className="space-y-2">
                <Label>{t('finance:amountEur')}</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              {type === 'income' && (
                <>
                  <div className="space-y-2">
                    <Label>{t('finance:incomeSource')}</Label>
                    <Select value={incomeSourceType} onValueChange={(val) => {
                      if (val.startsWith('__rcustom__:')) {
                        const spec = val.replace('__rcustom__:', '');
                        setIncomeSourceType('other');
                        setIncomeSourceSpec(spec);
                      } else {
                        setIncomeSourceType(val);
                        if (val !== 'collaboration' && val !== 'other') setIncomeSourceSpec('');
                      }
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk_in">{t('finance:directBooking')}</SelectItem>
                        <SelectItem value="collaboration">{t('finance:collaboration')}</SelectItem>
                        {recurringIncomeCategories.map((cat) => (
                          <SelectItem key={cat} value={`__rcustom__:${cat}`}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="other">{t('finance:other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(incomeSourceType === 'collaboration' || incomeSourceType === 'other') && (
                    <div className="space-y-2">
                      <Label>{t('finance:specification')}</Label>
                      <Input value={incomeSourceSpec} onChange={(e) => setIncomeSourceSpec(e.target.value)} placeholder={t('finance:specifySource')} />
                    </div>
                  )}
                </>
              )}

              {type === 'expense' && (
                <>
                  <div className="space-y-2">
                    <Label>{t('finance:category')}</Label>
                    <Select value={category} onValueChange={(val) => {
                      if (val.startsWith('__rcustom_exp__:')) {
                        const spec = val.replace('__rcustom_exp__:', '');
                        setCategory('other');
                        setExpenseSubcategory(spec);
                      } else {
                        setCategory(val);
                        if (val !== 'maintenance' && val !== 'other' && val !== 'marketing' && val !== 'tax') setExpenseSubcategory('');
                      }
                    }} disabled={isLanguageLoading}>
                      <SelectTrigger><SelectValue placeholder={t('finance:selectCategory')} /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {isBoats ? (
                            <>
                              <SelectItem value="fuel">{t('finance:fuel')}</SelectItem>
                              <SelectItem value="maintenance">{t('finance:maintenance')}</SelectItem>
                              <SelectItem value="cleaning">{t('finance:cleaning')}</SelectItem>
                              <SelectItem value="docking">{t('finance:docking')}</SelectItem>
                              <SelectItem value="licensing">{t('finance:licensing')}</SelectItem>
                              <SelectItem value="salary">{t('finance:salaries')}</SelectItem>
                              {recurringExpenseCategories.map((cat) => (
                                <SelectItem key={cat} value={`__rcustom_exp__:${cat}`}>{cat}</SelectItem>
                              ))}
                              <SelectItem value="other">{t('finance:other')}</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="fuel">{t('finance:fuel')}</SelectItem>
                              <SelectItem value="maintenance">{t('finance:maintenance')}</SelectItem>
                              <SelectItem value="vehicle_parts">{t('finance:vehiclePartsLabel')}</SelectItem>
                              <SelectItem value="carwash">{t('finance:carWash')}</SelectItem>
                              <SelectItem value="insurance">{t('finance:insurance')}</SelectItem>
                              <SelectItem value="tax">{t('finance:taxesFees')}</SelectItem>
                              <SelectItem value="salary">{t('finance:salaries')}</SelectItem>
                              <SelectItem value="marketing">{t('finance:marketing')}</SelectItem>
                              {recurringExpenseCategories.map((cat) => (
                                <SelectItem key={cat} value={`__rcustom_exp__:${cat}`}>{cat}</SelectItem>
                              ))}
                              <SelectItem value="other">{t('finance:other')}</SelectItem>
                            </>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {category === 'maintenance' && (
                    <div className="space-y-2">
                      <Label>{t('finance:maintenanceType')} *</Label>
                      <Select value={expenseSubcategory} onValueChange={setExpenseSubcategory}>
                        <SelectTrigger><SelectValue placeholder={t('finance:selectCategory')} /></SelectTrigger>
                        <SelectContent>
                          {getMaintenanceTypeOptions(language).map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {category === 'other' && (
                    <div className="space-y-2">
                      <Label>{t('finance:specificationRequired')} *</Label>
                      <Input value={expenseSubcategory} onChange={(e) => setExpenseSubcategory(e.target.value)} placeholder={t('finance:specifySource')} />
                    </div>
                  )}

                  {category === 'marketing' && (
                    <div className="space-y-2">
                      <Label>{t('finance:specificationOptional')}</Label>
                      <Input value={expenseSubcategory} onChange={(e) => setExpenseSubcategory(e.target.value)} placeholder={t('finance:specifySource')} />
                    </div>
                  )}

                  {category === 'tax' && (
                    <div className="space-y-2">
                      <Label>{t('finance:taxFeeType')}</Label>
                      <Input value={expenseSubcategory} onChange={(e) => setExpenseSubcategory(e.target.value)} placeholder={t('finance:specifySource')} />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>{t('finance:descriptionOptional')}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('finance:notes')} rows={2} />
              </div>
            </div>
          )}

          {step === 'vehicle' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('finance:linkVehicleDesc')}</p>
              <div className="space-y-2">
                <Label>{t('finance:vehicle')}</Label>
                <Select value={vehicleId || "__none__"} onValueChange={(v) => setVehicleId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t('finance:noneGeneral')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('finance:noneGeneral')}</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {vehicleId && (
                <p className="text-xs text-muted-foreground">{t('finance:vehicleFinanceNote')}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={goPrev} disabled={currentStepIndex === 0 || isSubmitting}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('finance:back')}
          </Button>

          {step === 'vehicle' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t('finance:create')}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canGoNext()}>
              {t('finance:next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
