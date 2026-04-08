import { useState, useEffect, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Plus, Loader2, Eye, CalendarIcon, Trash2, X, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears } from "date-fns";
import { getDateFnsLocale } from "@/utils/localeMap";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { AssetTrackingWidget } from "@/components/finances/AssetTrackingWidget";
import { differenceInDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getMaintenanceTypeLabel } from "@/constants/maintenanceTypes";
import { 
  TimeframeType, 
  filterByCalendarTimeframe,
  getCalendarDateRange,
  TIMEFRAME_LABELS,
  DateRange
} from "@/utils/dateRangeUtils";
import { RecurringTransactionsModal } from "./RecurringTransactionsModal";
import { MarketingScatterPlot } from "@/components/finances/MarketingScatterPlot";

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
  type?: string | null;
  vehicle_type?: string | null;
  is_sold?: boolean;
}

interface RentalBooking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number | null;
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
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [profileData, setProfileData] = useState<{ name: string | null; company_name: string | null; avatar_url: string | null }>({ name: null, company_name: null, avatar_url: null });
  const isBoats = isBoatBusiness();
  const { language, isLanguageLoading } = useLanguage();
  const { t } = useTranslation('finance');
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (user) {
      fetchVehicles();
      fetchBookings();
      fetchProfile();
      // Fire-and-forget: trigger recurring transaction processing on mount
      supabase.functions.invoke('process-recurring-transactions', {
        body: { source: 'frontend' }
      }).then((res) => {
        if (res.data?.generated > 0) {
          onRecordDeleted?.(); // refresh financial records
        }
      }).catch(() => {
        // Silent fail - backend cron handles this too
      });
    }
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, type, vehicle_type, created_at, is_sold')
        .order('make');

      if (!error && data) {
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('rental_bookings')
        .select('id, start_date, end_date, status, total_amount')
        .order('start_date', { ascending: false });
      if (!error && data) {
        setBookings(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, company_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) {
        setProfileData(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
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

  // KPI calculations
  const periodBookings = useMemo(() => {
    if (timeframe === 'all') return bookings;
    const { startDate, endDate } = getCalendarDateRange(timeframe, customRange);
    return bookings.filter(b => {
      const bookingStart = new Date(b.start_date);
      return bookingStart >= startDate && bookingStart <= endDate;
    });
  }, [bookings, timeframe, customRange]);

  const totalBookings = periodBookings.length;

  const avgRentalDays = useMemo(() => {
    if (periodBookings.length === 0) return 0;
    const totalDays = periodBookings.reduce((sum, booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return sum + days;
    }, 0);
    return Math.round((totalDays / periodBookings.length) * 10) / 10;
  }, [periodBookings]);

  const avgIncomePerBooking = useMemo(() => {
    if (totalBookings === 0) return 0;
    const bookingIncome = filteredRecords.filter(
      r => r.type === 'income' && r.booking_id
    );
    const totalBookingIncome = bookingIncome.reduce((sum, r) => sum + Number(r.amount), 0);
    return totalBookingIncome / totalBookings;
  }, [filteredRecords, totalBookings]);

  const avgCostPerBooking = useMemo(() => {
    if (totalBookings === 0) return 0;
    const totalExpenses = filteredRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    return totalExpenses / totalBookings;
  }, [filteredRecords, totalBookings]);

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

  // Helper to get vehicle name
  const getVehicleName = (vehicleId: string | null | undefined): string | null => {
    if (!vehicleId) return null;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null;
  };

  // Generate standardized title for transactions
  const getTransactionTitle = (record: FinancialRecord): string => {
    const isIncome = record.type === 'income';
    const prefix = isIncome ? t('incomeRecord') : t('expenseRecord');
    
    // Vehicle Sale records
    if (record.category === 'vehicle_sale') {
      const vehicleName = getVehicleName(record.vehicle_id);
      if (isIncome) {
        return `${t('profitFromSale')}${vehicleName ? ` – ${vehicleName}` : ''}`;
      } else {
        return `${t('lossFromSale')}${vehicleName ? ` – ${vehicleName}` : ''}`;
      }
    }

    if (isIncome) {
      // Income titles
      if (record.category === 'rental') {
        return `${prefix} – ${record.description || 'Rental'}`;
      } else if (record.category === 'additional') {
        return `${prefix} – ${record.description || 'Additional Income'}`;
      } else {
        const sourceType = record.income_source_type;
        const sourceLabels: Record<string, string> = {
          walk_in: t('directBooking'),
          collaboration: t('collaboration'),
          other: t('other')
        };
        const sourceLabel = sourceType ? sourceLabels[sourceType] || sourceType : '';
        const spec = record.income_source_specification;
        if (spec) {
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
        fuel: t('fuel'),
        maintenance: t('vehicleMaintenance'),
        vehicle_parts: t('vehicleParts'),
        carwash: t('carWash'),
        insurance: t('insurance'),
        tax: t('taxesFees'),
        salary: t('salaries'),
        cleaning: t('cleaning'),
        docking: t('dockingFees'),
        licensing: t('licensing'),
        marketing: t('marketing'),
        other: t('other')
      };
      
      const categoryLabel = categoryLabels[record.category] || record.category;
      
      // For maintenance, show structured: Category · Subcategory · Vehicle
      if (record.category === 'maintenance' && record.expense_subcategory) {
        const subcatLabel = getMaintenanceTypeLabel(record.expense_subcategory, language);
        const displaySubcat = subcatLabel === record.expense_subcategory 
          ? record.expense_subcategory 
          : subcatLabel;
        const vehicleName = getVehicleName(record.vehicle_id);
        const parts = [prefix, categoryLabel, displaySubcat];
        if (vehicleName) parts.push(vehicleName);
        return parts.join(' · ');
      }
      
      // For vehicle parts, show structured: Category · Subcategory · Vehicle
      if (record.category === 'vehicle_parts') {
        const vehicleName = getVehicleName(record.vehicle_id);
        const parts = [prefix, categoryLabel];
        if (record.expense_subcategory) parts.push(record.expense_subcategory);
        if (vehicleName) parts.push(vehicleName);
        return parts.join(' · ');
      }
      
      // For other expenses with subcategory - show as standalone
      if (record.category === 'other' && record.expense_subcategory) {
        return `${prefix} – ${record.expense_subcategory}`;
      }
      
      // For tax expenses with subcategory - show structured
      if (record.category === 'tax' && record.expense_subcategory) {
        return `${prefix} · ${categoryLabel} · ${record.expense_subcategory}`;
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

      } else if (record.category === 'vehicle_sale' && record.vehicle_id) {
        // VEHICLE SALE REVERSAL: restore vehicle to active state
        await supabase
          .from('vehicles')
          .update({ is_sold: false, sale_price: null, sale_date: null })
          .eq('id', record.vehicle_id);

        // Delete the financial record
        await supabase
          .from('financial_records')
          .delete()
          .eq('id', recordId);

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
        title: t('deleted'),
        description: t('transactionDeleted'),
      });

      // Trigger refresh
      onRecordDeleted?.();
      
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: t('error'),
        description: t('failedToDelete'),
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
      if (!vehicle || vehicle.is_sold) return null;
      
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

  const summaryData = useMemo(() => {
    const totalIncome = filteredRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpenses = filteredRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    let incomeChange = 0;
    let expenseChange = 0;
    let profitChange = 0;

    if (timeframe !== 'all') {
      const now = new Date();
      let prevStart: Date;
      let prevEnd: Date;

      switch (timeframe) {
        case 'week': {
          const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
          prevStart = subWeeks(currentWeekStart, 1);
          prevEnd = new Date(currentWeekStart.getTime() - 1);
          break;
        }
        case 'month': {
          const currentMonthStart = startOfMonth(now);
          prevStart = subMonths(currentMonthStart, 1);
          prevEnd = new Date(currentMonthStart.getTime() - 1);
          break;
        }
        case 'year': {
          const currentYearStart = startOfYear(now);
          prevStart = subYears(currentYearStart, 1);
          prevEnd = new Date(currentYearStart.getTime() - 1);
          break;
        }
        case 'custom': {
          if (customRange) {
            const rangeMs = customRange.endDate.getTime() - customRange.startDate.getTime();
            prevEnd = new Date(customRange.startDate.getTime() - 1);
            prevStart = new Date(customRange.startDate.getTime() - rangeMs);
          } else {
            const currentMonthStart = startOfMonth(now);
            prevStart = subMonths(currentMonthStart, 1);
            prevEnd = new Date(currentMonthStart.getTime() - 1);
          }
          break;
        }
        default: {
          const currentMonthStart = startOfMonth(now);
          prevStart = subMonths(currentMonthStart, 1);
          prevEnd = new Date(currentMonthStart.getTime() - 1);
        }
      }

      const prevRecords = financialRecords.filter(r => {
        const d = new Date(r.date);
        return d >= prevStart && d <= prevEnd;
      });

      const prevIncome = prevRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
      const prevExpenses = prevRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
      const prevProfit = prevIncome - prevExpenses;

      incomeChange = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0;
      expenseChange = prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100) : 0;
      profitChange = prevProfit !== 0 ? Math.round(((netProfit - prevProfit) / Math.abs(prevProfit)) * 100) : 0;
    }

    return { totalIncome, totalExpenses, netProfit, incomeChange, expenseChange, profitChange };
  }, [filteredRecords, financialRecords, timeframe, customRange]);
  
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
          {t('loadingFinancial')}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-2">
        <Avatar className="h-12 w-12">
          {profileData.avatar_url ? (
            <AvatarImage src={profileData.avatar_url} alt="Profile" />
          ) : null}
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {profileData.company_name || profileData.name || t('myCompany')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('financialDashboard')}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('common:finances')}</h1>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeframe} onValueChange={handleTimeframeChange} disabled={isLanguageLoading}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('selectTimeframe')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('finance:timeframeWeek')}</SelectItem>
              <SelectItem value="month">{t('finance:timeframeMonth')}</SelectItem>
              <SelectItem value="year">{t('finance:timeframeYear')}</SelectItem>
              <SelectItem value="all">{t('finance:timeframeAll')}</SelectItem>
              <SelectItem value="custom">{t('finance:timeframeCustom')}</SelectItem>
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
            {t('recurring')}
          </Button>

          <Button 
            onClick={onAddRecord}
            disabled={isLanguageLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addRecord')}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard 
          title={t('income')} 
          value={summaryData.totalIncome} 
          change={summaryData.incomeChange} 
          trend={summaryData.incomeChange >= 0 ? "up" : "down"} 
          prefix="€" 
          lang={language}
          variant="income"
          t={t}
        />
        
        <SummaryCard 
          title={t('expense')} 
          value={summaryData.totalExpenses} 
          change={summaryData.expenseChange} 
          trend={summaryData.expenseChange >= 0 ? "up" : "down"} 
          prefix="€"
          trendReversed
          lang={language}
          variant="expense"
          t={t}
        />
        
        <SummaryCard 
          title={t('netIncome')} 
          value={summaryData.netProfit} 
          change={summaryData.profitChange} 
          trend={summaryData.profitChange >= 0 ? "up" : "down"} 
          prefix="€"
          lang={language}
          variant="profit"
          t={t}
        />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label={t('totalBookings')}
          value={totalBookings}
          format="number"
          icon="calendar"
          lang={language}
          secondaryLabel={t('avgRentalPeriod')}
          secondaryValue={totalBookings > 0 ? `~${avgRentalDays} ${t('days')}` : '—'}
        />
        <KpiCard label={t('avgIncomePerBooking')} value={avgIncomePerBooking} format="currency" icon="trendingUp" accentColor="green" lang={language} />
        <KpiCard label={t('avgCostPerBooking')} value={avgCostPerBooking} format="currency" icon="trendingDown" accentColor="red" lang={language} />
      </div>
      
      {/* Charts - 3 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <BarChart financialRecords={filteredRecords} lang={language} timeframe={timeframe} customRange={customRange} title={t('incomeVsExpenses')} />
        <LineChart financialRecords={filteredRecords} lang={language} timeframe={timeframe} customRange={customRange} title={t('trendOverTime')} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('marketingVsRevenue')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <MarketingScatterPlot financialRecords={financialRecords} lang={language} />
          </CardContent>
        </Card>
      </div>
      
      {/* Income Breakdown Section */}
      <IncomeBreakdown 
        financialRecords={filteredRecords}
        allRecords={financialRecords}
        vehicles={vehicles}
        lang={language}
        timeframe={timeframe}
        vehicleProfitRanking={vehicleProfitRanking}
        customRange={customRange}
      />

      {/* Expense Breakdown Section */}
      <ExpenseBreakdown 
        financialRecords={filteredRecords}
        allRecords={financialRecords}
        vehicles={vehicles}
        lang={language}
        timeframe={timeframe}
        vehicleProfitRanking={vehicleProfitRanking}
        customRange={customRange}
      />

      {/* Assets + Transactions side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {/* Asset Tracking Widget */}
      <AssetTrackingWidget />
        
      {/* Transactions - Global list, independent of date filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('transactions')}</CardTitle>
          {allTransactions.length > 5 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAllTransactions(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('viewAll')} ({allTransactions.length})
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
                  {t('showingOf', { count: allTransactions.length })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('noTransactions')}
            </p>
          )}
        </CardContent>
      </Card>
      </div>

      {/* View All Transactions Dialog */}
      <Dialog open={showAllTransactions} onOpenChange={setShowAllTransactions}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {t('allTransactions')}
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
              {t('deleteTransaction')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTransactionDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteTransactionId && handleDeleteTransaction(deleteTransactionId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ title, value, change, trend, prefix = "", trendReversed = false, lang, variant, t }: {
  title: string;
  value: number;
  change: number;
  trend: string;
  prefix?: string;
  trendReversed?: boolean;
  lang: string;
  variant?: 'income' | 'expense' | 'profit';
  t: (key: string) => string;
}) {
  const trendIsPositive = trend === "up";
  const displayedTrend = trendReversed ? !trendIsPositive : trendIsPositive;

  const variantStyles = {
    income: "border-l-4 border-l-green-500",
    expense: "border-l-4 border-l-red-500",
    profit: "border-l-4 border-l-blue-500",
  };

  return (
    <Card className={cn(
      "rounded-xl shadow-sm bg-card",
      variant && variantStyles[variant]
    )}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl font-bold mt-1">
          {prefix}{value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            displayedTrend ? "text-green-600" : "text-red-600"
          )}>
            {displayedTrend ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(change)}%</span>
            <span className="text-muted-foreground font-normal ml-0.5">{t('fromLastPeriod')}</span>
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
    <div className="flex items-center justify-between p-2.5 rounded-md hover:bg-accent/50 transition-colors group">
      <div className="flex items-center flex-1 min-w-0">
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isIncome ? "bg-green-100" : "bg-red-100"
        )}>
          {isIncome ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
          )}
        </div>
        
        <div className="ml-3 min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{title}</div>
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

function KpiCard({ label, value, format, icon, accentColor, lang, secondaryLabel, secondaryValue }: {
  label: string;
  value: number;
  format: 'number' | 'currency';
  icon: 'calendar' | 'trendingUp' | 'trendingDown';
  accentColor?: 'green' | 'red';
  lang: string;
  secondaryLabel?: string;
  secondaryValue?: string;
}) {
  const formattedValue = format === 'currency'
    ? `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : value.toLocaleString('de-DE');

  const IconComponent = icon === 'calendar' ? CalendarIcon
    : icon === 'trendingUp' ? TrendingUp
    : TrendingDown;

  const borderColor = accentColor === 'green'
    ? 'border-l-green-500'
    : accentColor === 'red'
    ? 'border-l-red-500'
    : 'border-l-slate-400';

  const valueColor = accentColor === 'green'
    ? 'text-green-600'
    : accentColor === 'red'
    ? 'text-red-600'
    : 'text-foreground';

  const iconBg = accentColor === 'green'
    ? 'bg-green-50 text-green-600'
    : accentColor === 'red'
    ? 'bg-red-50 text-red-600'
    : 'bg-slate-100 text-slate-600';

  return (
    <Card className={cn("rounded-xl shadow-sm border-l-4", borderColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <h3 className={cn("text-xl font-bold mt-0.5", valueColor)}>
              {formattedValue}
            </h3>
            {secondaryLabel && secondaryValue && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{secondaryLabel}</span>
                  <span className="text-xs font-semibold text-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                    {secondaryValue}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg ml-3 flex-shrink-0",
            iconBg
          )}>
            <IconComponent className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
