import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown, Car, Ship } from "lucide-react";
import { getMonth, format } from "date-fns";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { getMaintenanceTypeLabel } from "@/constants/maintenanceTypes";
import { getVehicleCategoryLabel } from "@/constants/vehicleTypes";
import { useTranslation } from "react-i18next";
import { getDateFnsLocale, getBcp47Locale } from "@/utils/localeMap";
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
  type?: string; // vehicle category (suv, sedan, etc.)
  vehicle_type?: string; // top-level type (car, motorbike, atv)
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
  vehicles?: Vehicle[];
  lang?: string;
  timeframe?: string;
  vehicleProfitRanking?: VehicleProfitRank[];
}

// Parent category colors - all subcategories inherit parent color
const PARENT_CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#ef4444", // Red
  tax: "#eab308", // Yellow
  fuel: "#f97316", // Orange
  marketing: "#8b5cf6", // Purple
  other: "#3b82f6", // Blue
  insurance: "#06b6d4", // Cyan
  salary: "#22c55e", // Green
  carwash: "#ec4899", // Pink
  cleaning: "#14b8a6", // Teal
  docking: "#a16207", // Brown
  licensing: "#6366f1", // Indigo
  vehicle_parts: "#d97706" // Amber
};

// Fallback colors for unknown categories
const FALLBACK_COLORS = ["#8b5cf6", "#ef4444", "#3b82f6", "#22c55e", "#14b8a6", "#ec4899", "#a16207", "#f97316"];

// Helper function to get parent category from key
const getParentCategory = (key: string): string => {
  if (key.startsWith('maintenance_')) return 'maintenance';
  if (key.startsWith('other_')) return 'other';
  if (key.startsWith('marketing_')) return 'marketing';
  if (key.startsWith('vehicle_parts_')) return 'vehicle_parts';
  if (key.startsWith('tax_')) return 'tax';
  return key;
};

