import React, { useState, useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, subMonths, endOfDay, min, max, differenceInDays } from "date-fns";
import { getDateFnsLocale, getBcp47Locale } from "@/utils/localeMap";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface ChartProps {
  financialRecords?: FinancialRecord[];
  lang?: string;
  timeframe?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658", "#ff7c43"];

// Generate time buckets based on timeframe - now using calendar-based logic
const getTimeBuckets = (timeframe: string, lang: string, records: FinancialRecord[]) => {
  const now = new Date();
  const locale = getDateFnsLocale(lang);
  
  let startDate: Date;
  let endDate = endOfDay(now);
  
  switch (timeframe) {
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      // Daily buckets for week
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEE', { locale }),
        date,
        bucketType: 'daily' as const
      }));
    case 'month':
      startDate = startOfMonth(now);
      // Daily buckets for month (show date number)
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'd', { locale }),
        date,
        bucketType: 'daily' as const
      }));
    case 'year':
      startDate = startOfYear(now);
      // Monthly buckets for year
      return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM', { locale }),
        date,
        bucketType: 'monthly' as const
      }));
    case 'all':
      // All time always uses monthly buckets
      if (records.length === 0) {
        startDate = subMonths(now, 1);
        return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
          key: format(date, 'yyyy-MM'),
          label: format(date, 'MMM yy', { locale }),
          date,
          bucketType: 'monthly' as const
        }));
      }
      {
        const dates = records.map(r => new Date(r.date));
        startDate = min(dates);
        endDate = max([max(dates), now]);
        return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
          key: format(date, 'yyyy-MM'),
          label: format(date, 'MMM yy', { locale }),
          date,
          bucketType: 'monthly' as const
        }));
      }
    case 'custom':
      // For custom range, use the actual data range with adaptive scaling
      if (records.length === 0) {
        startDate = subMonths(now, 1);
        return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
          key: format(date, 'yyyy-MM-dd'),
          label: format(date, 'd', { locale }),
          date,
          bucketType: 'daily' as const
        }));
      }
      {
        const dates = records.map(r => new Date(r.date));
        startDate = min(dates);
        endDate = max(dates);
        const daysDiff = differenceInDays(endDate, startDate);
        
        if (daysDiff <= 31) {
          return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
            key: format(date, 'yyyy-MM-dd'),
            label: format(date, 'd MMM', { locale }),
            date,
            bucketType: 'daily' as const
          }));
        } else if (daysDiff <= 120) {
          return eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 }).map(date => ({
            key: format(date, 'yyyy-MM-dd'),
            label: format(date, 'd MMM', { locale }),
            date,
            bucketType: 'weekly' as const
          }));
        } else {
          return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
            key: format(date, 'yyyy-MM'),
            label: format(date, 'MMM yy', { locale }),
            date,
            bucketType: 'monthly' as const
          }));
        }
      }
    default:
      startDate = startOfMonth(now);
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'd', { locale }),
        date,
        bucketType: 'daily' as const
      }));
  }
};

// Aggregate income and expenses by time buckets
const aggregateByTimeBuckets = (records: FinancialRecord[], timeframe: string, lang: string) => {
  const buckets = getTimeBuckets(timeframe, lang, records);
  const isMonthly = timeframe === 'year' || 
    (timeframe === 'all' && records.length > 0 && buckets.length > 0 && buckets[0].key.length === 7) ||
    (timeframe === 'custom' && records.length > 0 && buckets.length > 0 && buckets[0].key.length === 7);
  
  const data = buckets.map(bucket => {
    const bucketRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      if (isMonthly) {
        return format(recordDate, 'yyyy-MM') === bucket.key;
      }
      return format(recordDate, 'yyyy-MM-dd') === bucket.key;
    });
    
    const income = bucketRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    
    const expenses = bucketRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    
    const revenue = income - expenses;
    
    return {
      name: bucket.label,
      income,
      expenses,
      revenue
    };
  });
  
  return data;
};

