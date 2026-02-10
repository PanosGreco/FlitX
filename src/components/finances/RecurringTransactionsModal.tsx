import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddRecurringTransactionDialog } from "./AddRecurringTransactionDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

// Category label helper
const getCategoryLabel = (category: string, type: string, language: string, incomeSourceType?: string | null, expenseSubcategory?: string | null, incomeSourceSpecification?: string | null): string => {
  const labels: Record<string, {
    en: string;
    el: string;
  }> = {
    sales: {
      en: 'Sales',
      el: 'Πωλήσεις'
    },
    fuel: {
      en: 'Fuel',
      el: 'Καύσιμα'
    },
    maintenance: {
      en: 'Maintenance',
      el: 'Συντήρηση'
    },
    vehicle_parts: {
      en: 'Vehicle Parts',
      el: 'Ανταλλακτικά'
    },
    carwash: {
      en: 'Car Wash',
      el: 'Πλύσιμο'
    },
    insurance: {
      en: 'Insurance',
      el: 'Ασφάλεια'
    },
    tax: {
      en: 'Taxes/Fees',
      el: 'Φόροι/Τέλη'
    },
    salary: {
      en: 'Salaries',
      el: 'Μισθοί'
    },
    marketing: {
      en: 'Marketing',
      el: 'Μάρκετινγκ'
    },
    other: {
      en: 'Other',
      el: 'Άλλο'
    },
    cleaning: {
      en: 'Cleaning',
      el: 'Καθαρισμός'
    },
    docking: {
      en: 'Docking',
      el: 'Ελλιμενισμός'
    },
    licensing: {
      en: 'Licensing',
      el: 'Άδειες'
    }
  };
  const incomeSourceLabels: Record<string, {
    en: string;
    el: string;
  }> = {
    walk_in: {
      en: 'Walk-in',
      el: 'Επιτόπια'
    },
    internet: {
      en: 'Internet',
      el: 'Διαδίκτυο'
    },
    phone: {
      en: 'Phone',
      el: 'Τηλέφωνο'
    },
    collaboration: {
      en: 'Collaboration',
      el: 'Συνεργασία'
    },
    other: {
      en: 'Other',
      el: 'Άλλο'
    }
  };
  const lang = language === 'el' ? 'el' : 'en';
  const base = labels[category]?.[lang] || category;

  // For income: if source type is collaboration/other and specification exists, show "Specification – SourceType"
  if (type === 'income' && incomeSourceType) {
    const sourceLabel = incomeSourceLabels[incomeSourceType]?.[lang] || incomeSourceType;
    if ((incomeSourceType === 'collaboration' || incomeSourceType === 'other') && incomeSourceSpecification) {
      return `${incomeSourceSpecification} – ${sourceLabel}`;
    }
    return `${base} - ${sourceLabel}`;
  }

  // For maintenance expenses, append subcategory
  if (type === 'expense' && category === 'maintenance' && expenseSubcategory) {
    return `${base} - ${expenseSubcategory}`;
  }
  return base;
};