// Get color for a category (subcategories inherit parent color)
const getCategoryColor = (key: string, index: number): string => {
  const parentCategory = getParentCategory(key);
  return PARENT_CATEGORY_COLORS[parentCategory] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

// Additional colors for vehicle category breakdown
const CATEGORY_COLORS = ["#ef4444", "#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"];
// Maps expense category keys to finance translation keys
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

// Helper to get abbreviated month name using date-fns locale
const getMonthName = (monthIndex: string, lang: string): string => {
  const date = new Date(2024, parseInt(monthIndex), 1);
  return format(date, 'MMM', { locale: getDateFnsLocale(lang) });
};
export function ExpenseBreakdown({
  financialRecords,
  vehicles = [],
  lang = 'en',
  timeframe = 'month',
  vehicleProfitRanking = []
}: ExpenseBreakdownProps) {
  const isBoats = isBoatBusiness();
  // Always use EUR (€)
  const currencySymbol = '€';

  // Records are already filtered by the parent component using calendar-based timeframes
  const filteredRecords = useMemo(() => {
    return financialRecords.filter((r) => r.type === 'expense');
  }, [financialRecords]);

  // Aggregate expenses by category AND subcategory for maintenance
  const expensesByCategory = useMemo(() => {
    const categoryData: Record<string, {
      total: number;
      months: Record<number, number>;
      fuelTypes: Set<string>;
      years: Set<number>;
    }> = {};
    filteredRecords.forEach((record) => {
      const baseCategory = record.category || 'other';
      const month = getMonth(new Date(record.date));

      // For maintenance, other, marketing, and vehicle_parts, aggregate by subcategory
      let aggregationKey = baseCategory;
      if (baseCategory === 'maintenance' && record.expense_subcategory) {
        aggregationKey = `maintenance_${record.expense_subcategory}`;
      } else if (baseCategory === 'other' && record.expense_subcategory) {
        aggregationKey = `other_${record.expense_subcategory}`;
      } else if (baseCategory === 'marketing' && record.expense_subcategory) {
        aggregationKey = `marketing_${record.expense_subcategory}`;
      } else if (baseCategory === 'vehicle_parts' && record.expense_subcategory) {
        aggregationKey = `vehicle_parts_${record.expense_subcategory}`;
      } else if (baseCategory === 'tax' && record.expense_subcategory) {
        aggregationKey = `tax_${record.expense_subcategory}`;
      }
      if (!categoryData[aggregationKey]) {
        categoryData[aggregationKey] = {
          total: 0,
          months: {},
          fuelTypes: new Set(),
          years: new Set()
        };
      }
      categoryData[aggregationKey].total += Number(record.amount);
      categoryData[aggregationKey].months[month] = (categoryData[aggregationKey].months[month] || 0) + Number(record.amount);

      // Track fuel types and years from vehicle-linked expenses
      if (record.vehicle_fuel_type) {
        categoryData[aggregationKey].fuelTypes.add(record.vehicle_fuel_type);
      }
      if (record.vehicle_year) {
        categoryData[aggregationKey].years.add(record.vehicle_year);
      }
    });
    return Object.entries(categoryData).map(([key, data]) => {
      const sortedMonths = Object.entries(data.months).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([month]) => MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month);

      // Calculate total for percentage calculation
      const totalExpenses = Object.values(categoryData).reduce((sum, d) => sum + d.total, 0);

      // Determine label based on key
      let label: string;
      if (key.startsWith('maintenance_')) {
        const subcategory = key.replace('maintenance_', '');
        const maintenanceLabel = getMaintenanceTypeLabel(subcategory, lang);
        const categoryLabel = EXPENSE_CATEGORY_LABELS['maintenance']?.[lang === 'el' ? 'el' : 'en'] || 'Vehicle Maintenance';
        // If label equals the key, it's a custom type - show the raw name
        const displaySubcat = maintenanceLabel === subcategory ? subcategory : maintenanceLabel;
        label = `${categoryLabel} (${displaySubcat})`;
      } else if (key.startsWith('other_')) {
        const subcategory = key.replace('other_', '');
        // Display as standalone category name (autonomous)
        label = subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
      } else if (key.startsWith('marketing_')) {
        const subcategory = key.replace('marketing_', '');
        const categoryLabel = EXPENSE_CATEGORY_LABELS['marketing']?.[lang === 'el' ? 'el' : 'en'] || 'Marketing';
        label = `${categoryLabel} (${subcategory})`;
      } else if (key.startsWith('vehicle_parts_')) {
        const subcategory = key.replace('vehicle_parts_', '');
        const categoryLabel = EXPENSE_CATEGORY_LABELS['vehicle_parts']?.[lang === 'el' ? 'el' : 'en'] || 'Vehicle Parts';
        label = `${categoryLabel} (${subcategory})`;
      } else if (key.startsWith('tax_')) {
        const subcategory = key.replace('tax_', '');
        const categoryLabel = EXPENSE_CATEGORY_LABELS['tax']?.[lang === 'el' ? 'el' : 'en'] || 'Taxes';
        label = `${categoryLabel} (${subcategory})`;
      } else {
        label = EXPENSE_CATEGORY_LABELS[key]?.[lang === 'el' ? 'el' : 'en'] || key;
      }

      // Format top months with percentages
      const sortedMonthsWithPercentages = Object.entries(data.months).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([month, amount]) => {
        const percentage = totalExpenses > 0 ? Math.round(amount / totalExpenses * 100) : 0;
        const monthName = MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month;
        return {
          monthName,
          percentage
        };
      });
      return {
        key,
        label,
        total: data.total,
        topMonths: sortedMonths.join(", "),
        topMonthsWithPercentage: sortedMonthsWithPercentages
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang]);

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
        name: lang === 'el' ? 'Άλλο (<5%)' : 'Other (<5%)',
        value: otherValue,
        amount: otherAmount,
        key: 'other_grouped',
        color: dominantMinor.color,
        subItems: minorSlices.map(s => ({ name: s.name, value: s.value, amount: s.amount }))
      }
    ];
  }, [expensesByCategory, lang]);

  // Create vehicle lookup map
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Aggregate expenses by vehicle category (case-insensitive, no duplicates, NO UNKNOWN)
  const expensesByVehicleCategory = useMemo(() => {
    const categoryData: Record<string, {
      total: number;
      displayLabel: string;
    }> = {};
    filteredRecords.forEach((record) => {
      if (!record.vehicle_id) return;
      const vehicle = vehicleMap.get(record.vehicle_id);
      if (!vehicle) return;

      // Get the vehicle category (type field) - SKIP if empty/unknown
      const rawCategory = vehicle.type;
      if (!rawCategory || rawCategory.trim() === '' || rawCategory.toLowerCase() === 'unknown') {
        return; // Skip records with no valid category
      }
      const normalizedKey = rawCategory.trim().toLowerCase();
      if (!categoryData[normalizedKey]) {
        // Get display label using the utility function
        const displayLabel = getVehicleCategoryLabel(rawCategory, lang);
        categoryData[normalizedKey] = {
          total: 0,
          displayLabel
        };
      }
      categoryData[normalizedKey].total += Number(record.amount);
    });
    return Object.entries(categoryData).map(([key, data]) => ({
      key,
      label: data.displayLabel,
      total: data.total
    })).sort((a, b) => b.total - a.total);
  }, [filteredRecords, vehicleMap, lang]);

  // Top 5 least profitable vehicles by avg profit/day
  const leastProfitableVehicles = useMemo(() => {
    return [...vehicleProfitRanking].
    sort((a, b) => a.avgProfitPerDay - b.avgProfitPerDay).
    slice(0, 5);
  }, [vehicleProfitRanking]);
  if (filteredRecords.length === 0) {
    return <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold">
            {lang === 'el' ? 'Ανάλυση Εξόδων' : 'Expense Breakdown'}
          </h2>
        </div>
        <p className="text-center text-muted-foreground py-6">
          {lang === 'el' ? 'Δεν υπάρχουν έξοδα για αυτή την περίοδο' : 'No expense records for this period'}
        </p>
      </Card>;
  }
  return <Card className="p-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold">
          {lang === 'el' ? 'Ανάλυση Εξόδων' : 'Expense Breakdown'}
        </h2>
      </div>

      {/* Unified Layout: Compact Table Left, Category Breakdown + Pie Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Category Table (compact - 5 columns) */}
        <div className="lg:col-span-5">
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-semibold w-[45%] px-2 py-1.5 text-xs">
                    {lang === 'el' ? 'Κατηγορία' : 'Category'}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold w-[25%] px-1 py-1.5 text-xs">
                    {lang === 'el' ? 'Σύνολο' : 'Total'}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold hidden sm:table-cell w-[30%] px-1 py-1.5 text-xs">
                    {lang === 'el' ? 'Top Μήνες' : 'Top Mo.'}
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
                    <TableCell className="text-right text-muted-foreground text-[11px] hidden sm:table-cell px-1 py-1">
                      <div className="flex flex-wrap justify-end gap-0.5">
                        {item.topMonthsWithPercentage?.slice(0, 2).map((m, i) => <span key={i} className="whitespace-nowrap">
                            {m.monthName}<span className="text-muted-foreground/60 ml-0.5">{m.percentage}%</span>
                            {i < Math.min(item.topMonthsWithPercentage.length, 2) - 1 && ','}
                          </span>)}
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
                <TableRow className="bg-red-600 hover:bg-red-600">
                  <TableHead className="text-white font-semibold w-[70%] px-2 py-1.5 text-xs">
                    <div className="flex flex-col leading-tight">
                      <span>{lang === 'el' ? 'Κατηγορία' : 'Vehicle'}</span>
                      <span>{lang === 'el' ? 'Οχήματος' : 'Category'}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-white font-semibold w-[30%] px-1 py-1.5 text-xs">
                    {lang === 'el' ? 'Ποσό' : 'Amount'}
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
                      {lang === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data'}
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
          {leastProfitableVehicles.length > 0 && <div className="border rounded-lg p-3 bg-card shadow-sm mx-[70px] mt-2">
              <div className="mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span>{lang === 'el' ? 'Λιγότερο Κερδοφόρα' : 'Least Profitable'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {lang === 'el' ? 'Βάσει Μ.Ο. Κέρδους/Ημέρα' : 'Based on Avg Profit/Day'}
                </p>
              </div>
              <div className="space-y-1">
                {leastProfitableVehicles.map((vehicle, index) => <div key={vehicle.id} className="flex items-center justify-between py-1 px-2 bg-red-50 rounded text-[11px]">
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