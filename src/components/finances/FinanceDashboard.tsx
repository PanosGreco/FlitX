import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Plus, Filter, Loader2 } from "lucide-react";
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
import { BarChart, LineChart, PieChart } from "@/components/finances/charts";
import { useAuth } from "@/contexts/AuthContext";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface FinanceDashboardProps {
  onAddRecord?: () => void;
  financialRecords?: FinancialRecord[];
  isLoading?: boolean;
}

export function FinanceDashboard({ onAddRecord, financialRecords = [], isLoading = false }: FinanceDashboardProps) {
  const [timeframe, setTimeframe] = useState("month");
  const [recentTransactions, setRecentTransactions] = useState<FinancialRecord[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const isBoats = isBoatBusiness();
  const { t, language, isLanguageLoading } = useLanguage();
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      fetchRecentTransactions();
    }
  }, [user]);

  const fetchRecentTransactions = async () => {
    if (!user) return;
    
    try {
      setIsTransactionsLoading(true);

      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching recent transactions:", error);
      } else {
        setRecentTransactions(data || []);
      }
    } catch (error) {
      console.error("Exception fetching recent transactions:", error);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('financial_records_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'financial_records' }, 
        () => {
          fetchRecentTransactions();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const calculateSummaryData = () => {
    let filteredRecords = [...financialRecords];
    
    if (timeframe === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filteredRecords = financialRecords.filter(record => 
        new Date(record.date) >= oneWeekAgo
      );
    } else if (timeframe === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      filteredRecords = financialRecords.filter(record => 
        new Date(record.date) >= oneMonthAgo
      );
    } else if (timeframe === "quarter") {
      const oneQuarterAgo = new Date();
      oneQuarterAgo.setMonth(oneQuarterAgo.getMonth() - 3);
      filteredRecords = financialRecords.filter(record => 
        new Date(record.date) >= oneQuarterAgo
      );
    } else if (timeframe === "year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      filteredRecords = financialRecords.filter(record => 
        new Date(record.date) >= oneYearAgo
      );
    }
    
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
      return format(date, 'PPp', { locale: language === 'el' ? el : enUS });
    } catch (error) {
      return dateString;
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
        
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe} disabled={isLanguageLoading}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.selectTimeframe} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t.thisWeek}</SelectItem>
              <SelectItem value="month">{t.thisMonth}</SelectItem>
              <SelectItem value="quarter">{t.thisQuarter}</SelectItem>
              <SelectItem value="year">{t.thisYear}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            size="icon" 
            variant="outline" 
            aria-label={t.filter}
            disabled={isLanguageLoading}
          >
            <Filter className="h-4 w-4" />
          </Button>
          
          <Button 
            className="bg-primary hover:bg-primary/90"
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
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{language === 'el' ? 'Έσοδα έναντι Εξόδων' : 'Income vs Expenses'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BarChart />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{language === 'el' ? 'Αύξηση Εσόδων' : 'Revenue Growth'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <LineChart />
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{language === 'el' ? 'Ανάλυση Εξόδων' : 'Expense Breakdown'}</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{language === 'el' ? 'Πρόσφατες Συναλλαγές' : 'Recent Transactions'}</CardTitle>
            {isTransactionsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
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
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {language === 'el' ? 'Δεν βρέθηκαν πρόσφατες συναλλαγές' : 'No recent transactions found'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
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
