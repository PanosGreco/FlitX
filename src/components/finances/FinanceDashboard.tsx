import { useState, useEffect, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Plus, Loader2, Eye, CalendarIcon, Trash2, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { enUS, el } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { BarChart, LineChart } from "@/components/finances/charts";
import { IncomeBreakdown } from "@/components/finances/IncomeBreakdown";
import { ExpenseBreakdown } from "@/components/finances/ExpenseBreakdown";
import { differenceInDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getMaintenanceTypeLabel } from "@/constants/maintenanceTypes";
import { 
  TimeframeType, 
  filterByCalendarTimeframe,
  TIMEFRAME_LABELS,
  DateRange
} from "@/utils/dateRangeUtils";
import { RecurringTransactionsModal } from "./RecurringTransactionsModal";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  created_at: string;
  description: string | null;
  income_source_type?: string | null;
  income_source_specification?: string | null;
  expense_subcategory?: string | null;
  vehicle_id?: string | null;
  booking_id?: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  created_at?: string;
  // Category stored in DB (vehicles.type)
  type?: string | null;
  // Top-level type stored in DB (vehicles.vehicle_type)
  vehicle_type?: string | null;
}

interface FinanceDashboardProps {
  onAddRecord?: () => void;
  financialRecords?: FinancialRecord[];
  isLoading?: boolean;
  onRecordDeleted?: () => void;
}

