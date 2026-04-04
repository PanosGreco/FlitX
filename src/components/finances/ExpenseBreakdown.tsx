import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown, TrendingUp, Car, Ship } from "lucide-react";
import { getMonth, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears, endOfDay } from "date-fns";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { getMaintenanceTypeLabel } from "@/constants/maintenanceTypes";
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
  expense_subcategory?: string | null;
  vehicle_id?: string | null;
  vehicle_fuel_type?: string | null;
  vehicle_year?: number | null;
}
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  fuel_type?: string;
  type?: string;
  vehicle_type?: string;
  is_sold?: boolean;
}
const getFuelTypeLabel = (fuelType: string | null | undefined, t: (key: string) => string) => {
  if (!fuelType) return '–';
  const key = `fleet:fuel_${fuelType}`;
  const label = t(key);
  return label !== key ? label : fuelType;
};
interface VehicleProfitRank {
  id: string;
  name: string;
  avgProfitPerDay: number;
}
interface ExpenseBreakdownProps {
  financialRecords: FinancialRecord[];
  allRecords?: FinancialRecord[];
  vehicles?: Vehicle[];
  lang?: string;
  timeframe?: string;
  vehicleProfitRanking?: VehicleProfitRank[];
  customRange?: { startDate: Date; endDate: Date };
}

// Parent category colors - all subcategories inherit parent color
const PARENT_CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#ef4444",
  tax: "#eab308",
  fuel: "#f97316",
  marketing: "#8b5cf6",
  other: "#3b82f6",
  insurance: "#06b6d4",
  salary: "#22c55e",
  carwash: "#ec4899",
  cleaning: "#14b8a6",
  docking: "#a16207",
  licensing: "#6366f1",
  vehicle_parts: "#d97706"
};

const FALLBACK_COLORS = ["#8b5cf6", "#ef4444", "#3b82f6", "#22c55e", "#14b8a6", "#ec4899", "#a16207", "#f97316"];

const getParentCategory = (key: string): string => {
  if (key.startsWith('maintenance_')) return 'maintenance';
  if (key.startsWith('other_')) return 'other';
  if (key.startsWith('marketing_')) return 'marketing';
  if (key.startsWith('vehicle_parts_')) return 'vehicle_parts';
  if (key.startsWith('tax_')) return 'tax';
  return key;
};