// Helper function to aggregate expenses by category
const aggregateByCategory = (records: FinancialRecord[], lang: string) => {
  const categoryData: Record<string, number> = {};
  
  const expenseRecords = records.filter(r => r.type === 'expense');
  
  expenseRecords.forEach(record => {
    const category = record.category || 'other';
    if (!categoryData[category]) {
      categoryData[category] = 0;
    }
    categoryData[category] += Number(record.amount);
  });
  
  // If no data, show empty state
  if (Object.keys(categoryData).length === 0) {
    return [];
  }
  
  const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
  
  // Category label translations
  // Category labels are now handled via translation - use raw category name
  // The parent component should pass translated labels
  return Object.entries(categoryData)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / total) * 100),
      amount: value,
      rawName: name
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Format currency for Y-axis — always use €
const formatYAxis = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k€`;
  }
  return `${value}€`;
};

// Cumulative aggregation for LineChart only
const aggregateCumulative = (records: FinancialRecord[], timeframe: string, lang: string) => {
  const buckets = getTimeBuckets(timeframe, lang, records);
  
  if (buckets.length === 0) return [];
  
  const incomeRecords = records.filter(r => r.type === 'income');
  const expenseRecords = records.filter(r => r.type === 'expense');
  
  return buckets.map(bucket => {
    const bucketType = (bucket as any).bucketType;
    let bucketEnd: Date;
    
    if (bucketType === 'weekly') {
      bucketEnd = endOfDay(endOfWeek(bucket.date, { weekStartsOn: 1 }));
    } else if (bucketType === 'monthly' || bucket.key.length === 7) {
      bucketEnd = endOfDay(endOfMonth(bucket.date));
    } else {
      bucketEnd = endOfDay(bucket.date);
    }
    
    const income = incomeRecords
      .filter(r => new Date(r.date) <= bucketEnd)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    
    const expenses = expenseRecords
      .filter(r => new Date(r.date) <= bucketEnd)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    
    return {
      name: bucket.label,
      income,
      expenses,
      netIncome: income - expenses
    };
  });
};

export function BarChart({ financialRecords = [], lang = 'en', timeframe = 'month' }: ChartProps) {
  const chartData = useMemo(() => {
    // Records are already pre-filtered by parent component
    const data = aggregateByTimeBuckets(financialRecords, timeframe, lang);
    
    if (data.length === 0 || data.every(d => d.income === 0 && d.expenses === 0)) {
      return [{ name: '-', income: 0, expenses: 0 }];
    }
    
    // For month view, sample every 3rd day to avoid crowding
    if (timeframe === 'month' && data.length > 15) {
      return data.filter((_, i) => i % 3 === 0 || i === data.length - 1);
    }
    
    // For all time or custom with many data points, sample appropriately
    if ((timeframe === 'all' || timeframe === 'custom') && data.length > 20) {
      const step = Math.ceil(data.length / 15);
      return data.filter((_, i) => i % step === 0 || i === data.length - 1);
    }
    
    return data;
  }, [financialRecords, timeframe, lang]);

  const currencySymbol = '€';

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: number) => [`€${value.toLocaleString(getBcp47Locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, undefined]}
            labelStyle={{ color: "#333" }}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Legend 
            formatter={(value) => value === 'income' ? 'Income' : 'Expenses'}
          />
          <Bar dataKey="income" name="income" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={timeframe === 'week' ? 30 : 15} />
          <Bar dataKey="expenses" name="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={timeframe === 'week' ? 30 : 15} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineChart({ financialRecords = [], lang = 'en', timeframe = 'month' }: ChartProps) {
  const chartData = useMemo(() => {
    const data = aggregateCumulative(financialRecords, timeframe, lang);
    
    if (data.length === 0 || data.every(d => d.income === 0 && d.expenses === 0)) {
      return [{ name: '-', income: 0, expenses: 0, netIncome: 0 }];
    }
    
    return data;
  }, [financialRecords, timeframe, lang]);

  const getLineName = (name: string) => {
    if (name === 'income') return 'Income';
    if (name === 'expenses') return 'Expenses';
    if (name === 'netIncome') return 'Net Income';
    return name;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`,
              getLineName(name)
            ]}
            labelStyle={{ color: "#333" }}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Legend 
            formatter={(value) => getLineName(value)}
          />
          <Line
            type="monotone"
            dataKey="income"
            name="income"
            stroke="#22c55e"
            activeDot={{ r: 5, strokeWidth: 0 }}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            name="expenses"
            stroke="#ef4444"
            activeDot={{ r: 5, strokeWidth: 0 }}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="netIncome"
            name="netIncome"
            stroke="#3b82f6"
            activeDot={{ r: 5, strokeWidth: 0 }}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PieChartProps extends ChartProps {
  onCategoryData?: (data: Array<{ name: string; value: number; amount: number }>) => void;
}

export function PieChart({ financialRecords = [], lang = 'en', timeframe = 'month', onCategoryData }: PieChartProps) {
  const chartData = useMemo(() => {
    // Records are already pre-filtered by parent component
    const data = aggregateByCategory(financialRecords, lang);
    
    // Notify parent of category data for breakdown list
    if (onCategoryData) {
      onCategoryData(data);
    }
    
    return data;
  }, [financialRecords, lang, onCategoryData]);

  const currencySymbol = '€';

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        -
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
            label={({ name, value }) => `${value}%`}
            labelLine={{ strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend 
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ 
              fontSize: '11px', 
              paddingLeft: '5px',
              maxWidth: '120px'
            }}
            formatter={(value, entry: any) => (
              <span className="text-xs truncate">{value}</span>
            )}
          />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => [
              `${value}% (€${props.payload.amount.toLocaleString(getBcp47Locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
              name
            ]}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              fontSize: '12px'
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Category breakdown component to display below pie chart
export function CategoryBreakdown({ data, lang = 'en' }: { data: Array<{ name: string; value: number; amount: number }>; lang?: string }) {
  const currencySymbol = '€';
  
  if (data.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2 mt-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">
        Category Breakdown
      </h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{item.name}</span>
            </div>
            <span className="font-medium">
              €{item.amount.toLocaleString(getBcp47Locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
