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
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, Car, Ship } from "lucide-react";
import { format, getMonth } from "date-fns";
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

const COLORS = ["#22c55e", "#10b981", "#059669", "#047857", "#065f46", "#064e3b", "#4ade80", "#34d399"];

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

export function IncomeBreakdown({ financialRecords, vehicles = [], lang = 'en', timeframe = 'month' }: IncomeBreakdownProps) {
  const isBoats = isBoatBusiness();
  const currencySymbol = lang === 'el' ? '€' : '$';

  const filteredRecords = useMemo(() => {
    const filtered = filterByTimeframe(financialRecords, timeframe);
    return filtered.filter(r => r.type === 'income');
  }, [financialRecords, timeframe]);

  // Aggregate income by source type
  const incomeBySource = useMemo(() => {
    const sourceData: Record<string, { total: number; months: Record<number, number>; specification?: string }> = {};

    filteredRecords.forEach(record => {
      const sourceType = record.income_source_type || 'other';
      const month = getMonth(new Date(record.date));
      
      if (!sourceData[sourceType]) {
        sourceData[sourceType] = { total: 0, months: {} };
      }
      
      sourceData[sourceType].total += Number(record.amount);
      sourceData[sourceType].months[month] = (sourceData[sourceType].months[month] || 0) + Number(record.amount);
      
      // Store specification for collaboration/other
      if ((sourceType === 'collaboration' || sourceType === 'other') && record.income_source_specification) {
        sourceData[sourceType].specification = record.income_source_specification;
      }
    });

    return Object.entries(sourceData)
      .map(([source, data]) => {
        // Find top 3 months
        const sortedMonths = Object.entries(data.months)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([month]) => MONTH_NAMES[month]?.[lang === 'el' ? 'el' : 'en'] || month);

        return {
          source,
          label: INCOME_SOURCE_LABELS[source]?.[lang === 'el' ? 'el' : 'en'] || source,
          total: data.total,
          topMonths: sortedMonths.join(", "),
          specification: data.specification,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords, lang]);

  // Prepare pie chart data
  const pieData = useMemo(() => {
    const total = incomeBySource.reduce((sum, item) => sum + item.total, 0);
    return incomeBySource.map(item => ({
      name: item.specification ? `${item.label} (${item.specification})` : item.label,
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-green-600" />
            {lang === 'el' ? 'Ανάλυση Εσόδων' : 'Income Breakdown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {lang === 'el' ? 'Δεν υπάρχουν έσοδα για αυτή την περίοδο' : 'No income records for this period'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Income Breakdown Header */}
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-600" />
        {lang === 'el' ? 'Ανάλυση Εσόδων' : 'Income Breakdown'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Source Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {lang === 'el' ? 'Έσοδα ανά Πηγή' : 'Income by Source'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === 'el' ? 'Πηγή' : 'Source'}</TableHead>
                  <TableHead className="text-right">{lang === 'el' ? 'Σύνολο' : 'Total'}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">{lang === 'el' ? 'Κορυφαίοι Μήνες' : 'Top Months'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeBySource.map((item, index) => (
                  <TableRow key={item.source}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate">
                          {item.specification ? `${item.label} (${item.specification})` : item.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
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

        {/* Income Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {lang === 'el' ? 'Κατανομή Εσόδων' : 'Income Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      fill="#22c55e"
                      dataKey="value"
                      paddingAngle={2}
                      label={({ value }) => `${value}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {pieData.map((_, index) => (
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
                    />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value}% (${currencySymbol}${props.payload.amount.toLocaleString(lang === 'el' ? 'el-GR' : undefined, { minimumFractionDigits: 2 })})`,
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
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {lang === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Vehicles */}
      {topVehicles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {isBoats ? <Ship className="h-4 w-4" /> : <Car className="h-4 w-4" />}
              {lang === 'el' ? 'Κορυφαία Κερδοφόρα Οχήματα' : 'Most Profitable Vehicles'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVehicles.map((vehicle, index) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-700">#{index + 1}</span>
                    <span className="font-medium">{vehicle.name}</span>
                  </div>
                  <span className="font-semibold text-green-600">
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
