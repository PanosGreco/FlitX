import React, { useState, useEffect, useMemo } from "react";
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
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  endOfDay,
  min,
  max,
  differenceInDays,
} from "date-fns";
import { getDateFnsLocale, getBcp47Locale } from "@/utils/localeMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DateRange } from "@/utils/dateRangeUtils";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ChartProps {
  financialRecords?: FinancialRecord[];
  lang?: string;
  timeframe?: string;
  customRange?: DateRange;
  title?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658", "#ff7c43"];

// ─── Granularity defaults & toggle logic ───

function getDefaultGranularity(timeframe: string, customRange?: DateRange): Granularity {
  switch (timeframe) {
    case 'week': return 'daily';
    case 'month': return 'daily';
    case 'year': return 'monthly';
    case 'all': return 'monthly';
    case 'custom': {
      if (!customRange) return 'daily';
      const days = differenceInDays(customRange.endDate, customRange.startDate);
      if (days <= 62) return 'daily';
      return 'monthly';
    }
    default: return 'daily';
  }
}

function getToggleOptions(timeframe: string, customRange?: DateRange): [Granularity, Granularity] | null {
  switch (timeframe) {
    case 'week': return null;
    case 'month': return ['daily', 'weekly'];
    case 'year': return null;
    case 'all': return ['monthly', 'yearly'];
    case 'custom': {
      if (!customRange) return null;
      const days = differenceInDays(customRange.endDate, customRange.startDate);
      if (days <= 14) return null;
      if (days <= 62) return ['daily', 'weekly'];
      if (days <= 730) return null;
      return ['monthly', 'yearly'];
    }
    default: return null;
  }
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

// ─── X-axis label interval ───

function getXAxisInterval(length: number): number {
  if (length <= 15) return 0;
  if (length <= 30) return 1;
  if (length <= 60) return Math.ceil(length / 15) - 1;
  return Math.ceil(length / 12) - 1;
}

// ─── Time buckets ───

interface TimeBucket {
  key: string;
  label: string;
  date: Date;
  bucketType: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const getTimeBuckets = (
  timeframe: string,
  lang: string,
  records: FinancialRecord[],
  granularity?: Granularity,
  customRange?: DateRange
): TimeBucket[] => {
  const now = new Date();
  const locale = getDateFnsLocale(lang);

  // Determine date range
  let startDate: Date;
  let endDate: Date;

  switch (timeframe) {
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfDay(now);
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfDay(now);
      break;
    case 'year':
      startDate = startOfYear(now);
      endDate = endOfDay(now);
      break;
    case 'all':
      if (records.length === 0) {
        startDate = startOfMonth(now);
        endDate = endOfDay(now);
      } else {
        const dates = records.map(r => new Date(r.date));
        startDate = min(dates);
        // BUG 2 FIX: end at last record, not today
        endDate = endOfDay(max(dates));
      }
      break;
    case 'custom':
      // BUG 4 FIX: use user-picked range when available
      if (customRange) {
        startDate = customRange.startDate;
        endDate = endOfDay(customRange.endDate);
      } else if (records.length === 0) {
        startDate = startOfMonth(now);
        endDate = endOfDay(now);
      } else {
        const dates = records.map(r => new Date(r.date));
        startDate = min(dates);
        endDate = endOfDay(max(dates));
      }
      break;
    default:
      startDate = startOfMonth(now);
      endDate = endOfDay(now);
  }

  // Resolve granularity
  const g = granularity || getDefaultGranularity(timeframe, customRange);

  // Check if range spans a single year (for shorter month labels)
  const singleYear = startDate.getFullYear() === endDate.getFullYear();

  switch (g) {
    case 'daily':
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'd MMM', { locale }),
        date,
        bucketType: 'daily',
      }));
    case 'weekly':
      return eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 }).map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'd MMM', { locale }),
        date,
        bucketType: 'weekly',
      }));
    case 'monthly':
      return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM'),
        label: format(date, singleYear ? 'MMM' : 'MMM yy', { locale }),
        date,
        bucketType: 'monthly',
      }));
    case 'yearly':
      return eachYearOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy'),
        label: format(date, 'yyyy'),
        date,
        bucketType: 'yearly',
      }));
  }
};