export function FinanceDashboard({ onAddRecord, financialRecords = [], isLoading = false, onRecordDeleted }: FinanceDashboardProps) {
  const [timeframe, setTimeframe] = useState<TimeframeType>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const isBoats = isBoatBusiness();
  const { t, language, isLanguageLoading } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, type, vehicle_type, created_at')
        .order('make');

      if (!error && data) {
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  // Apply custom range when dates change
  useEffect(() => {
    if (timeframe === 'custom' && customStartDate && customEndDate) {
      setCustomRange({
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate)
      });
    }
  }, [timeframe, customStartDate, customEndDate]);

  // Filter records using calendar-based timeframes
  const filteredRecords = useMemo(() => {
    return filterByCalendarTimeframe(financialRecords, timeframe, customRange);
  }, [financialRecords, timeframe, customRange]);

  // Transactions list - ALWAYS shows ALL transactions, independent of date filters
  // Sorted by exact creation timestamp (most recent first)
  const allTransactions = useMemo(() => {
    return [...financialRecords].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [financialRecords]);

  const visibleTransactions = showAllTransactions 
    ? allTransactions 
    : allTransactions.slice(0, 5);

  // Generate standardized title for transactions
  const getTransactionTitle = (record: FinancialRecord): string => {
    const isIncome = record.type === 'income';
    const prefix = isIncome 
      ? (language === 'el' ? 'Έσοδο' : 'Income Record')
      : (language === 'el' ? 'Έξοδο' : 'Expense Record');
    
    if (isIncome) {
      // Income titles
      if (record.category === 'rental') {
        // Rental income - show vehicle and customer info from description
        return `${prefix} – ${record.description || 'Rental'}`;
      } else if (record.category === 'additional') {
        return `${prefix} – ${record.description || 'Additional Income'}`;
      } else {
        // Manual income - show source type
        const sourceType = record.income_source_type;
        const sourceLabels: Record<string, string> = {
          walk_in: language === 'el' ? 'Απευθείας Κράτηση' : 'Direct Booking',
          collaboration: language === 'el' ? 'Συνεργασία' : 'Collaboration',
          other: language === 'el' ? 'Άλλο' : 'Other'
        };
        const sourceLabel = sourceType ? sourceLabels[sourceType] || sourceType : '';
        const spec = record.income_source_specification;
        if (spec) {
          // For 'other' with spec, show spec as standalone; for collaboration show with source
          if (sourceType === 'other') {
            return `${prefix} – ${spec}`;
          }
          return `${prefix} – ${sourceLabel} · ${spec}`;
        }
        return `${prefix} – ${record.description || sourceLabel || 'Manual Income'}`;
      }
    } else {
      // Expense titles
      const categoryLabels: Record<string, string> = {
        fuel: language === 'el' ? 'Καύσιμα' : 'Fuel',
        maintenance: language === 'el' ? 'Συντήρηση Οχήματος' : 'Vehicle Maintenance',
        carwash: language === 'el' ? 'Πλύσιμο' : 'Car Wash',
        insurance: language === 'el' ? 'Ασφάλεια' : 'Insurance',
        tax: language === 'el' ? 'Φόροι/Τέλη' : 'Taxes/Fees',
        salary: language === 'el' ? 'Μισθοί' : 'Salaries',
        cleaning: language === 'el' ? 'Καθαρισμός' : 'Cleaning',
        docking: language === 'el' ? 'Τέλη Ελλιμενισμού' : 'Docking Fees',
        licensing: language === 'el' ? 'Άδειες' : 'Licensing',
        marketing: language === 'el' ? 'Μάρκετινγκ' : 'Marketing',
        other: language === 'el' ? 'Άλλο' : 'Other'
      };
      
      const categoryLabel = categoryLabels[record.category] || record.category;
      
      // For maintenance, show subcategory
      if (record.category === 'maintenance' && record.expense_subcategory) {
        const subcatLabel = getMaintenanceTypeLabel(record.expense_subcategory, language);
        return `${prefix} – ${categoryLabel} (${subcatLabel})`;
      }
      
      // For other expenses with subcategory - show as standalone
      if (record.category === 'other' && record.expense_subcategory) {
        return `${prefix} – ${record.expense_subcategory}`;
      }
      
      if (record.expense_subcategory) {
        return `${prefix} – ${categoryLabel} (${record.expense_subcategory})`;
      }
      
      return `${prefix} – ${categoryLabel}`;
    }
  };

  // Handle delete transaction with full cascade
  const handleDeleteTransaction = async (recordId: string) => {
    const record = financialRecords.find(r => r.id === recordId);
    if (!record) return;

    setIsDeleting(true);
    try {
      // If this is linked to a booking, delete the entire booking and its cascade
      if (record.booking_id) {
        // Get booking details first
        const { data: booking } = await supabase
          .from('rental_bookings')
          .select('contract_photo_path')
          .eq('id', record.booking_id)
          .single();

        // Delete contract from storage if exists
        if (booking?.contract_photo_path) {
          await supabase.storage
            .from('rental-contracts')
            .remove([booking.contract_photo_path]);
        }

        // Get daily tasks with contract paths
        const { data: tasksWithContracts } = await supabase
          .from('daily_tasks')
          .select('contract_path')
          .eq('booking_id', record.booking_id)
          .not('contract_path', 'is', null);

        // Delete task contract files
        if (tasksWithContracts && tasksWithContracts.length > 0) {
          const contractPaths = tasksWithContracts
            .map(t => t.contract_path)
            .filter(Boolean) as string[];
          if (contractPaths.length > 0) {
            await supabase.storage
              .from('rental-contracts')
              .remove(contractPaths);
          }
        }

        // Delete daily tasks linked to booking
        await supabase
          .from('daily_tasks')
          .delete()
          .eq('booking_id', record.booking_id);

        // Delete all financial records for this booking
        await supabase
          .from('financial_records')
          .delete()
          .eq('booking_id', record.booking_id);

        // Delete the booking itself
        await supabase
          .from('rental_bookings')
          .delete()
          .eq('id', record.booking_id);

      } else if (record.category === 'maintenance' && record.vehicle_id) {
        // If this is a maintenance expense, also delete the vehicle_maintenance record
        // Find by matching date and amount
        await supabase
          .from('vehicle_maintenance')
          .delete()
          .eq('vehicle_id', record.vehicle_id)
          .eq('date', record.date)
          .eq('cost', record.amount);

        // Delete the financial record
        await supabase
          .from('financial_records')
          .delete()
          .eq('id', recordId);
      } else {
        // Simple delete - just the financial record
        await supabase
          .from('financial_records')
          .delete()
          .eq('id', recordId);
      }

      toast({
        title: language === 'el' ? 'Διαγράφηκε' : 'Deleted',
        description: language === 'el' 
          ? 'Η συναλλαγή και τα σχετικά δεδομένα διαγράφηκαν επιτυχώς'
          : 'Transaction and related data have been deleted successfully',
      });

      // Trigger refresh
      onRecordDeleted?.();
      
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' 
          ? 'Αποτυχία διαγραφής συναλλαγής'
          : 'Failed to delete transaction',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setDeleteTransactionId(null);
    }
  };
  
  // Compute Average Profit per Day per vehicle (uses ALL financial records, not filtered)
  const vehicleProfitRanking = useMemo(() => {
    const vehicleData: Record<string, { income: number; expense: number }> = {};
    
    // Aggregate ALL records by vehicle
    financialRecords.forEach(record => {
      if (!record.vehicle_id) return;
      if (!vehicleData[record.vehicle_id]) {
        vehicleData[record.vehicle_id] = { income: 0, expense: 0 };
      }
      if (record.type === 'income') {
        vehicleData[record.vehicle_id].income += Number(record.amount);
      } else {
        vehicleData[record.vehicle_id].expense += Number(record.amount);
      }
    });

    // Calculate avg profit per day for each vehicle
    return Object.entries(vehicleData).map(([vehicleId, data]) => {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return null;
      
      // Active days from vehicle created_at to today
      const createdAt = vehicle.created_at;
      let activeDays = 1;
      if (createdAt) {
        const startDate = new Date(createdAt);
        const today = new Date();
        activeDays = Math.max(1, differenceInDays(today, startDate) + 1);
      }
      
      const avgProfitPerDay = (data.income - data.expense) / activeDays;
      
      return {
        id: vehicleId,
        name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        avgProfitPerDay,
      };
    }).filter(Boolean) as { id: string; name: string; avgProfitPerDay: number }[];
  }, [financialRecords, vehicles]);

  const calculateSummaryData = () => {
    const incomeRecords = filteredRecords.filter(record => record.type === "income");
    const expenseRecords = filteredRecords.filter(record => record.type === "expense");
    
    const totalIncome = incomeRecords.reduce((sum, record) => sum + Number(record.amount), 0);
    const totalExpenses = expenseRecords.reduce((sum, record) => sum + Number(record.amount), 0);
    const netProfit = totalIncome - totalExpenses;
    
    return {
      totalIncome,
      totalExpenses,
      netProfit,
      incomeChange: 0,
      expenseChange: 0,
      profitChange: 0
    };
  };

  const summaryData = calculateSummaryData();
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as TimeframeType);
    if (value !== 'custom') {
      setCustomRange(undefined);
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {language === 'el' ? 'Φόρτωση οικονομικών δεδομένων...' : 'Loading financial data...'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t.finances}</h1>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeframe} onValueChange={handleTimeframeChange} disabled={isLanguageLoading}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.selectTimeframe} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{TIMEFRAME_LABELS.week[language === 'el' ? 'el' : 'en']}</SelectItem>
              <SelectItem value="month">{TIMEFRAME_LABELS.month[language === 'el' ? 'el' : 'en']}</SelectItem>
              <SelectItem value="year">{TIMEFRAME_LABELS.year[language === 'el' ? 'el' : 'en']}</SelectItem>
              <SelectItem value="all">{TIMEFRAME_LABELS.all[language === 'el' ? 'el' : 'en']}</SelectItem>
              <SelectItem value="custom">{TIMEFRAME_LABELS.custom[language === 'el' ? 'el' : 'en']}</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range Inputs */}
          {timeframe === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[140px]"
                placeholder="Start"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[140px]"
                placeholder="End"
              />
            </div>
          )}
          
          <Button 
            onClick={() => setIsRecurringOpen(true)}
            disabled={isLanguageLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'el' ? 'Επαναλαμβανόμενα' : 'Recurring'}
          </Button>

          <Button 
            onClick={onAddRecord}
            disabled={isLanguageLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.addRecord}
          </Button>
        </div>
      </div>

      {/* Recurring Transactions Modal */}
      <RecurringTransactionsModal
        open={isRecurringOpen}
        onOpenChange={setIsRecurringOpen}
        onTransactionsGenerated={onRecordDeleted}
      />
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title={t.income} 
          value={summaryData.totalIncome} 
          change={summaryData.incomeChange} 
          trend={summaryData.incomeChange >= 0 ? "up" : "down"} 
          prefix="€" 
          lang={language}
        />
        
        <SummaryCard 
          title={t.expense} 
          value={summaryData.totalExpenses} 
          change={summaryData.expenseChange} 
          trend={summaryData.expenseChange >= 0 ? "up" : "down"} 
          prefix="€"
          trendReversed
          lang={language}
        />
        
        <SummaryCard 
          title={t.netProfit} 
          value={summaryData.netProfit} 
          change={summaryData.profitChange} 
          trend={summaryData.profitChange >= 0 ? "up" : "down"} 
          prefix="€"
          lang={language}
        />
      </div>
      
      {/* Charts - Now using real backend data with timeframe sync */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{language === 'el' ? 'Έσοδα έναντι Εξόδων' : 'Income vs Expenses'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BarChart financialRecords={filteredRecords} lang={language} timeframe={timeframe} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{language === 'el' ? 'Τάση Χρόνου' : 'Trend Over Time'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <LineChart financialRecords={filteredRecords} lang={language} timeframe={timeframe} />
          </CardContent>
        </Card>
      </div>
      
      {/* Income Breakdown Section */}
      <IncomeBreakdown 
        financialRecords={filteredRecords}
        vehicles={vehicles}
        lang={language}
        timeframe={timeframe}
        vehicleProfitRanking={vehicleProfitRanking}
      />

      {/* Expense Breakdown Section */}
      <ExpenseBreakdown 
        financialRecords={filteredRecords}
        vehicles={vehicles}
        lang={language}
        timeframe={timeframe}
        vehicleProfitRanking={vehicleProfitRanking}
      />
        
      {/* Transactions - Global list, independent of date filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{language === 'el' ? 'Συναλλαγές' : 'Transactions'}</CardTitle>
          {allTransactions.length > 5 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAllTransactions(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {language === 'el' ? 'Όλες' : 'View All'} ({allTransactions.length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {allTransactions.length > 0 ? (
            <div className="space-y-4">
              {visibleTransactions.slice(0, 5).map(record => (
                <TransactionItem 
                  key={record.id}
                  id={record.id}
                  title={getTransactionTitle(record)}
                  amount={Number(record.amount)}
                  date={formatDate(record.date)}
                  type={record.type}
                  lang={language}
                  onDelete={(id) => setDeleteTransactionId(id)}
                />
              ))}
              {allTransactions.length > 5 && !showAllTransactions && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  {language === 'el' 
                    ? `Εμφάνιση 5 από ${allTransactions.length} συναλλαγές`
                    : `Showing 5 of ${allTransactions.length} transactions`}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {language === 'el' ? 'Δεν υπάρχουν συναλλαγές' : 'No transactions found'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* View All Transactions Dialog */}
      <Dialog open={showAllTransactions} onOpenChange={setShowAllTransactions}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {language === 'el' ? 'Όλες οι Συναλλαγές' : 'All Transactions'}
              <span className="text-muted-foreground font-normal text-sm">
                ({allTransactions.length})
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {allTransactions.map(record => (
              <TransactionItem 
                key={record.id}
                id={record.id}
                title={getTransactionTitle(record)}
                amount={Number(record.amount)}
                date={formatDate(record.date)}
                type={record.type}
                lang={language}
                onDelete={(id) => setDeleteTransactionId(id)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTransactionId} onOpenChange={(open) => !open && setDeleteTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'el' ? 'Διαγραφή Συναλλαγής' : 'Delete Transaction'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'el' 
                ? 'Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτήν τη συναλλαγή; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Αν αυτή η συναλλαγή συνδέεται με κράτηση ή συντήρηση, θα διαγραφούν και τα σχετικά δεδομένα.'
                : 'Are you sure you want to delete this transaction? This action cannot be undone. If this transaction is linked to a booking or maintenance record, related data will also be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {language === 'el' ? 'Ακύρωση' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteTransactionId && handleDeleteTransaction(deleteTransactionId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting 
                ? (language === 'el' ? 'Διαγραφή...' : 'Deleting...') 
                : (language === 'el' ? 'Διαγραφή' : 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ title, value, change, trend, prefix = "", trendReversed = false, lang }: {
  title: string;
  value: number;
  change: number;
  trend: string;
  prefix?: string;
  trendReversed?: boolean;
  lang: string;
}) {
  const trendIsPositive = trend === "up";
  const displayedTrend = trendReversed ? !trendIsPositive : trendIsPositive;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-semibold mt-1">
              {prefix}{value.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          
          <div className={cn(
            "flex items-center text-sm",
            displayedTrend ? "text-green-600" : "text-red-600"
          )}>
            {displayedTrend ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {Math.abs(change)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionItem({ id, title, amount, date, type, lang, onDelete }: {
  id: string;
  title: string;
  amount: number;
  date: string;
  type: string;
  lang: string;
  onDelete: (id: string) => void;
}) {
  const isIncome = type === "income";
  
  return (
    <div className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors group">
      <div className="flex items-center flex-1 min-w-0">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isIncome ? "bg-green-100" : "bg-red-100"
        )}>
          {isIncome ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </div>
        
        <div className="ml-3 min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={cn(
          "font-medium",
          isIncome ? "text-green-600" : "text-red-600"
        )}>
          {isIncome ? "+" : "-"}€{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(id)}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
