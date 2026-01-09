import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, Car, Ship } from "lucide-react";
import { getMonth } from "date-fns";
import { isBoatBusiness } from "@/utils/businessTypeUtils";

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
}

interface IncomeBreakdownProps {
  financialRecords: FinancialRecord[];
  vehicles?: Vehicle[];
  lang?: string;
  timeframe?: string;
}

// Distinct income colors: Blue, Green, Orange, Purple, Red
const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ef4444"];

const INCOME_SOURCE_LABELS: Record<string, { en: string; el: string }> = {
  walk_in: { en: "Walk-in", el: "Επιτόπια" },
  internet: { en: "Internet", el: "Διαδίκτυο" },
  phone: { en: "Phone", el: "Τηλέφωνο" },
  collaboration: { en: "Collaboration", el: "Συνεργασία" },
  other: { en: "Other", el: "Άλλο" },
  booking: { en: "Booking", el: "Κράτηση" },
  sales: { en: "Sales", el: "Πωλήσεις" },
};

const MONTH_NAMES: Record<string, { en: string; el: string }> = {
  "0": { en: "Jan", el: "Ιαν" },
  "1": { en: "Feb", el: "Φεβ" },
  "2": { en: "Mar", el: "Μαρ" },
  "3": { en: "Apr", el: "Απρ" },
  "4": { en: "May", el: "Μάι" },
  "5": { en: "Jun", el: "Ιουν" },
  "6": { en: "Jul", el: "Ιουλ" },
  "7": { en: "Aug", el: "Αυγ" },
  "8": { en: "Sep", el: "Σεπ" },
  "9": { en: "Oct", el: "Οκτ" },
  "10": { en: "Nov", el: "Νοε" },
  "11": { en: "Dec", el: "Δεκ" },
};

export function IncomeBreakdown({ financialRecords, vehicles = [], lang = 'en', timeframe = 'month' }: IncomeBreakdownProps) {
  const isBoats = isBoatBusiness();
  const currencySymbol = lang === 'el' ? '€' : '$';

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
    return spec.trim().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Aggregate income by source type - with dynamic categorization for collaboration/other
  const incomeBySource = useMemo(() => {
    const sourceData: Record<string, { total: number; months: Record<number, number>; displayLabel: string }> = {};

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
        sourceData[categoryKey] = { total: 0, months: {}, displayLabel };
      }
      
      sourceData[categoryKey].total += Number(record.amount);
      sourceData[categoryKey].months[month] = (sourceData[categoryKey].months[month] || 0) + Number(record.amount);
    });

    // Calculate total for percentage calculation
    const totalIncome = Object.values(sourceData).reduce((sum, d) => sum + d.total, 0);

    return Object.entries(sourceData)
      .map(([key, data]) => {
        const sortedMonths = Object.entries(data.months)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([month]) => MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month);

        // Format top months with percentages
        const sortedMonthsWithPercentages = Object.entries(data.months)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([month, amount]) => {
            const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
            const monthName = MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month;
            return { monthName, percentage };
          });

        return {
          key,
          label: data.displayLabel,
          total: data.total,
          topMonths: sortedMonths.join(", "),
          topMonthsWithPercentage: sortedMonthsWithPercentages,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang]);

  // Prepare pie chart data
  const pieData = useMemo(() => {
    const total = incomeBySource.reduce((sum, item) => sum + item.total, 0);
    return incomeBySource.map(item => ({
      name: item.label,
      value: Math.round((item.total / total) * 100) || 0,
      amount: item.total,
    }));
  }, [incomeBySource]);

  // Top performing vehicles
  const topVehicles = useMemo(() => {
    const vehicleIncome: Record<string, number> = {};

    filteredRecords.forEach(record => {
      if (record.vehicle_id) {
        vehicleIncome[record.vehicle_id] = (vehicleIncome[record.vehicle_id] || 0) + Number(record.amount);
      }
    });

    return Object.entries(vehicleIncome)
      .map(([vehicleId, total]) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        return {
          id: vehicleId,
          name: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle',
          total,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredRecords, vehicles]);

  if (filteredRecords.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold">
            {lang === 'el' ? 'Ανάλυση Εσόδων' : 'Income Breakdown'}
          </h2>
        </div>
        <p className="text-center text-muted-foreground py-6">
          {lang === 'el' ? 'Δεν υπάρχουν έσοδα για αυτή την περίοδο' : 'No income records for this period'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-semibold">
          {lang === 'el' ? 'Ανάλυση Εσόδων' : 'Income Breakdown'}
        </h2>
      </div>

      {/* Unified Layout: Table Left, Pie + Vehicles Right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Left: Table (takes 3 columns) - Compact layout */}
        <div className="lg:col-span-3">
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-semibold w-[45%] px-2">
                    {lang === 'el' ? 'Πηγή' : 'Source'}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold w-[25%] px-2">
                    {lang === 'el' ? 'Σύνολο' : 'Total'}
                  </TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold hidden sm:table-cell w-[30%] px-2">
                    {lang === 'el' ? 'Κορυφαίοι Μήνες' : 'Top Months'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeBySource.map((item, index) => (
                  <TableRow key={item.key} className="hover:bg-muted/50">
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate text-xs">
                          {item.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600 text-xs px-2 py-1.5">
                      {currencySymbol}{item.total.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs hidden sm:table-cell px-2 py-1.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        {item.topMonthsWithPercentage?.slice(0, 3).map((m, i) => (
                          <span key={i} className="whitespace-nowrap">
                            {m.monthName}<span className="text-muted-foreground/60 ml-0.5 text-[10px]">{m.percentage}%</span>
                            {i < Math.min(item.topMonthsWithPercentage.length, 3) - 1 && ','}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Pie Chart + Top Vehicles stacked (takes 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Pie Chart - No legend, hover tooltip only */}
          {pieData.length > 0 && (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    fill="#3b82f6"
                    dataKey="value"
                    paddingAngle={2}
                    label={({ value }) => `${value}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${currencySymbol}${props.payload.amount.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2 })})`,
                      name
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: '11px'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Most Profitable Vehicles - Renamed */}
          {topVehicles.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {isBoats ? <Ship className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                <span>{lang === 'el' ? 'Πιο Κερδοφόρα' : 'Most Profitable'}</span>
              </div>
              <div className="space-y-1">
                {topVehicles.slice(0, 3).map((vehicle, index) => (
                  <div key={vehicle.id} className="flex items-center justify-between py-1 px-2 bg-green-50 rounded text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-green-700 text-[10px]">#{index + 1}</span>
                      <span className="font-medium truncate text-[11px]">{vehicle.name}</span>
                    </div>
                    <span className="font-semibold text-green-600 text-[11px]">
                      {currencySymbol}{vehicle.total.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
