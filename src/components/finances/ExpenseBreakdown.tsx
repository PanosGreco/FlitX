import { useMemo } from "react";
import { Card } from "@/components/ui/card";
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
import { TrendingDown, Car, Ship } from "lucide-react";
import { getMonth } from "date-fns";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { getMaintenanceTypeLabel } from "@/constants/maintenanceTypes";

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
}

const FUEL_TYPE_LABELS: Record<string, { en: string; el: string }> = {
  petrol: { en: "Petrol", el: "Βενζίνη" },
  diesel: { en: "Diesel", el: "Diesel" },
  electric: { en: "Electric", el: "Ηλεκτρικό" },
  hybrid: { en: "Hybrid", el: "Υβριδικό" },
};

const getFuelTypeLabel = (fuelType: string | null | undefined, lang: string) => {
  if (!fuelType) return '–';
  return FUEL_TYPE_LABELS[fuelType]?.[lang === 'el' ? 'el' : 'en'] || fuelType;
};

interface ExpenseBreakdownProps {
  financialRecords: FinancialRecord[];
  vehicles?: Vehicle[];
  lang?: string;
  timeframe?: string;
}

// Distinct expense colors: Purple, Red, Blue, Green, Teal, Pink, Brown, Orange
const COLORS = ["#8b5cf6", "#ef4444", "#3b82f6", "#22c55e", "#14b8a6", "#ec4899", "#a16207", "#f97316"];

const EXPENSE_CATEGORY_LABELS: Record<string, { en: string; el: string }> = {
  maintenance: { en: "Vehicle Maintenance", el: "Συντήρηση Οχήματος" },
  fuel: { en: "Fuel", el: "Καύσιμα" },
  insurance: { en: "Insurance", el: "Ασφάλεια" },
  salary: { en: "Salaries", el: "Μισθοί" },
  tax: { en: "Taxes", el: "Φόροι" },
  carwash: { en: "Car Wash", el: "Πλύσιμο" },
  cleaning: { en: "Cleaning", el: "Καθαρισμός" },
  docking: { en: "Docking Fees", el: "Τέλη Ελλιμενισμού" },
  licensing: { en: "Licensing", el: "Αδειοδότηση" },
  other: { en: "Other", el: "Άλλο" },
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

export function ExpenseBreakdown({ financialRecords, vehicles = [], lang = 'en', timeframe = 'month' }: ExpenseBreakdownProps) {
  const isBoats = isBoatBusiness();
  const currencySymbol = lang === 'el' ? '€' : '$';

  // Records are already filtered by the parent component using calendar-based timeframes
  const filteredRecords = useMemo(() => {
    return financialRecords.filter(r => r.type === 'expense');
  }, [financialRecords]);

  // Aggregate expenses by category AND subcategory for maintenance
  const expensesByCategory = useMemo(() => {
    const categoryData: Record<string, { 
      total: number; 
      months: Record<number, number>; 
      fuelTypes: Set<string>;
      years: Set<number>;
    }> = {};

    filteredRecords.forEach(record => {
      const baseCategory = record.category || 'other';
      const month = getMonth(new Date(record.date));
      
      // For maintenance, aggregate by subcategory (e.g., "maintenance_oil_change")
      let aggregationKey = baseCategory;
      if (baseCategory === 'maintenance' && record.expense_subcategory) {
        aggregationKey = `maintenance_${record.expense_subcategory}`;
      } else if (baseCategory === 'other' && record.expense_subcategory) {
        aggregationKey = `other_${record.expense_subcategory}`;
      }
      
      if (!categoryData[aggregationKey]) {
        categoryData[aggregationKey] = { total: 0, months: {}, fuelTypes: new Set(), years: new Set() };
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

    return Object.entries(categoryData)
      .map(([key, data]) => {
        const sortedMonths = Object.entries(data.months)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([month]) => MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month);

        // Calculate total for percentage calculation
        const totalExpenses = Object.values(categoryData).reduce((sum, d) => sum + d.total, 0);

        // Determine label based on key
        let label: string;
        if (key.startsWith('maintenance_')) {
          const subcategory = key.replace('maintenance_', '');
          const maintenanceLabel = getMaintenanceTypeLabel(subcategory, lang);
          const categoryLabel = EXPENSE_CATEGORY_LABELS['maintenance']?.[lang === 'el' ? 'el' : 'en'] || 'Vehicle Maintenance';
          label = `${categoryLabel} (${maintenanceLabel})`;
        } else if (key.startsWith('other_')) {
          const subcategory = key.replace('other_', '');
          const categoryLabel = EXPENSE_CATEGORY_LABELS['other']?.[lang === 'el' ? 'el' : 'en'] || 'Other';
          label = `${categoryLabel} (${subcategory})`;
        } else {
          label = EXPENSE_CATEGORY_LABELS[key]?.[lang === 'el' ? 'el' : 'en'] || key;
        }

        // Format top months with percentages
        const sortedMonthsWithPercentages = Object.entries(data.months)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([month, amount]) => {
            const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
            const monthName = MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month;
            return { monthName, percentage };
          });

        return {
          key,
          label,
          total: data.total,
          topMonths: sortedMonths.join(", "),
          topMonthsWithPercentage: sortedMonthsWithPercentages,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang]);

  // Prepare pie chart data
  const pieData = useMemo(() => {
    const total = expensesByCategory.reduce((sum, item) => sum + item.total, 0);
    return expensesByCategory.map(item => ({
      name: item.label,
      value: Math.round((item.total / total) * 100) || 0,
      amount: item.total,
    }));
  }, [expensesByCategory]);

  // Most costly vehicles
  const costlyVehicles = useMemo(() => {
    const vehicleExpenses: Record<string, number> = {};

    filteredRecords.forEach(record => {
      if (record.vehicle_id) {
        vehicleExpenses[record.vehicle_id] = (vehicleExpenses[record.vehicle_id] || 0) + Number(record.amount);
      }
    });

    return Object.entries(vehicleExpenses)
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
          <TrendingDown className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold">
            {lang === 'el' ? 'Ανάλυση Εξόδων' : 'Expense Breakdown'}
          </h2>
        </div>
        <p className="text-center text-muted-foreground py-6">
          {lang === 'el' ? 'Δεν υπάρχουν έξοδα για αυτή την περίοδο' : 'No expense records for this period'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold">
          {lang === 'el' ? 'Ανάλυση Εξόδων' : 'Expense Breakdown'}
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
                    {lang === 'el' ? 'Κατηγορία' : 'Category'}
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
                {expensesByCategory.map((item, index) => (
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
                    <TableCell className="text-right font-medium text-red-600 text-xs px-2 py-1.5">
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

        {/* Right: Pie Chart + Costly Vehicles stacked (takes 2 columns) */}
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
                    fill="#8b5cf6"
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

          {/* Most Costly Vehicles - Renamed to "Most Costful" */}
          {costlyVehicles.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {isBoats ? <Ship className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                <span>{lang === 'el' ? 'Πιο Δαπανηρά' : 'Most Costful'}</span>
              </div>
              <div className="space-y-1">
                {costlyVehicles.slice(0, 3).map((vehicle, index) => (
                  <div key={vehicle.id} className="flex items-center justify-between py-1 px-2 bg-red-50 rounded text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-red-700 text-[10px]">#{index + 1}</span>
                      <span className="font-medium truncate text-[11px]">{vehicle.name}</span>
                    </div>
                    <span className="font-semibold text-red-600 text-[11px]">
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