// Helper to calculate next date from a given date + frequency
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
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const {
    language
  } = useLanguage();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (open) {
      fetchRecurringTransactions();
      fetchVehicles();
    }
  }, [open]);
  const fetchRecurringTransactions = async () => {
    setIsLoading(true);
    try {
      // Fetch ALL recurring transactions (active + completed) so completed items are visible
      const {
        data,
        error
      } = await supabase.from('recurring_transactions').select('*').order('is_active', {
        ascending: false
      }).order('type', {
        ascending: true
      }).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setRecurringTransactions((data || []) as RecurringTransaction[]);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία φόρτωσης' : 'Failed to load recurring transactions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const fetchVehicles = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('vehicles').select('id, make, model, year, fuel_type').order('make');
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
      const {
        error
      } = await supabase.from('recurring_transactions').delete().eq('id', deleteId);
      if (error) throw error;
      toast({
        title: language === 'el' ? 'Διαγράφηκε' : 'Deleted',
        description: language === 'el' ? 'Η επαναλαμβανόμενη συναλλαγή διαγράφηκε' : 'Recurring transaction has been deleted'
      });
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία διαγραφής' : 'Failed to delete',
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
      const {
        data: session
      } = await supabase.auth.getSession();
      if (!session?.session?.user) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Get all active recurring transactions that are due
      const {
        data: dueTransactions,
        error
      } = await supabase.from('recurring_transactions').select('*').eq('is_active', true).lte('next_generation_date', todayStr);
      if (error) throw error;
      let generatedCount = 0;
      const MAX_ITERATIONS = 100; // Safety cap

      for (const recurring of dueTransactions || []) {
        const vehicle = vehicles.find(v => v.id === recurring.vehicle_id);
        let currentNextDate = recurring.next_generation_date;
        let currentLastDate = recurring.last_generated_date;
        let iterations = 0;
        let shouldDeactivate = false;

        // Catch-up loop: generate all missed cycles
        while (currentNextDate <= todayStr && iterations < MAX_ITERATIONS) {
          // Check end_date: if end_date exists and currentNextDate > end_date, stop
          if (recurring.end_date && currentNextDate > recurring.end_date) {
            shouldDeactivate = true;
            break;
          }

          // Duplicate prevention: check if a financial_record already exists for this cycle
          const {
            data: existingRecord
          } = await supabase.from('financial_records').select('id').eq('date', currentNextDate).eq('category', recurring.category).eq('amount', recurring.amount).eq('source_section', 'recurring').eq('type', recurring.type as 'income' | 'expense').eq('user_id', session.session.user.id).maybeSingle();
          if (!existingRecord) {
            // Generate financial record
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
            const {
              error: insertError
            } = await supabase.from('financial_records').insert(newRecord);
            if (insertError) {
              console.error('Error generating transaction:', insertError);
              break; // Stop this recurring rule on error
            }
            generatedCount++;
          }

          // Advance dates
          currentLastDate = currentNextDate;
          currentNextDate = calculateNextDate(currentNextDate, recurring.frequency_value, recurring.frequency_unit);
          iterations++;

          // Check if new next date exceeds end_date -> mark for deactivation
          if (recurring.end_date && currentNextDate > recurring.end_date) {
            shouldDeactivate = true;
          }
        }

        // Update the recurring transaction with new dates and potentially deactivate
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
          title: language === 'el' ? 'Επιτυχία' : 'Success',
          description: language === 'el' ? `Δημιουργήθηκαν ${generatedCount} συναλλαγές` : `Generated ${generatedCount} transactions`
        });
        onTransactionsGenerated?.();
        fetchRecurringTransactions();
      } else {
        toast({
          title: language === 'el' ? 'Ενημέρωση' : 'Info',
          description: language === 'el' ? 'Δεν υπάρχουν συναλλαγές προς δημιουργία' : 'No transactions are due for generation'
        });
      }
    } catch (error) {
      console.error('Error generating transactions:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία δημιουργίας' : 'Failed to generate transactions',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Sort: active items first, then completed at bottom
  const sortedByActive = (items: RecurringTransaction[]) => {
    const active = items.filter(t => t.is_active);
    const completed = items.filter(t => !t.is_active);
    return [...active, ...completed];
  };
  const incomeTransactions = sortedByActive(recurringTransactions.filter(t => t.type === 'income'));
  const expenseTransactions = sortedByActive(recurringTransactions.filter(t => t.type === 'expense'));
  const hasActiveTransactions = recurringTransactions.some(t => t.is_active);
  const getVehicleName = (vehicleId: string | null) => {
    if (!vehicleId) return null;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : null;
  };
  const getFrequencyLabel = (value: number, unit: string) => {
    const unitLabels: Record<string, {
      singular: {
        en: string;
        el: string;
      };
      plural: {
        en: string;
        el: string;
      };
    }> = {
      week: {
        singular: {
          en: 'Week',
          el: 'Εβδομάδα'
        },
        plural: {
          en: 'Weeks',
          el: 'Εβδομάδες'
        }
      },
      month: {
        singular: {
          en: 'Month',
          el: 'Μήνας'
        },
        plural: {
          en: 'Months',
          el: 'Μήνες'
        }
      },
      year: {
        singular: {
          en: 'Year',
          el: 'Έτος'
        },
        plural: {
          en: 'Years',
          el: 'Έτη'
        }
      }
    };
    const label = unitLabels[unit];
    if (!label) return `${value} ${unit}`;
    const form = value === 1 ? 'singular' : 'plural';
    return `${value} ${label[form][language === 'el' ? 'el' : 'en']}`;
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
  const renderCard = (t: RecurringTransaction, colorScheme: 'green' | 'red') => {
    const isCompleted = !t.is_active;
    const bgClass = colorScheme === 'green' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
    const amountClass = colorScheme === 'green' ? 'text-green-700' : 'text-red-700';
    return <div key={t.id} className={`border rounded-lg p-3 flex items-start justify-between gap-2 ${bgClass} ${isCompleted ? 'opacity-60' : ''}`}>
        <div className="flex-1 min-w-0">
          {/* Category-first title */}
          <p className="text-sm truncate font-semibold">
            {getCategoryLabel(t.category, t.type, language, t.income_source_type, t.expense_subcategory, t.income_source_specification)}
          </p>
          {t.description && <p className="text-muted-foreground truncate text-sm">
              {t.description}
            </p>}
          <p className={`font-semibold ${amountClass}`}>€{t.amount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            {language === 'el' ? 'Κάθε' : 'Every'} {getFrequencyLabel(t.frequency_value, t.frequency_unit)}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'el' ? 'Έναρξη' : 'Start'}: {formatEuropeanDate(t.start_date)}
          </p>
          {t.end_date && <p className="text-xs text-muted-foreground">
              {language === 'el' ? 'Λήξη' : 'End'}: {formatEuropeanDate(t.end_date)}
            </p>}
          {getVehicleName(t.vehicle_id) && <p className="text-xs text-muted-foreground truncate">
              {getVehicleName(t.vehicle_id)}
            </p>}
          {isCompleted && <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${colorScheme === 'green' ? 'bg-green-200 text-green-800' : 'bg-muted text-muted-foreground'}`}>
              {language === 'el' ? 'Ολοκληρώθηκε' : 'Completed'}
            </span>}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(t.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>;
  };
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle>
              {language === 'el' ? 'Επαναλαμβανόμενα Έσοδα & Έξοδα' : 'Recurring Income & Expenses'}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generateDueTransactions} disabled={isGenerating || !hasActiveTransactions}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {language === 'el' ? 'Δημιουργία' : 'Generate'}
              </Button>
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'el' ? 'Προσθήκη' : 'Add New'}
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
                  {language === 'el' ? 'Δεν υπάρχουν επαναλαμβανόμενες συναλλαγές' : 'No recurring transactions yet'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {language === 'el' ? 'Εδώ μπορείτε να προσθέσετε επαναλαμβανόμενα έσοδα και έξοδα που δημιουργούνται αυτόματα ως συναλλαγές βάσει μιας συχνότητας που ορίζετε (μηνιαία, ετήσια, κ.λπ.). Αυτό είναι χρήσιμο για πάγια κόστη ή τακτικά έσοδα.' : 'Here you can add recurring income and expenses that are automatically created as transactions based on a frequency you define (monthly, yearly, etc.). This is useful for fixed costs or regular income.'}
                </p>
                <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'el' ? 'Προσθήκη Πρώτης' : 'Add Your First'}
                </Button>
              </div>
            </div> : <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                {/* Income Column */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-green-600 border-b border-green-200 pb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    {language === 'el' ? 'Επαναλαμβανόμενα Έσοδα' : 'Recurring Income'}
                    <span className="text-xs text-muted-foreground font-normal">({incomeTransactions.length})</span>
                  </h3>
                  {incomeTransactions.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">
                      {language === 'el' ? 'Κανένα επαναλαμβανόμενο έσοδο' : 'No recurring income'}
                    </p> : <div className="space-y-2">
                      {incomeTransactions.map(t => renderCard(t, 'green'))}
                    </div>}
                </div>

                {/* Expense Column */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-red-600 border-b border-red-200 pb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    {language === 'el' ? 'Επαναλαμβανόμενα Έξοδα' : 'Recurring Expenses'}
                    <span className="text-xs text-muted-foreground font-normal">({expenseTransactions.length})</span>
                  </h3>
                  {expenseTransactions.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">
                      {language === 'el' ? 'Κανένα επαναλαμβανόμενο έξοδο' : 'No recurring expenses'}
                    </p> : <div className="space-y-2">
                      {expenseTransactions.map(t => renderCard(t, 'red'))}
                    </div>}
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <AddRecurringTransactionDialog open={isAddOpen} onOpenChange={setIsAddOpen} vehicles={vehicles} onSuccess={() => {
      fetchRecurringTransactions();
      setIsAddOpen(false);
    }} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'el' ? 'Διαγραφή Επαναλαμβανόμενης Συναλλαγής' : 'Delete Recurring Transaction'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'el' ? 'Αυτή η ενέργεια θα διαγράψει μόνιμα αυτή την επαναλαμβανόμενη συναλλαγή. Δεν θα δημιουργούνται πλέον μελλοντικές συναλλαγές από αυτόν τον κανόνα.' : 'This will permanently delete this recurring transaction. No future transactions will be generated from this rule.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {language === 'el' ? 'Ακύρωση' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {language === 'el' ? 'Διαγραφή' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}