const getCategoryColor = (key: string, index: number): string => {
  const parentCategory = getParentCategory(key);
  return PARENT_CATEGORY_COLORS[parentCategory] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

const CATEGORY_COLORS = ["#ef4444", "#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"];
const EXPENSE_CATEGORY_KEYS: Record<string, string> = {
  maintenance: "vehicleMaintenance",
  fuel: "fuel",
  insurance: "insurance",
  salary: "salaries",
  tax: "taxesFees",
  carwash: "carWash",
  cleaning: "cleaning",
  docking: "dockingFees",
  licensing: "licensing",
  marketing: "marketing",
  vehicle_parts: "vehicleParts",
  other: "other"
};

// Helper to get the aggregation key for a record
const getExpenseCategoryKey = (record: FinancialRecord): string => {
  const baseCategory = record.category || 'other';
  if (baseCategory === 'maintenance' && record.expense_subcategory) return `maintenance_${record.expense_subcategory}`;
  if (baseCategory === 'other' && record.expense_subcategory) return `other_${record.expense_subcategory}`;
  if (baseCategory === 'marketing' && record.expense_subcategory) return `marketing_${record.expense_subcategory}`;
  if (baseCategory === 'vehicle_parts' && record.expense_subcategory) return `vehicle_parts_${record.expense_subcategory}`;
  if (baseCategory === 'tax' && record.expense_subcategory) return `tax_${record.expense_subcategory}`;
  return baseCategory;
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
  const monthlyTotals: Record<string, number> = {};
  records.filter(r => r.type === 'expense' && getExpenseCategoryKey(r) === categoryKey).forEach(r => {
    const ym = r.date.substring(0, 7);
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

export function ExpenseBreakdown({
  financialRecords,
  allRecords,
  vehicles = [],
  lang = 'en',
  timeframe = 'month',
  vehicleProfitRanking = [],
  customRange
}: ExpenseBreakdownProps) {
  const isBoats = isBoatBusiness();
  const { t } = useTranslation(['finance', 'fleet']);
  const currencySymbol = '€';

  const getCatLabel = (cat: string): string => {
    const key = EXPENSE_CATEGORY_KEYS[cat];
    return key ? t(`finance:${key}`) : cat;
  };

  const filteredRecords = useMemo(() => {
    return financialRecords.filter((r) => r.type === 'expense');
  }, [financialRecords]);

  // Aggregate expenses by category AND subcategory
  const expensesByCategory = useMemo(() => {
    const categoryData: Record<string, {
      total: number;
      count: number;
      months: Record<number, number>;
      fuelTypes: Set<string>;
      years: Set<number>;
    }> = {};
    filteredRecords.forEach((record) => {
      const month = getMonth(new Date(record.date));
      const aggregationKey = getExpenseCategoryKey(record);

      if (!categoryData[aggregationKey]) {
        categoryData[aggregationKey] = {
          total: 0,
          count: 0,
          months: {},
          fuelTypes: new Set(),
          years: new Set()
        };
      }
      categoryData[aggregationKey].total += Number(record.amount);
      categoryData[aggregationKey].count += 1;
      categoryData[aggregationKey].months[month] = (categoryData[aggregationKey].months[month] || 0) + Number(record.amount);
      if (record.vehicle_fuel_type) categoryData[aggregationKey].fuelTypes.add(record.vehicle_fuel_type);
      if (record.vehicle_year) categoryData[aggregationKey].years.add(record.vehicle_year);
    });

    const recordsForGrowth = allRecords || financialRecords;

    return Object.entries(categoryData).map(([key, data]) => {
      let label: string;
      if (key.startsWith('maintenance_')) {
        const subcategory = key.replace('maintenance_', '');
        const maintenanceLabel = getMaintenanceTypeLabel(subcategory, lang);
        const categoryLabel = getCatLabel('maintenance');
        const displaySubcat = maintenanceLabel === subcategory ? subcategory : maintenanceLabel;
        label = `${categoryLabel} (${displaySubcat})`;
      } else if (key.startsWith('other_')) {
        const subcategory = key.replace('other_', '');
        label = subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
      } else if (key.startsWith('marketing_')) {
        const subcategory = key.replace('marketing_', '');
        const categoryLabel = getCatLabel('marketing');
        label = `${categoryLabel} (${subcategory})`;
      } else if (key.startsWith('vehicle_parts_')) {
        const subcategory = key.replace('vehicle_parts_', '');
        const categoryLabel = getCatLabel('vehicle_parts');
        label = `${categoryLabel} (${subcategory})`;
      } else if (key.startsWith('tax_')) {
        const subcategory = key.replace('tax_', '');
        const categoryLabel = getCatLabel('tax');
        label = `${categoryLabel} (${subcategory})`;
      } else {
        label = getCatLabel(key);
      }

      // Calculate growth
      let growth: number | null = null;
      let isNew = false;

      if (timeframe === 'all') {
        growth = calcAvgMonthlyGrowth(recordsForGrowth, key);
      } else {
        const prevRange = getPreviousPeriodRange(timeframe, customRange);
        const prevTotal = recordsForGrowth
          .filter(r => r.type === 'expense' && getExpenseCategoryKey(r) === key)
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
        label,
        total: data.total,
        count: data.count,
        growth,
        isNew,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang, allRecords, timeframe, customRange]);

  const grandTotalExpense = useMemo(() => expensesByCategory.reduce((s, i) => s + i.total, 0), [expensesByCategory]);

  // Prepare pie chart data with parent-based colors and <5% grouping
  const pieData = useMemo(() => {
    const total = expensesByCategory.reduce((sum, item) => sum + item.total, 0);
    if (total === 0) return [];
    
    const allSlices = expensesByCategory.map((item, index) => ({
      name: item.label,
      value: Math.round(item.total / total * 100) || 0,
      amount: item.total,
      key: item.key,
      color: getCategoryColor(item.key, index)
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
        name: t('finance:otherLessThan5'),
        value: otherValue,
        amount: otherAmount,
        key: 'other_grouped',
        color: dominantMinor.color,
        subItems: minorSlices.map(s => ({ name: s.name, value: s.value, amount: s.amount }))
      }
    ];
  }, [expensesByCategory, lang]);

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const expensesByVehicleCategory = useMemo(() => {
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

  const leastProfitableVehicles = useMemo(() => {
    return [...vehicleProfitRanking].sort((a, b) => a.avgProfitPerDay - b.avgProfitPerDay).slice(0, 5);
  }, [vehicleProfitRanking]);

  if (filteredRecords.length === 0) {
    return <Card className="p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('finance:expenseBreakdown')}
          </h2>
        </div>
        <p className="text-center text-muted-foreground py-6">
          {t('finance:noExpenses')}
        </p>
      </Card>;
  }
  return <Card className="p-4 shadow-sm">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="h-4 w-4 text-red-600" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('finance:expenseBreakdown')}
        </h2>
      </div>

      {/* Unified Layout: Compact Table Left, Category Breakdown + Pie Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Category Table (compact - 5 columns) */}
        <div className="lg:col-span-5">
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-800 hover:bg-slate-800">
                  <TableHead className="text-primary-foreground font-semibold w-[45%] px-2 py-1.5 text-xs">
                    {t('finance:category')}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold w-[30%] px-1 py-1.5 text-xs">
                    {t('finance:total')}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold w-[25%] px-1 py-1.5 text-xs">
                    {t('finance:growth')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesByCategory.map((item, index) => <TableRow key={item.key} className="hover:bg-muted/50">
                    <TableCell className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: getCategoryColor(item.key, index)
                    }} />
                        <span className="truncate text-xs">
                          {item.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600 text-xs px-1 py-1">
                      {currencySymbol}{item.total.toLocaleString('el-GR', {
                    minimumFractionDigits: 0
                  })}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1 py-1">
                      <div className="flex items-center justify-end gap-0.5">
                        {item.isNew ? (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{t('finance:new')}</span>
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
                      <span>{t('finance:vehicleCategory')}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-white font-semibold w-[30%] px-1 py-1.5 text-xs">
                    {t('finance:amount')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesByVehicleCategory.length > 0 ? expensesByVehicleCategory.slice(0, 6).map((item, index) => <TableRow key={item.key} className="hover:bg-muted/50">
                      <TableCell className="px-2 py-1">
                      <span className="truncate text-xs font-medium">
                            {item.label}
                          </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600 text-xs px-1 py-1">
                        {currencySymbol}{item.total.toLocaleString('el-GR', {
                    minimumFractionDigits: 0
                  })}
                      </TableCell>
                    </TableRow>) : <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-3">
                      {t('finance:noData')}
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Pie Chart + Costly Vehicles (5 columns) */}
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
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58} fill="#8b5cf6" dataKey="value" paddingAngle={2} label={({
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

          {/* Least Profitable Vehicles - Card UI */}
          {leastProfitableVehicles.length > 0 && <div className="border rounded-lg p-3 bg-card shadow-sm mt-2">
              <div className="mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span>{t('finance:leastProfitable')}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('finance:basedOnAvgProfit')}
                </p>
              </div>
              <div className="space-y-1">
                {leastProfitableVehicles.map((vehicle, index) => <div key={vehicle.id} className="flex items-center justify-between py-1.5 px-2.5 bg-red-50/70 rounded-md text-[11px] border border-red-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-red-700 w-4 text-center">#{index + 1}</span>
                      <span className="font-medium truncate text-xs">{vehicle.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-destructive">
                      €{vehicle.avgProfitPerDay.toFixed(2)} / day
                    </span>
                  </div>)}
              </div>
            </div>}
        </div>
      </div>
    </Card>;
}
