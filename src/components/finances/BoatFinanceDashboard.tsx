
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
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Gauge, 
  Clock,
  PieChart as PieChartIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface BoatFinanceDashboardProps {
  onAddRecord?: () => void;
}

export function BoatFinanceDashboard({ onAddRecord }: BoatFinanceDashboardProps) {
  const [timeframe, setTimeframe] = useState("month");
  
  // Summary data
  const summaryData = {
    totalIncome: 22850.75,
    totalExpenses: 10725.35,
    netProfit: 12125.40,
    incomeChange: 5.5,
    expenseChange: 2.2,
    profitChange: 8.7
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Marina Income & Expenses</h1>
        
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
            onClick={onAddRecord}
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
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-2">
            <CardTitle className="text-lg text-blue-800">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <BarChart />
          </CardContent>
        </Card>
        
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-2">
            <CardTitle className="text-lg text-blue-800">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <LineChart />
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-2">
            <CardTitle className="text-lg text-blue-800">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <PieChart />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2 bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-2">
            <CardTitle className="text-lg text-blue-800">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <TransactionItem 
                description="Boat Rental - Sea Breeze"
                amount={250}
                date="Apr 5, 2023"
                type="income"
              />
              
              <TransactionItem 
                description="Fuel Purchase - Marina Bay"
                amount={135.75}
                date="Apr 4, 2023"
                type="expense"
              />
              
              <TransactionItem 
                description="Boat Rental - Ocean Explorer"
                amount={550}
                date="Apr 4, 2023"
                type="income"
              />
              
              <TransactionItem 
                description="Maintenance - Engine Service"
                amount={285.50}
                date="Apr 2, 2023"
                type="expense"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Boat-Specific Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-2 flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-blue-800 flex items-center">
              <Gauge className="h-5 w-5 mr-2 text-blue-600" />
              Fuel Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Average Consumption</p>
                  <p className="text-2xl font-semibold">4.2 gal/hr</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last Month</p>
                  <p className="text-sm text-green-600 flex items-center">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    -0.3 gal/hr
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sea Breeze</span>
                  <span>3.2 gal/hr</span>
                </div>
                <Progress value={60} className="h-2" />
                
                <div className="flex justify-between text-sm">
                  <span>Ocean Explorer</span>
                  <span>5.8 gal/hr</span>
                </div>
                <Progress value={85} className="h-2" />
                
                <div className="flex justify-between text-sm">
                  <span>Wave Runner</span>
                  <span>2.7 gal/hr</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-2 flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-blue-800 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Engine Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Fleet Hours</p>
                  <p className="text-2xl font-semibold">940 hrs</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Since Last Service</p>
                  <p className="text-lg font-semibold text-amber-600">42 hrs</p>
                </div>
              </div>
              
              <div className="space-y-1 mt-4">
                <div className="flex justify-between text-sm">
                  <span>Sea Breeze</span>
                  <div>
                    <span className="font-medium">125 hrs</span>
                    <span className="text-xs text-gray-500 ml-2">(25 since service)</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Ocean Explorer</span>
                  <div>
                    <span className="font-medium">210 hrs</span>
                    <span className="text-xs text-gray-500 ml-2">(42 since service)</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Wave Runner</span>
                  <div>
                    <span className="font-medium">45 hrs</span>
                    <span className="text-xs text-gray-500 ml-2">(10 since service)</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Coastal Cruiser</span>
                  <div>
                    <span className="font-medium">320 hrs</span>
                    <span className="text-xs text-red-500 ml-2">(80 since service)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-2 flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-blue-800 flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
              Boat Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex justify-center">
              <div style={{ width: '100%', height: '200px' }}>
                {/* Simple visual representation of usage breakdown */}
                <div className="flex h-full">
                  <div 
                    className="bg-green-500 h-full relative" 
                    style={{ width: '65%' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white font-medium">
                      <span>65% Charter</span>
                    </div>
                  </div>
                  <div 
                    className="bg-yellow-500 h-full relative" 
                    style={{ width: '20%' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white font-medium">
                      <span>20% Idle</span>
                    </div>
                  </div>
                  <div 
                    className="bg-red-500 h-full relative" 
                    style={{ width: '15%' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-xs">
                      <span>15% Maintenance</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="flex items-center">
                  <span className="bg-green-500 w-3 h-3 inline-block mr-2 rounded-sm"></span>
                  Charter Time
                </span>
                <span>780 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <span className="bg-yellow-500 w-3 h-3 inline-block mr-2 rounded-sm"></span>
                  Idle Time
                </span>
                <span>240 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <span className="bg-red-500 w-3 h-3 inline-block mr-2 rounded-sm"></span>
                  Maintenance
                </span>
                <span>180 hours</span>
              </div>
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
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
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
          <div className="text-xs text-gray-400">{date}</div>
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
