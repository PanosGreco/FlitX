import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Car, Ship } from "lucide-react";
import { getMonth } from "date-fns";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { getVehicleCategoryLabel } from "@/constants/vehicleTypes";
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
  type?: string; // vehicle category (suv, sedan, etc.)
  vehicle_type?: string; // top-level type (car, motorbike, atv)
}
interface VehicleProfitRank {
  id: string;
  name: string;
  avgProfitPerDay: number;
}
interface IncomeBreakdownProps {
  financialRecords: FinancialRecord[];
  vehicles?: Vehicle[];
  lang?: string;
  timeframe?: string;
  vehicleProfitRanking?: VehicleProfitRank[];
}

// Distinct income colors: Blue, Green, Orange, Purple, Red
const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ef4444"];
// Additional colors for category breakdown
const CATEGORY_COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"];
const INCOME_SOURCE_LABELS: Record<string, {
  en: string;
  el: string;
}> = {
  walk_in: {
    en: "Walk-in",
    el: "Επιτόπια"
  },
  internet: {
    en: "Internet",
    el: "Διαδίκτυο"
  },
  phone: {
    en: "Phone",
    el: "Τηλέφωνο"
  },
  collaboration: {
    en: "Collaboration",
    el: "Συνεργασία"
  },
  other: {
    en: "Other",
    el: "Άλλο"
  },
  booking: {
    en: "Booking",
    el: "Κράτηση"
  },
  sales: {
    en: "Sales",
    el: "Πωλήσεις"
  }
};
const MONTH_NAMES: Record<string, {
  en: string;
  el: string;
}> = {
  "0": {
    en: "Jan",
    el: "Ιαν"
  },
  "1": {
    en: "Feb",
    el: "Φεβ"
  },
  "2": {
    en: "Mar",
    el: "Μαρ"
  },
  "3": {
    en: "Apr",
    el: "Απρ"
  },
  "4": {
    en: "May",
    el: "Μάι"
  },
  "5": {
    en: "Jun",
    el: "Ιουν"
  },
  "6": {
    en: "Jul",
    el: "Ιουλ"
  },
  "7": {
    en: "Aug",
    el: "Αυγ"
  },
  "8": {
    en: "Sep",
    el: "Σεπ"
  },
  "9": {
    en: "Oct",
    el: "Οκτ"
  },
  "10": {
    en: "Nov",
    el: "Νοε"
  },
  "11": {
    en: "Dec",
    el: "Δεκ"
  }
};
export function IncomeBreakdown({
  financialRecords,
  vehicles = [],
  lang = 'en',
  timeframe = 'month',
  vehicleProfitRanking = []
}: IncomeBreakdownProps) {
  const isBoats = isBoatBusiness();
  // Always use EUR (€)
  const currencySymbol = '€';

  // Records are already filtered by the parent component using calendar-based timeframes
  const filteredRecords = useMemo(() => {
    return financialRecords.filter(r => r.type === 'income');
  }, [financialRecords]);

  // Helper function to normalize specifications for matching
  const normalizeSpecification = (spec: string | null | undefined): string => {
    if (!spec) return '';
    return spec.trim().toLowerCase();
  };

  // Helper function to get display specification (properly capitalized)
  const getDisplaySpecification = (spec: string): string => {
    if (!spec) return '';
    // Capitalize first letter of each word
    return spec.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  // Aggregate income by source type - with dynamic categorization for collaboration/other
  const incomeBySource = useMemo(() => {
    const sourceData: Record<string, {
      total: number;
      months: Record<number, number>;
      displayLabel: string;
    }> = {};
    filteredRecords.forEach(record => {
      const sourceType = record.income_source_type || 'other';
      const month = getMonth(new Date(record.date));

      // For collaboration and other, create dynamic categories based on specification
      let categoryKey: string;
      let displayLabel: string;
      if ((sourceType === 'collaboration' || sourceType === 'other') && record.income_source_specification) {
        const normalizedSpec = normalizeSpecification(record.income_source_specification);
        const displaySpec = getDisplaySpecification(record.income_source_specification);
        categoryKey = `${sourceType}_${normalizedSpec}`;
        const baseLabel = INCOME_SOURCE_LABELS[sourceType]?.[lang === 'el' ? 'el' : 'en'] || sourceType;
        displayLabel = `${baseLabel} (${displaySpec})`;
      } else {
        categoryKey = sourceType;
        displayLabel = INCOME_SOURCE_LABELS[sourceType]?.[lang === 'el' ? 'el' : 'en'] || sourceType;
      }
      if (!sourceData[categoryKey]) {
        sourceData[categoryKey] = {
          total: 0,
          months: {},
          displayLabel
        };
      }
      sourceData[categoryKey].total += Number(record.amount);
      sourceData[categoryKey].months[month] = (sourceData[categoryKey].months[month] || 0) + Number(record.amount);
    });

    // Calculate total for percentage calculation
    const totalIncome = Object.values(sourceData).reduce((sum, d) => sum + d.total, 0);
    return Object.entries(sourceData).map(([key, data]) => {
      const sortedMonths = Object.entries(data.months).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([month]) => MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month);

      // Format top months with percentages
      const sortedMonthsWithPercentages = Object.entries(data.months).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([month, amount]) => {
        const percentage = totalIncome > 0 ? Math.round(amount / totalIncome * 100) : 0;
        const monthName = MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month;
        return {
          monthName,
          percentage
        };
      });
      return {
        key,
        label: data.displayLabel,
        total: data.total,
        topMonths: sortedMonths.join(", "),
        topMonthsWithPercentage: sortedMonthsWithPercentages
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang]);

  // Prepare pie chart data
  const pieData = useMemo(() => {
    const total = incomeBySource.reduce((sum, item) => sum + item.total, 0);
    return incomeBySource.map(item => ({
      name: item.label,
      value: Math.round(item.total / total * 100) || 0,
      amount: item.total
    }));
  }, [incomeBySource]);

  // Create vehicle lookup map
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Aggregate income by vehicle category (case-insensitive, no duplicates, NO UNKNOWN)
  const incomeByCategory = useMemo(() => {
    const categoryData: Record<string, {
      total: number;
      displayLabel: string;
    }> = {};
    filteredRecords.forEach(record => {
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

  // Top 5 most profitable vehicles by avg profit/day
  const topVehicles = useMemo(() => {
    return [...vehicleProfitRanking]
      .sort((a, b) => b.avgProfitPerDay - a.avgProfitPerDay)
      .slice(0, 5);
  }, [vehicleProfitRanking]);
  if (filteredRecords.length === 0) {
    return <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold">
            {lang === 'el' ? 'Ανάλυση Εσόδων' : 'Income Breakdown'}
          </h2>
        </div>
        <p className="text-center text-muted-foreground py-6">
          {lang === 'el' ? 'Δεν υπάρχουν έσοδα για αυτή την περίοδο' : 'No income records for this period'}
        </p>
      </Card>;
  }
  return <Card className="p-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-semibold">
          {lang === 'el' ? 'Ανάλυση Εσόδων' : 'Income Breakdown'}
        </h2>
      </div>

      {/* Unified Layout: Compact Table Left, Category Breakdown + Pie Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Source Table (compact - 5 columns) */}
        <div className="lg:col-span-5">
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-semibold w-[45%] px-2 py-1.5 text-xs">
                    {lang === 'el' ? 'Πηγή' : 'Source'}
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
                <TableRow className="bg-emerald-600 hover:bg-emerald-600">
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
                {incomeByCategory.length > 0 ? incomeByCategory.slice(0, 6).map((item, index) => <TableRow key={item.key} className="hover:bg-muted/50">
                      <TableCell className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                    }} />
                          <span className="truncate text-xs font-medium">
                            {item.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600 text-xs px-1 py-1">
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

        {/* Right: Pie Chart + Top Vehicles (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          {/* Pie Chart - Compact */}
          {pieData.length > 0 && <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{
              top: 2,
              right: 2,
              bottom: 2,
              left: 2
            }}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} fill="#3b82f6" dataKey="value" paddingAngle={2} label={({
                value
              }) => `${value}%`} labelLine={{
                strokeWidth: 1
              }}>
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string, props: any) => [`${value}% (${currencySymbol}${props.payload.amount.toLocaleString('el-GR', {
                minimumFractionDigits: 0
              })})`, name]} contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                fontSize: '11px'
              }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>}

          {/* Most Profitable Vehicles - Card UI */}
          {topVehicles.length > 0 && <div className="border rounded-lg p-3 bg-card shadow-sm">
              <div className="mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {isBoats ? <Ship className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
                  <span>{lang === 'el' ? 'Κερδοφόρα Οχήματα' : 'Most Profitable'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {lang === 'el' ? 'Βάσει Μ.Ο. Κέρδους/Ημέρα' : 'Based on Avg Profit/Day'}
                </p>
              </div>
              <div className="space-y-1">
                {topVehicles.map((vehicle, index) => <div key={vehicle.id} className="flex items-center justify-between py-1 px-2 bg-green-50 rounded text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-green-700 w-4 text-center">#{index + 1}</span>
                      <span className="font-medium truncate">{vehicle.name}</span>
                    </div>
                    <span className="font-semibold text-green-600 flex-shrink-0 ml-2 whitespace-nowrap">
                      €{vehicle.avgProfitPerDay.toFixed(2)} / day
                    </span>
                  </div>)}
              </div>
            </div>}
        </div>
      </div>
    </Card>;
}