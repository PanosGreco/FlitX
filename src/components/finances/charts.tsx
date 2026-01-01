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
import { format, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subDays, subMonths, subYears } from "date-fns";
import { el, enUS } from "date-fns/locale";

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

// Get date range based on timeframe
const getDateRange = (timeframe: string) => {
  const now = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case 'week':
      startDate = subDays(now, 7);
      break;
    case 'month':
      startDate = subMonths(now, 1);
      break;
    case 'quarter':
      startDate = subMonths(now, 3);
      break;
    case 'year':
      startDate = subYears(now, 1);
      break;
    default:
      startDate = subMonths(now, 1);
  }
  
  return { startDate, endDate: now };
};

// Filter records by timeframe
const filterByTimeframe = (records: FinancialRecord[], timeframe: string) => {
  const { startDate } = getDateRange(timeframe);
  return records.filter(record => new Date(record.date) >= startDate);
};

// Generate time buckets based on timeframe
const getTimeBuckets = (timeframe: string, lang: string) => {
  const { startDate, endDate } = getDateRange(timeframe);
  const locale = lang === 'el' ? el : enUS;
  
  switch (timeframe) {
    case 'week':
      // Daily buckets for week
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEE', { locale }),
        date
      }));
    case 'month':
      // Daily buckets for month (show date number)
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'd', { locale }),
        date
      }));
    case 'quarter':
      // Monthly buckets for quarter
      return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM', { locale }),
        date
      }));
    case 'year':
      // Monthly buckets for year
      return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM', { locale }),
        date
      }));
    default:
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'd', { locale }),
        date
      }));
  }
};

// Aggregate income and expenses by time buckets
const aggregateByTimeBuckets = (records: FinancialRecord[], timeframe: string, lang: string) => {
  const buckets = getTimeBuckets(timeframe, lang);
  const isMonthly = timeframe === 'quarter' || timeframe === 'year';
  
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
    
    return {
      name: bucket.label,
      income,
      expenses
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
  const categoryLabels: Record<string, { en: string; el: string }> = {
    fuel: { en: 'Fuel', el: 'Καύσιμα' },
    maintenance: { en: 'Maintenance', el: 'Συντήρηση' },
    carwash: { en: 'Car Wash', el: 'Πλύσιμο' },
    insurance: { en: 'Insurance', el: 'Ασφάλεια' },
    tax: { en: 'Taxes', el: 'Φόροι' },
    salary: { en: 'Salaries', el: 'Μισθοί' },
    cleaning: { en: 'Cleaning', el: 'Καθαρισμός' },
    docking: { en: 'Docking', el: 'Ελλιμενισμός' },
    licensing: { en: 'Licensing', el: 'Αδειοδότηση' },
    other: { en: 'Other', el: 'Άλλο' },
    sales: { en: 'Sales', el: 'Πωλήσεις' }
  };
  
  return Object.entries(categoryData)
    .map(([name, value]) => ({
      name: categoryLabels[name]?.[lang === 'el' ? 'el' : 'en'] || name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / total) * 100),
      amount: value,
      rawName: name
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Format currency for Y-axis
const formatYAxis = (value: number, lang: string) => {
  const symbol = lang === 'el' ? '€' : '$';
  if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}k`;
  }
  return `${symbol}${value}`;
};

export function BarChart({ financialRecords = [], lang = 'en', timeframe = 'month' }: ChartProps) {
  const chartData = useMemo(() => {
    const filtered = filterByTimeframe(financialRecords, timeframe);
    const data = aggregateByTimeBuckets(filtered, timeframe, lang);
    
    if (data.length === 0 || data.every(d => d.income === 0 && d.expenses === 0)) {
      return [{ name: lang === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data', income: 0, expenses: 0 }];
    }
    
    // For month view, sample every 3rd day to avoid crowding
    if (timeframe === 'month' && data.length > 15) {
      return data.filter((_, i) => i % 3 === 0 || i === data.length - 1);
    }
    
    return data;
  }, [financialRecords, timeframe, lang]);

  const currencySymbol = lang === 'el' ? '€' : '$';

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
            tickFormatter={(value) => formatYAxis(value, lang)}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: number) => [`${currencySymbol}${value.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, undefined]}
            labelStyle={{ color: "#333" }}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Legend 
            formatter={(value) => value === 'income' ? (lang === 'el' ? 'Έσοδα' : 'Income') : (lang === 'el' ? 'Έξοδα' : 'Expenses')}
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
    const filtered = filterByTimeframe(financialRecords, timeframe);
    const data = aggregateByTimeBuckets(filtered, timeframe, lang);
    
    if (data.length === 0 || data.every(d => d.income === 0 && d.expenses === 0)) {
      return [{ name: lang === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data', income: 0, expenses: 0 }];
    }
    
    // For month view, sample every 3rd day to avoid crowding
    if (timeframe === 'month' && data.length > 15) {
      return data.filter((_, i) => i % 3 === 0 || i === data.length - 1);
    }
    
    return data;
  }, [financialRecords, timeframe, lang]);

  const currencySymbol = lang === 'el' ? '€' : '$';

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
            tickFormatter={(value) => formatYAxis(value, lang)}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `${currencySymbol}${value.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              name === 'income' ? (lang === 'el' ? 'Έσοδα' : 'Income') : (lang === 'el' ? 'Έξοδα' : 'Expenses')
            ]}
            labelStyle={{ color: "#333" }}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Legend 
            formatter={(value) => value === 'income' ? (lang === 'el' ? 'Έσοδα' : 'Income') : (lang === 'el' ? 'Έξοδα' : 'Expenses')}
          />
          <Line
            type="monotone"
            dataKey="income"
            name="income"
            stroke="#22c55e"
            activeDot={{ r: 6 }}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            name="expenses"
            stroke="#ef4444"
            activeDot={{ r: 6 }}
            strokeWidth={2}
            dot={{ r: 3 }}
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
    const filtered = filterByTimeframe(financialRecords, timeframe);
    const data = aggregateByCategory(filtered, lang);
    
    // Notify parent of category data for breakdown list
    if (onCategoryData) {
      onCategoryData(data);
    }
    
    return data;
  }, [financialRecords, timeframe, lang, onCategoryData]);

  const currencySymbol = lang === 'el' ? '€' : '$';

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        {lang === 'el' ? 'Δεν υπάρχουν έξοδα' : 'No expenses'}
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
              `${value}% (${currencySymbol}${props.payload.amount.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
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
  const currencySymbol = lang === 'el' ? '€' : '$';
  
  if (data.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2 mt-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">
        {lang === 'el' ? 'Κατανομή ανά κατηγορία' : 'Category Breakdown'}
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
              {currencySymbol}{item.amount.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
