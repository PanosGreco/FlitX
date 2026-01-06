import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingDown, Car, Ship } from "lucide-react";
import { getMonth } from "date-fns";
import { isBoatBusiness } from "@/utils/businessTypeUtils";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  expense_subcategory?: string | null;
  vehicle_id?: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
}

interface ExpenseBreakdownProps {
  financialRecords: FinancialRecord[];
  vehicles?: Vehicle[];
  lang?: string;
  timeframe?: string;
}

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

// Get date range based on timeframe
const getDateRange = (timeframe: string) => {
  const now = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
  }
  
  return { startDate, endDate: now };
};

const filterByTimeframe = (records: FinancialRecord[], timeframe: string) => {
  const { startDate } = getDateRange(timeframe);
  return records.filter(record => new Date(record.date) >= startDate);
};

export function ExpenseBreakdown({ financialRecords, vehicles = [], lang = 'en', timeframe = 'month' }: ExpenseBreakdownProps) {
  const isBoats = isBoatBusiness();
  const currencySymbol = lang === 'el' ? '€' : '$';

  const filteredRecords = useMemo(() => {
    const filtered = filterByTimeframe(financialRecords, timeframe);
    return filtered.filter(r => r.type === 'expense');
  }, [financialRecords, timeframe]);

  // Aggregate expenses by category
  const expensesByCategory = useMemo(() => {
    const categoryData: Record<string, { total: number; months: Record<number, number>; subcategory?: string }> = {};

    filteredRecords.forEach(record => {
      const category = record.category || 'other';
      const month = getMonth(new Date(record.date));
      
      if (!categoryData[category]) {
        categoryData[category] = { total: 0, months: {} };
      }
      
      categoryData[category].total += Number(record.amount);
      categoryData[category].months[month] = (categoryData[category].months[month] || 0) + Number(record.amount);
      
      // Store subcategory for maintenance/other
      if ((category === 'maintenance' || category === 'other') && record.expense_subcategory) {
        categoryData[category].subcategory = record.expense_subcategory;
      }
    });

    return Object.entries(categoryData)
      .map(([category, data]) => {
        // Find top 3 months
        const sortedMonths = Object.entries(data.months)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([month]) => MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month);

        return {
          category,
          label: EXPENSE_CATEGORY_LABELS[category]?.[lang === 'el' ? 'el' : 'en'] || category,
          total: data.total,
          topMonths: sortedMonths.join(", "),
          subcategory: data.subcategory,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang]);

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-red-600" />
            {lang === 'el' ? 'Ανάλυση Εξόδων' : 'Expense Breakdown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {lang === 'el' ? 'Δεν υπάρχουν έξοδα για αυτή την περίοδο' : 'No expense records for this period'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expense Breakdown Header */}
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <TrendingDown className="h-5 w-5 text-red-600" />
        {lang === 'el' ? 'Ανάλυση Εξόδων' : 'Expense Breakdown'}
      </h2>

      {/* Expense Category Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {lang === 'el' ? 'Έξοδα ανά Κατηγορία' : 'Expenses by Category'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === 'el' ? 'Κατηγορία' : 'Category'}</TableHead>
                <TableHead className="text-right">{lang === 'el' ? 'Σύνολο' : 'Total'}</TableHead>
                <TableHead className="text-right hidden sm:table-cell">{lang === 'el' ? 'Κορυφαίοι Μήνες' : 'Top Months'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesByCategory.map((item) => (
                <TableRow key={item.category}>
                  <TableCell>
                    <span className="truncate">
                      {item.subcategory ? `${item.label} (${item.subcategory})` : item.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {currencySymbol}{item.total.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                    {item.topMonths || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Most Costly Vehicles */}
      {costlyVehicles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {isBoats ? <Ship className="h-4 w-4" /> : <Car className="h-4 w-4" />}
              {lang === 'el' ? 'Οχήματα με Υψηλότερα Έξοδα' : 'Most Costly Vehicles'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costlyVehicles.map((vehicle, index) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-red-700">#{index + 1}</span>
                    <span className="font-medium">{vehicle.name}</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    {currencySymbol}{vehicle.total.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
