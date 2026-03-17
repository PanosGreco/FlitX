import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, RefreshCw, Loader2, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddRecurringTransactionDialog } from "./AddRecurringTransactionDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string | null;
  vehicle_id: string | null;
  start_date: string;
  end_date?: string | null;
  frequency_value: number;
  frequency_unit: 'week' | 'month' | 'year';
  next_generation_date: string;
  last_generated_date?: string | null;
  is_active: boolean;
  income_source_type?: string | null;
  income_source_specification?: string | null;
  expense_subcategory?: string | null;
  is_fixed_cost?: boolean;
}
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  fuel_type?: string;
}
interface RecurringTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionsGenerated?: () => void;
}

const getCategoryLabel = (category: string, type: string, t: any, incomeSourceType?: string | null, expenseSubcategory?: string | null, incomeSourceSpecification?: string | null): string => {
  const categoryKeys: Record<string, string> = {
    sales: 'finance:sales',
    fuel: 'finance:fuel',
    maintenance: 'finance:maintenance',
    vehicle_parts: 'finance:vehiclePartsLabel',
    carwash: 'finance:carWash',
    insurance: 'finance:insurance',
    tax: 'finance:taxesFees',
    salary: 'finance:salaries',
    marketing: 'finance:marketing',
    other: 'finance:other',
    cleaning: 'finance:cleaning',
    docking: 'finance:docking',
    licensing: 'finance:licensing'
  };

  const base = categoryKeys[category] ? t(categoryKeys[category]) : category;

  if (type === 'income' && incomeSourceType) {
    const sourceKeys: Record<string, string> = {
      walk_in: 'finance:directBooking',
      collaboration: 'finance:collaboration',
      other: 'finance:other'
    };
    const sourceLabel = sourceKeys[incomeSourceType] ? t(sourceKeys[incomeSourceType]) : incomeSourceType;
    if (incomeSourceType === 'other' && incomeSourceSpecification) {
      return incomeSourceSpecification;
    }
    if (incomeSourceType === 'collaboration' && incomeSourceSpecification) {
      return `${incomeSourceSpecification} – ${sourceLabel}`;
    }
    return `${base} - ${sourceLabel}`;
  }

  if (type === 'expense' && category === 'maintenance' && expenseSubcategory) {
    return `${base} - ${expenseSubcategory}`;
  }
  if (type === 'expense' && category === 'other' && expenseSubcategory) {
    return expenseSubcategory;
  }
  return base;
};

const calculateNextDate = (fromDate: string, frequencyValue: number, frequencyUnit: string): string => {
  const nextDate = new Date(fromDate);
  switch (frequencyUnit) {
    case 'week':
      nextDate.setDate(nextDate.getDate() + 7 * frequencyValue);
      break;
    case 'month':
      nextDate.setMonth(nextDate.getMonth() + frequencyValue);
      break;
    case 'year':
      nextDate.setFullYear(nextDate.getFullYear() + frequencyValue);
      break;
  }
  return nextDate.toISOString().split('T')[0];
};