// ─── Record-to-bucket matching (BUG 3 FIX) ───

function recordMatchesBucket(recordDate: Date, bucket: TimeBucket): boolean {
  switch (bucket.bucketType) {
    case 'daily':
      return format(recordDate, 'yyyy-MM-dd') === bucket.key;
    case 'weekly': {
      const weekStart = startOfWeek(bucket.date, { weekStartsOn: 1 });
      const weekEnd = endOfDay(endOfWeek(bucket.date, { weekStartsOn: 1 }));
      return recordDate >= weekStart && recordDate <= weekEnd;
    }
    case 'monthly':
      return format(recordDate, 'yyyy-MM') === bucket.key;
    case 'yearly':
      return format(recordDate, 'yyyy') === bucket.key;
  }
}

// ─── Aggregation: per-bucket (BarChart) ───

const aggregateByTimeBuckets = (
  records: FinancialRecord[],
  timeframe: string,
  lang: string,
  granularity?: Granularity,
  customRange?: DateRange
) => {
  const buckets = getTimeBuckets(timeframe, lang, records, granularity, customRange);

  return buckets.map(bucket => {
    const bucketRecords = records.filter(record =>
      recordMatchesBucket(new Date(record.date), bucket)
    );

    const income = bucketRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const expenses = bucketRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      name: bucket.label,
      income,
      expenses,
      revenue: income - expenses,
    };
  });
};

// ─── Aggregation: cumulative (LineChart) ───

const aggregateCumulative = (
  records: FinancialRecord[],
  timeframe: string,
  lang: string,
  granularity?: Granularity,
  customRange?: DateRange
) => {
  const buckets = getTimeBuckets(timeframe, lang, records, granularity, customRange);
  if (buckets.length === 0) return [];

  const incomeRecords = records.filter(r => r.type === 'income');
  const expenseRecords = records.filter(r => r.type === 'expense');

  return buckets.map(bucket => {
    let bucketEnd: Date;
    switch (bucket.bucketType) {
      case 'weekly':
        bucketEnd = endOfDay(endOfWeek(bucket.date, { weekStartsOn: 1 }));
        break;
      case 'monthly':
        bucketEnd = endOfDay(endOfMonth(bucket.date));
        break;
      case 'yearly':
        bucketEnd = endOfDay(endOfYear(bucket.date));
        break;
      default: // daily
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
      netIncome: income - expenses,
    };
  });
};

// ─── Helpers ───

const aggregateByCategory = (records: FinancialRecord[], lang: string) => {
  const categoryData: Record<string, number> = {};
  const expenseRecords = records.filter(r => r.type === 'expense');

  expenseRecords.forEach(record => {
    const category = record.category || 'other';
    if (!categoryData[category]) categoryData[category] = 0;
    categoryData[category] += Number(record.amount);
  });

  if (Object.keys(categoryData).length === 0) return [];

  const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);

  return Object.entries(categoryData)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / total) * 100),
      amount: value,
      rawName: name,
    }))
    .sort((a, b) => b.amount - a.amount);
};

