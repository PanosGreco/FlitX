import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Car, Ship } from "lucide-react";
import { getMonth, format, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears, endOfDay } from "date-fns";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { getVehicleCategoryLabel } from "@/constants/vehicleTypes";
import { useTranslation } from "react-i18next";
import { getDateFnsLocale, getBcp47Locale } from "@/utils/localeMap";
import { cn } from "@/lib/utils";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  income_source_type?: string | null;
  income_source_specification?: string | null;
  vehicle_id?: string | null;
}
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type?: string;
  vehicle_type?: string;
  is_sold?: boolean;
}
interface VehicleProfitRank {
  id: string;
  name: string;
  avgProfitPerDay: number;
}
interface IncomeBreakdownProps {
  financialRecords: FinancialRecord[];
  allRecords?: FinancialRecord[];
  vehicles?: Vehicle[];
  lang?: string;
  timeframe?: string;
  vehicleProfitRanking?: VehicleProfitRank[];
  customRange?: { startDate: Date; endDate: Date };
}

// Distinct income colors: Blue, Green, Orange, Purple, Red
const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ef4444"];
// Additional colors for category breakdown
const CATEGORY_COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"];
const INCOME_SOURCE_KEYS: Record<string, string> = {
  walk_in: "directBooking",
  collaboration: "collaboration",
  other: "other",
  booking: "rental",
  sales: "sales"
};

// Helper to get the category key for a record (shared between current and previous period)
const getCategoryKey = (record: FinancialRecord): string => {
  const sourceType = record.income_source_type || 'other';
  if (record.category === 'additional' && record.description) {
    const insuranceWithTypeMatch = record.description.match(/^Insurance\s*-\s*(.+?)\s*\(Additional Cost\)/);
    const legacyInsuranceMatch = record.description.match(/^Insurance\s*\(Additional Cost\)\s*-\s*(.+?)\s*-/);
    const genericMatch = record.description.match(/^(.+?)\s*\(Additional Cost\)/);
    let costName: string;
    if (insuranceWithTypeMatch) costName = `Insurance - ${insuranceWithTypeMatch[1].trim()}`;
    else if (legacyInsuranceMatch) costName = `Insurance - ${legacyInsuranceMatch[1].trim()}`;
    else if (genericMatch) costName = genericMatch[1].trim();
    else costName = 'Additional Cost';
    return `additional_${costName.toLowerCase().replace(/\s+/g, '_')}`;
  } else if (sourceType === 'collaboration' && record.income_source_specification) {
    return `${sourceType}_${record.income_source_specification.trim().toLowerCase()}`;
  } else if (sourceType === 'other' && record.income_source_specification) {
    return `other_${record.income_source_specification.trim().toLowerCase()}`;
  }
  return sourceType;
};

// Helper to get previous period date range
const getPreviousPeriodRange = (timeframe: string, customRange?: { startDate: Date; endDate: Date }): { startDate: Date; endDate: Date } => {
  const now = new Date();
  switch (timeframe) {
    case 'week': {
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const prevWeekStart = subWeeks(currentWeekStart, 1);
      const prevWeekEnd = new Date(currentWeekStart.getTime() - 1);
      return { startDate: prevWeekStart, endDate: prevWeekEnd };
    }
    case 'month': {
      const currentMonthStart = startOfMonth(now);
      const prevMonthStart = subMonths(currentMonthStart, 1);
      const prevMonthEnd = new Date(currentMonthStart.getTime() - 1);
      return { startDate: prevMonthStart, endDate: prevMonthEnd };
    }
    case 'year': {
      const currentYearStart = startOfYear(now);
      const prevYearStart = subYears(currentYearStart, 1);
      const prevYearEnd = new Date(currentYearStart.getTime() - 1);
      return { startDate: prevYearStart, endDate: prevYearEnd };
    }
    case 'custom': {
      if (customRange) {
        const rangeMs = customRange.endDate.getTime() - customRange.startDate.getTime();
        const prevEnd = new Date(customRange.startDate.getTime() - 1);
        const prevStart = new Date(customRange.startDate.getTime() - rangeMs);
        return { startDate: prevStart, endDate: prevEnd };
      }
      const currentMonthStart2 = startOfMonth(now);
      return { startDate: subMonths(currentMonthStart2, 1), endDate: new Date(currentMonthStart2.getTime() - 1) };
    }
    default:
      return { startDate: new Date(2000, 0, 1), endDate: endOfDay(now) };
  }
};

