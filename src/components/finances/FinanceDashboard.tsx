
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart, PieChart } from "@/components/finances/charts";
import { TrendingUp, TrendingDown, Plus, Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

interface FinancialRecord {
  id: string;
  record_type: string;
  category: string;
  amount: number;
  date: string;
  description: string;
}

interface FinanceDashboardProps {
  onAddRecord?: () => void;
  financialRecords?: FinancialRecord[];
  isLoading?: boolean;
}

export function FinanceDashboard({ onAddRecord, financialRecords = [], isLoading = false }: FinanceDashboardProps) {
  const [timeframe, setTimeframe] = useState("month");
  const isBoats = isBoatBusiness();
  const { t, language, isLanguageLoading } = useLanguage();
  
  // Calculate summary data from financial records
  const calculateSummaryData = () => {
    // Get only records from the selected timeframe
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
    
    // Calculate totals
    const incomeRecords = filteredRecords.filter(record => record.record_type === "income");
    const expenseRecords = filteredRecords.filter(record => record.record_type === "expense");
    
    const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    
    // Calculate previous period for comparison
    let prevPeriodStart = new Date();
    let currentPeriodStart = new Date();
    
    if (timeframe === "week") {
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 14);
      currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
    } else if (timeframe === "month") {
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 2);
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);
    } else if (timeframe === "quarter") {
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 6);
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 3);
    } else if (timeframe === "year") {
      prevPeriodStart.setFullYear(prevPeriodStart.getFullYear() - 2);
      currentPeriodStart.setFullYear(currentPeriodStart.getFullYear() - 1);
    }
    
    const prevPeriodRecords = financialRecords.filter(record => 
      new Date(record.date) >= prevPeriodStart && new Date(record.date) < currentPeriodStart
    );
    
    const prevIncomeRecords = prevPeriodRecords.filter(record => record.record_type === "income");
    const prevExpenseRecords = prevPeriodRecords.filter(record => record.record_type === "expense");
    
    const prevTotalIncome = prevIncomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const prevTotalExpenses = prevExpenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const prevNetProfit = prevTotalIncome - prevTotalExpenses;
    
    // Calculate percentage changes
    const incomeChange = prevTotalIncome === 0 ? 100 : ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100;
    const expenseChange = prevTotalExpenses === 0 ? 100 : ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100;
    const profitChange = prevNetProfit === 0 ? 100 : ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100;
    
    return {
      totalIncome,
      totalExpenses,
      netProfit,
      incomeChange: isNaN(incomeChange) ? 0 : parseFloat(incomeChange.toFixed(1)),
      expenseChange: isNaN(expenseChange) ? 0 : parseFloat(expenseChange.toFixed(1)),
      profitChange: isNaN(profitChange) ? 0 : parseFloat(profitChange.toFixed(1))
    };
  };

  const summaryData = calculateSummaryData();
  
  // Get recent transactions
  const recentTransactions = [...financialRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-flitx-blue" />
        <p className="text-flitx-gray-500">
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
            className="bg-flitx-blue hover:bg-flitx-blue-600"
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
          title={t.totalIncome} 
          value={summaryData.totalIncome} 
          change={summaryData.incomeChange} 
          trend={summaryData.incomeChange >= 0 ? "up" : "down"} 
          prefix={language === 'el' ? '€' : '$'} 
          lang={language}
        />
        
        <SummaryCard 
          title={t.totalExpenses} 
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
          <CardHeader>
            <CardTitle className="text-lg">{language === 'el' ? 'Πρόσφατες Συναλλαγές' : 'Recent Transactions'}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map(record => (
                  <TransactionItem 
                    key={record.id}
                    description={record.description}
                    amount={record.amount}
                    date={new Date(record.date).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')}
                    type={record.record_type}
                    lang={language}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-flitx-gray-400 py-8">
                {language === 'el' ? 'Δεν βρέθηκαν πρόσφατες συναλλαγές' : 'No recent transactions found'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, change, trend, prefix = "", trendReversed = false, lang }) {
  const trendIsPositive = trend === "up";
  const displayedTrend = trendReversed ? !trendIsPositive : trendIsPositive;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-flitx-gray-500">{title}</p>
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

function TransactionItem({ description, amount, date, type, lang }) {
  const isIncome = type === "income";
  
  return (
    <div className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors">
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
          <div className="text-xs text-flitx-gray-400">{date}</div>
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