export function RecurringTransactionsModal({
  open,
  onOpenChange,
  onTransactionsGenerated
}: RecurringTransactionsModalProps) {
  const { t } = useTranslation(['finance', 'common']);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { language } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchRecurringTransactions();
      fetchVehicles();
    }
  }, [open]);

  const fetchRecurringTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('recurring_transactions').select('*').order('is_active', { ascending: false }).order('type', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      setRecurringTransactions((data || []) as RecurringTransaction[]);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      toast({
        title: t('finance:error'),
        description: t('finance:failedToLoad'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase.from('vehicles').select('id, make, model, year, fuel_type').order('make');
      if (!error && data) {
        setVehicles(data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', deleteId);
      if (error) throw error;
      toast({
        title: t('finance:deleted'),
        description: t('finance:recurringDeleted')
      });
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast({
        title: t('finance:error'),
        description: t('finance:failedToDeleteRecurring'),
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const generateDueTransactions = async () => {
    setIsGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const { data: dueTransactions, error } = await supabase.from('recurring_transactions').select('*').eq('is_active', true).lte('next_generation_date', todayStr);
      if (error) throw error;
      let generatedCount = 0;
      const MAX_ITERATIONS = 100;

      for (const recurring of dueTransactions || []) {
        const vehicle = vehicles.find(v => v.id === recurring.vehicle_id);
        let currentNextDate = recurring.next_generation_date;
        let currentLastDate = recurring.last_generated_date;
        let iterations = 0;
        let shouldDeactivate = false;

        while (currentNextDate <= todayStr && iterations < MAX_ITERATIONS) {
          if (recurring.end_date && currentNextDate > recurring.end_date) {
            shouldDeactivate = true;
            break;
          }

          const { data: existingRecord } = await supabase.from('financial_records').select('id').eq('date', currentNextDate).eq('category', recurring.category).eq('amount', recurring.amount).eq('source_section', 'recurring').eq('type', recurring.type as 'income' | 'expense').eq('user_id', session.session.user.id).maybeSingle();
          if (!existingRecord) {
            const newRecord: any = {
              user_id: session.session.user.id,
              type: recurring.type,
              category: recurring.category,
              amount: recurring.amount,
              date: currentNextDate,
              description: recurring.description || `${recurring.type === 'income' ? 'Recurring Income' : 'Recurring Expense'}`,
              source_section: 'recurring',
              vehicle_id: recurring.vehicle_id
            };
            if (vehicle) {
              newRecord.vehicle_fuel_type = vehicle.fuel_type || 'petrol';
              newRecord.vehicle_year = vehicle.year;
            }
            if (recurring.type === 'income' && recurring.income_source_type) {
              newRecord.income_source_type = recurring.income_source_type;
            }
            if (recurring.type === 'expense' && recurring.expense_subcategory) {
              newRecord.expense_subcategory = recurring.expense_subcategory;
            }
            const { error: insertError } = await supabase.from('financial_records').insert(newRecord);
            if (insertError) {
              console.error('Error generating transaction:', insertError);
              break;
            }
            generatedCount++;
          }

          currentLastDate = currentNextDate;
          currentNextDate = calculateNextDate(currentNextDate, recurring.frequency_value, recurring.frequency_unit);
          iterations++;

          if (recurring.end_date && currentNextDate > recurring.end_date) {
            shouldDeactivate = true;
          }
        }

        const updateData: any = {
          last_generated_date: currentLastDate,
          next_generation_date: currentNextDate
        };
        if (shouldDeactivate) {
          updateData.is_active = false;
        }
        await supabase.from('recurring_transactions').update(updateData).eq('id', recurring.id);
      }
      if (generatedCount > 0) {
        toast({
          title: t('finance:success'),
          description: t('finance:generatedTransactions', { count: generatedCount })
        });
        onTransactionsGenerated?.();
        fetchRecurringTransactions();
      } else {
        toast({
          title: t('finance:info'),
          description: t('finance:noTransactionsDue')
        });
      }
    } catch (error) {
      console.error('Error generating transactions:', error);
      toast({
        title: t('finance:error'),
        description: t('finance:failedToGenerate'),
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sortedByActive = (items: RecurringTransaction[]) => {
    const active = items.filter(t => t.is_active);
    const completed = items.filter(t => !t.is_active);
    return [...active, ...completed];
  };
  const incomeTransactions = sortedByActive(recurringTransactions.filter(t => t.type === 'income'));
  const expenseTransactions = sortedByActive(recurringTransactions.filter(t => t.type === 'expense'));
  const hasActiveTransactions = recurringTransactions.some(t => t.is_active);
  const totalFixedCosts = expenseTransactions
    .filter(tx => tx.is_fixed_cost && tx.is_active)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const getVehicleName = (vehicleId: string | null) => {
    if (!vehicleId) return null;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : null;
  };

  const getFrequencyLabel = (value: number, unit: string) => {
    const form = value === 1 ? 'Singular' : 'Plural';
    const key = `finance:${unit}${form}`;
    return `${value} ${t(key)}`;
  };

  const formatEuropeanDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const isEmpty = incomeTransactions.length === 0 && expenseTransactions.length === 0;

  const renderCard = (tx: RecurringTransaction, colorScheme: 'green' | 'red') => {
    const isCompleted = !tx.is_active;
    const bgClass = colorScheme === 'green' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
    const amountClass = colorScheme === 'green' ? 'text-green-700' : 'text-red-700';
    return <div key={tx.id} className={`border rounded-lg p-3 relative flex items-start justify-between gap-2 ${bgClass} ${isCompleted ? 'opacity-60' : ''}`}>
        {tx.is_fixed_cost && tx.type === 'expense' && (
          <Badge variant="secondary" className="absolute top-2 right-10 text-[10px] px-1.5 py-0 h-5 bg-amber-100 text-amber-800 border-amber-200">
            <Pin className="h-3 w-3 mr-0.5" />
            {t('finance:fixedCost')}
          </Badge>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate font-semibold">
            {getCategoryLabel(tx.category, tx.type, t, tx.income_source_type, tx.expense_subcategory, tx.income_source_specification)}
          </p>
          {tx.description && <p className="text-muted-foreground truncate text-sm">{tx.description}</p>}
          <p className={`font-semibold ${amountClass}`}>€{tx.amount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            {t('finance:every')} {getFrequencyLabel(tx.frequency_value, tx.frequency_unit)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('finance:start')}: {formatEuropeanDate(tx.start_date)}
          </p>
          {tx.end_date && <p className="text-xs text-muted-foreground">
              {t('finance:end')}: {formatEuropeanDate(tx.end_date)}
            </p>}
          {getVehicleName(tx.vehicle_id) && <p className="text-xs text-muted-foreground truncate">
              {getVehicleName(tx.vehicle_id)}
            </p>}
          {isCompleted && <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${colorScheme === 'green' ? 'bg-green-200 text-green-800' : 'bg-muted text-muted-foreground'}`}>
              {t('finance:completed')}
            </span>}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(tx.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>;
  };

  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle>
              {t('finance:recurringIncomeExpenses')}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generateDueTransactions} disabled={isGenerating || !hasActiveTransactions}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('finance:generate')}
              </Button>
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('finance:addNew')}
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div> : isEmpty ? <div className="flex-1 flex items-center justify-center py-12 px-6">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('finance:noRecurringYet')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('finance:recurringDescription')}
                </p>
                <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('finance:addYourFirst')}
                </Button>
              </div>
            </div> : <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                <div className="space-y-3">
                  <h3 className="font-semibold text-green-600 border-b border-green-200 pb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    {t('finance:recurringIncome')}
                    <span className="text-xs text-muted-foreground font-normal">({incomeTransactions.length})</span>
                  </h3>
                  {incomeTransactions.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">
                      {t('finance:noRecurringIncome')}
                    </p> : <div className="space-y-2">
                      {incomeTransactions.map(tx => renderCard(tx, 'green'))}
                    </div>}
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-red-600 border-b border-red-200 pb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    {t('finance:recurringExpenses')}
                    <span className="text-xs text-muted-foreground font-normal">({expenseTransactions.length})</span>
                  </h3>
                  {expenseTransactions.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">
                      {t('finance:noRecurringExpenses')}
                    </p> : <div className="space-y-2">
                      {expenseTransactions.map(tx => renderCard(tx, 'red'))}
                      {totalFixedCosts > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                              <Pin className="h-3.5 w-3.5" />
                              {t('finance:totalFixedCosts')}
                            </span>
                            <span className="text-sm font-bold text-amber-900">
                              €{totalFixedCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>}
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      <AddRecurringTransactionDialog open={isAddOpen} onOpenChange={setIsAddOpen} vehicles={vehicles} onSuccess={() => {
      fetchRecurringTransactions();
      setIsAddOpen(false);
    }} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('finance:deleteRecurring')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('finance:deleteRecurringDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('common:cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('finance:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}