// Calculate average monthly growth rate for "all" timeframe
const calcAvgMonthlyGrowth = (records: FinancialRecord[], categoryKey: string): number | null => {
  // Group by YYYY-MM
  const monthlyTotals: Record<string, number> = {};
  records.filter(r => r.type === 'income' && getCategoryKey(r) === categoryKey).forEach(r => {
    const ym = r.date.substring(0, 7); // YYYY-MM
    monthlyTotals[ym] = (monthlyTotals[ym] || 0) + Number(r.amount);
  });
  
  const sortedMonths = Object.keys(monthlyTotals).sort();
  if (sortedMonths.length < 2) return null;
  
  const momChanges: number[] = [];
  for (let i = 1; i < sortedMonths.length; i++) {
    const prev = monthlyTotals[sortedMonths[i - 1]];
    const curr = monthlyTotals[sortedMonths[i]];
    if (prev > 0) {
      momChanges.push(((curr - prev) / prev) * 100);
    }
  }
  
  if (momChanges.length === 0) return null;
  return Math.round(momChanges.reduce((sum, c) => sum + c, 0) / momChanges.length);
};

export function IncomeBreakdown({
  financialRecords,
  allRecords,
  vehicles = [],
  lang = 'en',
  timeframe = 'month',
  vehicleProfitRanking = [],
  customRange
}: IncomeBreakdownProps) {
  const isBoats = isBoatBusiness();
  const { t } = useTranslation('finance');
  const currencySymbol = '€';

  // Helper to get source label via translation
  const getSourceLabel = (sourceType: string): string => {
    const key = INCOME_SOURCE_KEYS[sourceType];
    return key ? t(key) : sourceType;
  };

  // Records are already filtered by the parent component using calendar-based timeframes
  const filteredRecords = useMemo(() => {
    return financialRecords.filter((r) => r.type === 'income');
  }, [financialRecords]);

  // Helper function to normalize specifications for matching
  const normalizeSpecification = (spec: string | null | undefined): string => {
    if (!spec) return '';
    return spec.trim().toLowerCase();
  };

  // Helper function to get display specification (properly capitalized)
  const getDisplaySpecification = (spec: string): string => {
    if (!spec) return '';
    return spec.trim().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  // Aggregate income by source type - with dynamic categorization for collaboration/other
  const incomeBySource = useMemo(() => {
    const sourceData: Record<string, {
      total: number;
      count: number;
      months: Record<number, number>;
      displayLabel: string;
    }> = {};
    filteredRecords.forEach((record) => {
      const month = getMonth(new Date(record.date));
      const categoryKey = getCategoryKey(record);
      const sourceType = record.income_source_type || 'other';

      let displayLabel: string;
      if (record.category === 'additional' && record.description) {
        const insuranceWithTypeMatch = record.description.match(/^Insurance\s*-\s*(.+?)\s*\(Additional Cost\)/);
        const legacyInsuranceMatch = record.description.match(/^Insurance\s*\(Additional Cost\)\s*-\s*(.+?)\s*-/);
        const genericMatch = record.description.match(/^(.+?)\s*\(Additional Cost\)/);
        let costName: string;
        if (insuranceWithTypeMatch) costName = `Insurance - ${insuranceWithTypeMatch[1].trim()}`;
        else if (legacyInsuranceMatch) costName = `Insurance - ${legacyInsuranceMatch[1].trim()}`;
        else if (genericMatch) costName = genericMatch[1].trim();
        else costName = 'Additional Cost';
        displayLabel = `${costName} (${t('additionalCost')})`;
      } else if (sourceType === 'collaboration' && record.income_source_specification) {
        const displaySpec = getDisplaySpecification(record.income_source_specification);
        const baseLabel = getSourceLabel(sourceType);
        displayLabel = `${baseLabel} (${displaySpec})`;
      } else if (sourceType === 'other' && record.income_source_specification) {
        const displaySpec = getDisplaySpecification(record.income_source_specification);
        displayLabel = displaySpec;
      } else {
        displayLabel = getSourceLabel(sourceType);
      }

      if (!sourceData[categoryKey]) {
        sourceData[categoryKey] = {
          total: 0,
          count: 0,
          months: {},
          displayLabel
        };
      }
      sourceData[categoryKey].total += Number(record.amount);
      sourceData[categoryKey].count += 1;
      sourceData[categoryKey].months[month] = (sourceData[categoryKey].months[month] || 0) + Number(record.amount);
    });

    // Calculate growth for each source
    const recordsForGrowth = allRecords || financialRecords;

    return Object.entries(sourceData).map(([key, data]) => {
      let growth: number | null = null;
      let isNew = false;

      if (timeframe === 'all') {
        growth = calcAvgMonthlyGrowth(recordsForGrowth, key);
      } else {
        const prevRange = getPreviousPeriodRange(timeframe, customRange);
        const prevTotal = recordsForGrowth
          .filter(r => r.type === 'income' && getCategoryKey(r) === key)
          .filter(r => {
            const d = new Date(r.date);
            return d >= prevRange.startDate && d <= prevRange.endDate;
          })
          .reduce((sum, r) => sum + Number(r.amount), 0);

        if (prevTotal > 0) {
          growth = Math.round(((data.total - prevTotal) / prevTotal) * 100);
        } else if (data.total > 0) {
          isNew = true;
        }
      }

      return {
        key,
        label: data.displayLabel,
        total: data.total,
        count: data.count,
        growth,
        isNew,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang, allRecords, timeframe, customRange]);

  const grandTotalIncome = useMemo(() => incomeBySource.reduce((s, i) => s + i.total, 0), [incomeBySource]);

  // Prepare pie chart data with <5% grouping
  const pieData = useMemo(() => {
    const total = incomeBySource.reduce((sum, item) => sum + item.total, 0);
    if (total === 0) return [];
    
    const allSlices = incomeBySource.map((item, index) => ({
      name: item.label,
      value: Math.round(item.total / total * 100) || 0,
      amount: item.total,
      color: COLORS[index % COLORS.length]
    }));
    
    const majorSlices = allSlices.filter(s => s.value >= 5);
    const minorSlices = allSlices.filter(s => s.value < 5);
    
    if (minorSlices.length <= 1) return allSlices;
    
    const otherAmount = minorSlices.reduce((sum, s) => sum + s.amount, 0);
    const otherValue = Math.round(otherAmount / total * 100) || 0;
    const dominantMinor = minorSlices.reduce((a, b) => a.value >= b.value ? a : b);
    
    return [
      ...majorSlices,
      {
        name: t('otherLessThan5'),
        value: otherValue,
        amount: otherAmount,
        color: dominantMinor.color,
        subItems: minorSlices.map(s => ({ name: s.name, value: s.value, amount: s.amount }))
      }
    ];
  }, [incomeBySource, lang]);

  // Create vehicle lookup map
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Aggregate income by vehicle category (case-insensitive, no duplicates, NO UNKNOWN)
  const incomeByCategory = useMemo(() => {
    const categoryData: Record<string, {
      total: number;
      displayLabel: string;
    }> = {};
    filteredRecords.forEach((record) => {
      if (!record.vehicle_id) return;
      const vehicle = vehicleMap.get(record.vehicle_id);
      if (!vehicle || vehicle.is_sold) return;
      const rawCategory = vehicle.type;
      if (!rawCategory || rawCategory.trim() === '' || rawCategory.toLowerCase() === 'unknown') return;
      const normalizedKey = rawCategory.trim().toLowerCase();
      if (!categoryData[normalizedKey]) {
        const displayLabel = getVehicleCategoryLabel(rawCategory, lang);
        categoryData[normalizedKey] = { total: 0, displayLabel };
      }
      categoryData[normalizedKey].total += Number(record.amount);
    });
    return Object.entries(categoryData).map(([key, data]) => ({
      key,
      label: data.displayLabel,
      total: data.total
    })).sort((a, b) => b.total - a.total);
  }, [filteredRecords, vehicleMap, lang]);

  // Top 5 most profitable vehicles by avg profit/day
  const topVehicles = useMemo(() => {
    return [...vehicleProfitRanking].sort((a, b) => b.avgProfitPerDay - a.avgProfitPerDay).slice(0, 5);
  }, [vehicleProfitRanking]);

  if (filteredRecords.length === 0) {
    return <Card className="p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('incomeBreakdown')}
          </h2>
        </div>
        <p className="text-center text-muted-foreground py-6">
          {t('noIncome')}
        </p>
      </Card>;
  }
  return <Card className="p-4 shadow-sm">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-green-600" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('incomeBreakdown')}
        </h2>
      </div>

      {/* Unified Layout: Compact Table Left, Category Breakdown + Pie Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Source Table (compact - 5 columns) */}
        <div className="lg:col-span-5">
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-800 hover:bg-slate-800">
                  <TableHead className="text-primary-foreground font-semibold w-[45%] px-2 py-1.5 text-xs">
                    {t('source')}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold w-[30%] px-1 py-1.5 text-xs">
                    {t('total')}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold w-[25%] px-1 py-1.5 text-xs">
                    {t('growth')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeBySource.map((item, index) => <TableRow key={item.key} className="hover:bg-muted/50">
                    <TableCell className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: COLORS[index % COLORS.length]
                    }} />
                        <span className="truncate text-xs">
                          {item.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600 text-xs px-1 py-1">
                      {currencySymbol}{item.total.toLocaleString('el-GR', {
                    minimumFractionDigits: 0
                  })}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1 py-1">
                      <div className="flex items-center justify-end gap-0.5">
                        {item.isNew ? (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{t('new')}</span>
                        ) : item.growth !== null ? (
                          <>
                            {item.growth >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={cn("text-xs font-medium", item.growth >= 0 ? "text-green-600" : "text-red-600")}>
                              {item.growth >= 0 ? "+" : ""}{item.growth}%
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Middle: Vehicle Category Breakdown (2 columns) - INDEPENDENT HEIGHT */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-700 hover:bg-slate-700">
                  <TableHead className="text-white font-semibold w-[70%] px-2 py-1.5 text-xs">
                    <div className="flex flex-col leading-tight">
                      <span>{t('vehicleCategory')}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-white font-semibold w-[30%] px-1 py-1.5 text-xs">
                    {t('amount')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeByCategory.length > 0 ? incomeByCategory.slice(0, 6).map((item, index) => <TableRow key={item.key} className="hover:bg-muted/50">
                      <TableCell className="px-2 py-1">
                      <span className="truncate text-xs font-medium">
                            {item.label}
                          </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600 text-xs px-1 py-1">
                        {currencySymbol}{item.total.toLocaleString('el-GR', {
                    minimumFractionDigits: 0
                  })}
                      </TableCell>
                    </TableRow>) : <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-3">
                      {t('noData')}
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Pie Chart + Top Vehicles (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          {/* Pie Chart */}
          {pieData.length > 0 && <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{
              top: 8,
              right: 2,
              bottom: 2,
              left: 2
            }}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58} fill="#3b82f6" dataKey="value" paddingAngle={2} label={({
                value
              }) => `${value}%`} labelLine={{
                strokeWidth: 1
              }}>
                    {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                        <p className="font-semibold mb-1">{data.name} — {data.value}%</p>
                        <p className="text-muted-foreground">{currencySymbol}{data.amount.toLocaleString('el-GR', { minimumFractionDigits: 0 })}</p>
                        {data.subItems && data.subItems.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t space-y-0.5">
                            {data.subItems.map((sub: any, i: number) => (
                              <div key={i} className="flex justify-between gap-3 text-muted-foreground">
                                <span>{sub.name}</span>
                                <span>{sub.value}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>}

          {/* Most Profitable Vehicles - Card UI */}
          {topVehicles.length > 0 && <div className="border rounded-lg p-3 bg-card shadow-sm mt-2">
              <div className="mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span>{t('mostProfitable')}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('basedOnAvgProfit')}
                </p>
              </div>
              <div className="space-y-1">
                {topVehicles.map((vehicle, index) => <div key={vehicle.id} className="flex items-center justify-between py-1.5 px-2.5 bg-green-50/70 rounded-md text-[11px] border border-green-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-green-700 w-4 text-center">#{index + 1}</span>
                      <span className="font-medium truncate text-xs">{vehicle.name}</span>
                    </div>
                    <span className="font-semibold text-green-600 flex-shrink-0 ml-2 whitespace-nowrap text-xs">
                      €{vehicle.avgProfitPerDay.toFixed(2)} / day
                    </span>
                  </div>)}
              </div>
            </div>}
        </div>
      </div>
    </Card>;
}