const formatYAxis = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${value}€`;
};

// ─── Granularity Toggle Component ───

function GranularityToggle({
  options,
  granularity,
  setGranularity,
}: {
  options: [Granularity, Granularity];
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
}) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden text-xs">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => setGranularity(opt)}
          className={cn(
            "px-2 py-1 font-medium transition-colors",
            granularity === opt
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          {GRANULARITY_LABELS[opt]}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// BarChart
// ═══════════════════════════════════════════

export function BarChart({ financialRecords = [], lang = 'en', timeframe = 'month', customRange, title = 'Income vs Expenses' }: ChartProps) {
  const [granularity, setGranularity] = useState<Granularity>(() => getDefaultGranularity(timeframe, customRange));

  // Reset granularity when timeframe or customRange changes
  useEffect(() => {
    setGranularity(getDefaultGranularity(timeframe, customRange));
  }, [timeframe, customRange]);

  const toggleOptions = getToggleOptions(timeframe, customRange);

  const chartData = useMemo(() => {
    const data = aggregateByTimeBuckets(financialRecords, timeframe, lang, granularity, customRange);
    if (data.length === 0 || data.every(d => d.income === 0 && d.expenses === 0)) {
      return [{ name: '-', income: 0, expenses: 0 }];
    }
    // BUG 1 FIX: keep ALL data points, thin labels only via XAxis interval
    return data;
  }, [financialRecords, timeframe, lang, granularity, customRange]);

  const xAxisInterval = getXAxisInterval(chartData.length);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          {toggleOptions && (
            <GranularityToggle options={toggleOptions} granularity={granularity} setGranularity={setGranularity} />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [
                  `€${value.toLocaleString(getBcp47Locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  undefined,
                ]}
                labelStyle={{ color: "#333" }}
                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Legend formatter={(value) => (value === 'income' ? 'Income' : 'Expenses')} />
              <Bar dataKey="income" name="income" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={timeframe === 'week' ? 30 : 15} />
              <Bar dataKey="expenses" name="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={timeframe === 'week' ? 30 : 15} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// LineChart
// ═══════════════════════════════════════════

export function LineChart({ financialRecords = [], lang = 'en', timeframe = 'month', customRange, title = 'Trend Over Time' }: ChartProps) {
  const [granularity, setGranularity] = useState<Granularity>(() => getDefaultGranularity(timeframe, customRange));

  useEffect(() => {
    setGranularity(getDefaultGranularity(timeframe, customRange));
  }, [timeframe, customRange]);

  const toggleOptions = getToggleOptions(timeframe, customRange);

  const chartData = useMemo(() => {
    const data = aggregateCumulative(financialRecords, timeframe, lang, granularity, customRange);
    if (data.length === 0 || data.every(d => d.income === 0 && d.expenses === 0)) {
      return [{ name: '-', income: 0, expenses: 0, netIncome: 0 }];
    }
    return data;
  }, [financialRecords, timeframe, lang, granularity, customRange]);

  const xAxisInterval = getXAxisInterval(chartData.length);

  const getLineName = (name: string) => {
    if (name === 'income') return 'Income';
    if (name === 'expenses') return 'Expenses';
    if (name === 'netIncome') return 'Net Income';
    return name;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          {toggleOptions && (
            <GranularityToggle options={toggleOptions} granularity={granularity} setGranularity={setGranularity} />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                interval={xAxisInterval}
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
                  getLineName(name),
                ]}
                labelStyle={{ color: "#333" }}
                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Legend formatter={(value) => getLineName(value)} />
              <Line type="monotone" dataKey="income" name="income" stroke="#22c55e" activeDot={{ r: 5, strokeWidth: 0 }} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="expenses" name="expenses" stroke="#ef4444" activeDot={{ r: 5, strokeWidth: 0 }} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="netIncome" name="netIncome" stroke="#3b82f6" activeDot={{ r: 5, strokeWidth: 0 }} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// PieChart (unchanged)
// ═══════════════════════════════════════════

interface PieChartProps extends ChartProps {
  onCategoryData?: (data: Array<{ name: string; value: number; amount: number }>) => void;
}

export function PieChart({ financialRecords = [], lang = 'en', timeframe = 'month', onCategoryData }: PieChartProps) {
  const chartData = useMemo(() => {
    const data = aggregateByCategory(financialRecords, lang);
    if (onCategoryData) onCategoryData(data);
    return data;
  }, [financialRecords, lang, onCategoryData]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">-</div>
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
            label={({ value }) => `${value}%`}
            labelLine={{ strokeWidth: 1 }}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: '11px', paddingLeft: '5px', maxWidth: '120px' }}
            formatter={(value) => <span className="text-xs truncate">{value}</span>}
          />
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${value}% (€${props.payload.amount.toLocaleString(getBcp47Locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
              name,
            ]}
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: '12px' }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════
// CategoryBreakdown (unchanged)
// ═══════════════════════════════════════════

export function CategoryBreakdown({ data, lang = 'en' }: { data: Array<{ name: string; value: number; amount: number }>; lang?: string }) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-2 mt-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">Category Breakdown</h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
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
