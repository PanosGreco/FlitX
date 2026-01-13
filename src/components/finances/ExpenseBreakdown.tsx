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
import { getVehicleCategoryLabel } from "@/constants/vehicleTypes";

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
// Additional colors for category breakdown
const CATEGORY_COLORS = ["#ef4444", "#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"];

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
  // Always use EUR (€)
  const currencySymbol = '€';

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

  // Create vehicle lookup map
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Aggregate expenses by vehicle category (case-insensitive, no duplicates, NO UNKNOWN)
  const expensesByVehicleCategory = useMemo(() => {
    const categoryData: Record<string, { total: number; displayLabel: string }> = {};

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
        categoryData[normalizedKey] = { total: 0, displayLabel };
      }
      
      categoryData[normalizedKey].total += Number(record.amount);
    });

    return Object.entries(categoryData)
      .map(([key, data]) => ({
        key,
        label: data.displayLabel,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords, vehicleMap, lang]);

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
                {expensesByCategory.map((item, index) => (
                  <TableRow key={item.key} className="hover:bg-muted/50">
                    <TableCell className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate text-xs">
                          {item.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600 text-xs px-1 py-1">
                      {currencySymbol}{item.total.toLocaleString('el-GR', { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-[11px] hidden sm:table-cell px-1 py-1">
                      <div className="flex flex-wrap justify-end gap-0.5">
                        {item.topMonthsWithPercentage?.slice(0, 2).map((m, i) => (
                          <span key={i} className="whitespace-nowrap">
                            {m.monthName}<span className="text-muted-foreground/60 ml-0.5">{m.percentage}%</span>
                            {i < Math.min(item.topMonthsWithPercentage.length, 2) - 1 && ','}
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
                {expensesByVehicleCategory.length > 0 ? (
                  expensesByVehicleCategory.slice(0, 6).map((item, index) => (
                    <TableRow key={item.key} className="hover:bg-muted/50">
                      <TableCell className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                          />
                          <span className="truncate text-xs font-medium">
                            {item.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600 text-xs px-1 py-1">
                        {currencySymbol}{item.total.toLocaleString('el-GR', { minimumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-3">
                      {lang === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Pie Chart + Costly Vehicles (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
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
                      `${value}% (${currencySymbol}${props.payload.amount.toLocaleString('el-GR', { minimumFractionDigits: 0 })})`,
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

          {/* Most Costly Vehicles - Compact */}
          {costlyVehicles.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                {isBoats ? <Ship className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                <span>{lang === 'el' ? 'Δαπανηρά' : 'Top Cost'}</span>
              </div>
              <div className="space-y-0.5">
                {costlyVehicles.slice(0, 3).map((vehicle, index) => (
                  <div key={vehicle.id} className="flex items-center justify-between py-0.5 px-1.5 bg-red-50 rounded text-[11px]">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-bold text-red-700">#{index + 1}</span>
                      <span className="font-medium truncate">{vehicle.name}</span>
                    </div>
                    <span className="font-semibold text-red-600 flex-shrink-0 ml-1">
                      {currencySymbol}{vehicle.total.toLocaleString('el-GR', { minimumFractionDigits: 0 })}
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
