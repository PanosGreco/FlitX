import { useState, useEffect, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Plus, Filter, Loader2, Eye, CalendarIcon } from "lucide-react";
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
import { BarChart, LineChart } from "@/components/finances/charts";
import { IncomeBreakdown } from "@/components/finances/IncomeBreakdown";
import { ExpenseBreakdown } from "@/components/finances/ExpenseBreakdown";
import { useAuth } from "@/contexts/AuthContext";
import { 
  TimeframeType, 
  filterByCalendarTimeframe,
  TIMEFRAME_LABELS,
  DateRange
} from "@/utils/dateRangeUtils";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  income_source_type?: string | null;
  income_source_specification?: string | null;
  expense_subcategory?: string | null;
  vehicle_id?: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
}

interface FinanceDashboardProps {
  onAddRecord?: () => void;
  financialRecords?: FinancialRecord[];
  isLoading?: boolean;
}

export function FinanceDashboard({ onAddRecord, financialRecords = [], isLoading = false }: FinanceDashboardProps) {
  const [timeframe, setTimeframe] = useState<TimeframeType>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const isBoats = isBoatBusiness();
  const { t, language, isLanguageLoading } = useLanguage();
  const { user } = useAuth();
  
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
        .select('id, make, model, year')
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

  // Recent transactions (filtered by timeframe, sorted by date)
  const recentTransactions = useMemo(() => {
    return [...filteredRecords].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredRecords]);

  const visibleTransactions = showAllTransactions 
    ? recentTransactions 
    : recentTransactions.slice(0, 5);
  
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
      return format(date, 'PP', { locale: language === 'el' ? el : enUS });
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
            onClick={onAddRecord}
            disabled={isLanguageLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.addRecord}
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title={t.income} 
          value={summaryData.totalIncome} 
          change={summaryData.incomeChange} 
          trend={summaryData.incomeChange >= 0 ? "up" : "down"} 
          prefix={language === 'el' ? '€' : '$'} 
          lang={language}
        />
        
        <SummaryCard 
          title={t.expense} 
          value={summaryData.totalExpenses} 
          change={summaryData.expenseChange} 
          trend={summaryData.expenseChange >= 0 ? "up" : "down"} 
          prefix={language === 'el' ? '€' : '$'}
          trendReversed
          lang={language}
        />
        
        <SummaryCard 
          title={t.netProfit} 
          value={summaryData.netProfit} 
          change={summaryData.profitChange} 
          trend={summaryData.profitChange >= 0 ? "up" : "down"} 
          prefix={language === 'el' ? '€' : '$'}
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
      />

      {/* Expense Breakdown Section */}
      <ExpenseBreakdown 
        financialRecords={filteredRecords}
        vehicles={vehicles}
        lang={language}
        timeframe={timeframe}
      />
        
      {/* Recent Transactions - Complete & Filterable */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{language === 'el' ? 'Πρόσφατες Συναλλαγές' : 'Recent Transactions'}</CardTitle>
          {recentTransactions.length > 5 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAllTransactions(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {language === 'el' ? 'Όλες' : 'View All'} ({recentTransactions.length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {visibleTransactions.slice(0, 5).map(record => (
                <TransactionItem 
                  key={record.id}
                  description={record.description || record.category}
                  amount={Number(record.amount)}
                  date={formatDate(record.date)}
                  type={record.type}
                  lang={language}
                />
              ))}
              {recentTransactions.length > 5 && !showAllTransactions && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  {language === 'el' 
                    ? `Εμφάνιση 5 από ${recentTransactions.length} συναλλαγές`
                    : `Showing 5 of ${recentTransactions.length} transactions`}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {language === 'el' ? 'Δεν βρέθηκαν συναλλαγές για αυτήν την περίοδο' : 'No transactions found for this period'}
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
                ({recentTransactions.length})
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {recentTransactions.map(record => (
              <TransactionItem 
                key={record.id}
                description={record.description || record.category}
                amount={Number(record.amount)}
                date={formatDate(record.date)}
                type={record.type}
                lang={language}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
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

function TransactionItem({ description, amount, date, type, lang }: {
  description: string;
  amount: number;
  date: string;
  type: string;
  lang: string;
}) {
  const isIncome = type === "income";
  
  return (
    <div className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors">
      <div className="flex items-center">
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
        
        <div className="ml-3">
          <div className="font-medium">{description}</div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>
      </div>
      
      <div className={cn(
        "font-medium",
        isIncome ? "text-green-600" : "text-red-600"
      )}>
        {isIncome ? "+" : "-"}{lang === 'el' ? '€' : '$'}{amount.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}
