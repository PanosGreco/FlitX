
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
import { TrendingUp, TrendingDown, Plus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinanceDashboard() {
  const [timeframe, setTimeframe] = useState("month");
  
  // Summary data
  const summaryData = {
    totalIncome: 24850.75,
    totalExpenses: 9725.35,
    netProfit: 15125.40,
    incomeChange: 8.5,
    expenseChange: 3.2,
    profitChange: 12.7
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Income & Expenses</h1>
        
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button size="icon" variant="outline" aria-label="Filter">
            <Filter className="h-4 w-4" />
          </Button>
          
          <Button 
            className="bg-flitx-blue hover:bg-flitx-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title="Total Income" 
          value={summaryData.totalIncome} 
          change={summaryData.incomeChange} 
          trend="up" 
          prefix="$" 
        />
        
        <SummaryCard 
          title="Total Expenses" 
          value={summaryData.totalExpenses} 
          change={summaryData.expenseChange} 
          trend="up" 
          prefix="$"
          trendReversed
        />
        
        <SummaryCard 
          title="Net Profit" 
          value={summaryData.netProfit} 
          change={summaryData.profitChange} 
          trend="up" 
          prefix="$"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BarChart />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Growth</CardTitle>
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
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TransactionItem 
                description="Vehicle Rental - Toyota Corolla"
                amount={45}
                date="Apr 5, 2023"
                type="income"
              />
              
              <TransactionItem 
                description="Fuel Purchase - Gas Station"
                amount={35.75}
                date="Apr 4, 2023"
                type="expense"
              />
              
              <TransactionItem 
                description="Vehicle Rental - Fiat Panda"
                amount={40}
                date="Apr 4, 2023"
                type="income"
              />
              
              <TransactionItem 
                description="Maintenance - Oil Change"
                amount={65.50}
                date="Apr 2, 2023"
                type="expense"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, change, trend, prefix = "", trendReversed = false }) {
  const trendIsPositive = trend === "up";
  const displayedTrend = trendReversed ? !trendIsPositive : trendIsPositive;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-flitx-gray-500">{title}</p>
            <h3 className="text-2xl font-semibold mt-1">
              {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {change}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionItem({ description, amount, date, type }) {
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
        {isIncome ? "+" : "-"}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}
