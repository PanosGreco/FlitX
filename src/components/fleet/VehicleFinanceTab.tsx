import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Eye, Sparkles, Clock, Gauge, Info, AlertCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { calculateMileageDepreciation } from "@/utils/mileageDepreciation";
import { Progress } from "@/components/ui/progress";

interface Vehicle {
  id: string;
  name: string;
  year: number;
  type: string;
  category: string;
  license_plate: string;
  mileage: number;
  daily_rate: number;
  image?: string | null;
  created_at?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  initial_mileage?: number;
  market_value_at_purchase?: number | null;
  is_sold?: boolean;
  sale_price?: number | null;
  sale_date?: string | null;
}
interface AdditionalInfoCategory {
  id: string;
  name: string;
}
interface AdditionalInfoSubcategory {
  id: string;
  category_id: string;
  value: string;
}
interface BookingAdditionalInfo {
  id: string;
  booking_id: string;
  category_id: string;
  subcategory_id: string | null;
  subcategory_value: string | null;
}
interface DailyTask {
  id: string;
  created_at: string;
  task_date: string;
  task_type: string;
  vehicle_id: string;
  booking_id: string | null;
  contract_path: string | null;
  fuel_level_start: string | null;
  fuel_level_end: string | null;
  mileage_start: number | null;
  mileage_end: number | null;
  notes: string | null;
}
interface FinancialRecord {
  id: string;
  created_at: string;
  vehicle_id: string;
  booking_id: string | null;
  type: string;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  source_section: string | null;
}
interface RentalBooking {
  id: string;
  created_at: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  customer_name: string;
  notes: string | null;
  contract_photo_path: string | null;
  fuel_level: string | null;
  payment_status: string | null;
  balance_due_amount: number | null;
}
interface VehicleBooking {
  start_date: string;
  end_date: string;
  total_amount: number | null;
}
interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string | null;
  date: string;
  booking_id: string | null;
}
interface VehicleFinanceTabProps {
  vehicleId: string;
  vehicleName: string;
  purchasePrice?: number | null;
  currentMileage?: number;
  initialMileage?: number;
  vehicleType?: string;
  vehicleYear: number;
  vehicleCreatedAt?: string | null;
  isSold?: boolean;
  salePrice?: number | null;
  saleDate?: string | null;
  dailyRate?: number;
}
const ITEMS_PER_PAGE = 10;
const DEFAULT_VISIBLE_ITEMS = 4;

export function VehicleFinanceTab({
  vehicleId,
  vehicleName,
  purchasePrice,
  marketValueAtPurchase,
  purchaseDate,
  currentMileage = 0,
  initialMileage = 0,
  vehicleType = 'car',
  vehicleYear,
  vehicleCreatedAt,
  isSold = false,
  salePrice,
  saleDate,
  dailyRate = 0
}: VehicleFinanceTabProps) {
  const { t } = useTranslation(['fleet', 'common', 'finance']);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);

  useEffect(() => {
    fetchVehicleFinanceRecords();
    fetchVehicleBookings();
    const channel = supabase.channel(`vehicle_finance_${vehicleId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'financial_records'
    }, () => fetchVehicleFinanceRecords()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId]);

  const fetchVehicleFinanceRecords = async () => {
    try {
      setIsLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.from('financial_records').select('*').eq('vehicle_id', vehicleId).order('date', { ascending: false });
      if (error) {
        console.error("Error fetching vehicle finance records:", error);
        return;
      }
      setRecords(data || []);
      const operationalRecords = (data || []).filter(r => r.category !== 'vehicle_sale' && r.source_section !== 'vehicle_sale');
      const income = operationalRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
      const expenses = operationalRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
      setTotalRevenue(income);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error("Exception fetching vehicle finance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicleBookings = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;
      const { data, error } = await supabase.from('rental_bookings').select('start_date, end_date, total_amount').eq('vehicle_id', vehicleId);
      if (error) {
        console.error("Error fetching vehicle bookings:", error);
        return;
      }
      setVehicleBookings(data || []);
    } catch (error) {
      console.error("Exception fetching vehicle bookings:", error);
    }
  };

  const calculateTotalBookedDays = (bookings: VehicleBooking[]): number => {
    return bookings.reduce((total, booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const days = Math.max(1, differenceInDays(end, start) + 1);
      return total + days;
    }, 0);
  };

  const calculateActiveDays = (createdAt: string | null | undefined): number => {
    if (!createdAt) return 0;
    const startDate = new Date(createdAt);
    const today = new Date();
    return Math.max(1, differenceInDays(today, startDate) + 1);
  };

  const totalBookedDays = calculateTotalBookedDays(vehicleBookings);
  const activeDays = calculateActiveDays(vehicleCreatedAt);
  const avgRentalPrice = totalBookedDays > 0 ? totalRevenue / totalBookedDays : null;
  const avgIncomePerDay = activeDays > 0 ? totalRevenue / activeDays : null;
  const avgCostPerDay = activeDays > 0 ? totalExpenses / activeDays : null;
  const netIncome = totalRevenue - totalExpenses;
  const purchaseValue = typeof purchasePrice === "number" ? purchasePrice : Number(purchasePrice);
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const paginatedRecords = records.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getDepreciationStatus = () => {
    if (!purchaseValue || purchaseValue <= 0) return null;
    const remainingForDepreciation = Math.max(0, purchaseValue - netIncome);
    const depreciationPercentage = Math.min(100, netIncome / purchaseValue * 100);
    const isFullyDepreciated = netIncome >= purchaseValue;
    const netProfitAfterDepreciation = isFullyDepreciated ? netIncome - purchaseValue : 0;
    return { remainingForDepreciation, depreciationPercentage, isFullyDepreciated, netProfitAfterDepreciation };
  };
  const depreciationStatus = getDepreciationStatus();

  const mileageDepreciation = (purchaseValue && purchaseValue > 0)
    ? calculateMileageDepreciation({
        purchasePrice: purchaseValue,
        initialMileage: initialMileage || 0,
        currentMileage: currentMileage || 0,
      })
    : null;

  if (isLoading) {
    return <div className="flex justify-center py-12">
        <div className="text-muted-foreground">{t('fleet:loadingFinanceData')}</div>
      </div>;
  }

  return <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">{t('fleet:totalRevenue')}</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              €{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {t('fleet:fromTransactions', { count: records.filter(r => r.type === 'income').length })}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">{t('fleet:totalExpenses')}</span>
            </div>
            <div className="text-2xl font-bold text-red-700">
              €{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-red-600 mt-1">
              {t('fleet:fromTransactions', { count: records.filter(r => r.type === 'expense').length })}
            </div>
          </CardContent>
        </Card>
        
        <Card className={netIncome >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">{t('fleet:netIncome')}</span>
            </div>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              €{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance Metrics Row */}
      {purchaseValue && purchaseValue > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isSold ? (
            <Card className="border-red-200 bg-red-50 h-[130px] overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className="flex flex-col w-full gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t('fleet:purchaseValue')}</span>
                    <span className="text-sm font-semibold text-foreground">{purchaseValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}€</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wide">{t('fleet:soldForLabel')}</span>
                    <span className="text-sm font-semibold text-foreground">{(salePrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}€</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground tracking-wide">{t('fleet:netIncomeFromRentals')}</span>
                    <span className="text-base font-semibold text-foreground">
                      {netIncome >= 0 ? '+' : '−'}{Math.abs(netIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}€
                    </span>
                  </div>
                  <div className="border-t border-red-200 pt-2 mt-1">
                    {(() => {
                      const saleResult = (salePrice ?? 0) - (depreciationStatus?.remainingForDepreciation ?? 0);
                      const isProfit = saleResult >= 0;
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            {isProfit ? t('fleet:profitFromSale') : t('fleet:lossFromSale')}
                          </span>
                          <span className={`text-2xl font-extrabold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : '−'}{Math.abs(saleResult).toLocaleString(undefined, { minimumFractionDigits: 0 })}€
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
          depreciationStatus && <Card className="border-border bg-card h-[106px] overflow-hidden">
              <CardContent className="p-4 h-full flex items-center">
                {!depreciationStatus.isFullyDepreciated ? <div className="flex items-center justify-between w-full gap-3 px-[32px]">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('fleet:purchaseValue')}</span>
                      <div className="text-2xl font-bold text-foreground mt-1">€{purchaseValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Math.round(depreciationStatus.depreciationPercentage)}% {t('fleet:depreciated')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 border-l border-border pl-3 shrink-0">
                      <AnimatedCircularProgressBar min={0} max={purchaseValue} value={netIncome} gaugePrimaryColor="hsl(var(--primary))" gaugeSecondaryColor="hsl(var(--foreground) / 0.12)" className="size-14" displayValue={<span className="text-[10px] font-semibold text-foreground">
                            €{depreciationStatus.remainingForDepreciation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>} tooltipContent={<span className="text-sm">
                            €{netIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {t('fleet:depreciated')}
                          </span>} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{t('fleet:remaining')}</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{t('fleet:forDepreciation')}</span>
                      </div>
                    </div>
                  </div> : <div className="flex items-center justify-between w-full gap-3">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('fleet:purchaseValue')}</span>
                      <div className="text-2xl font-bold text-foreground mt-1">€{purchaseValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                      <div className="text-xs text-green-600 mt-0.5">{t('fleet:fullyDepreciated')}</div>
                    </div>
                    <div className="flex items-center gap-2 border-l border-border pl-3 shrink-0">
                      <Sparkles className="h-5 w-5 text-green-600" />
                      <div className="flex flex-col">
                        <div className="text-lg font-bold text-green-600">
                          +€{depreciationStatus.netProfitAfterDepreciation.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </div>
                        <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">{t('fleet:netProfit')}</span>
                      </div>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          )}

          {/* Vehicle Averages Card */}
          <Card className="border-border bg-card h-[130px] overflow-hidden">
            <CardContent className="p-3 h-full flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">{t('fleet:vehicleAverages')}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-orange-400">
                  <span className="text-muted-foreground text-sm">{t('fleet:avgRentalPrice')}</span>
                  <span className="font-medium text-sm">{avgRentalPrice !== null ? `€${avgRentalPrice.toFixed(2)} / day` : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-green-400">
                  <span className="text-muted-foreground text-sm">{t('fleet:avgIncomePerDay')}</span>
                  <span className="font-medium text-green-600 text-sm">{avgIncomePerDay !== null ? `€${avgIncomePerDay.toFixed(2)} / day` : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-red-400">
                  <span className="text-muted-foreground text-sm">{t('fleet:avgCostPerDay')}</span>
                  <span className="font-medium text-red-600 text-sm">{avgCostPerDay !== null ? `€${avgCostPerDay.toFixed(2)} / day` : '—'}</span>
                </div>
                <div className="border-t border-border/60 my-0.5" />
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-blue-400">
                  <span className="text-muted-foreground text-sm">{t('fleet:avgProfitPerDay')}</span>
                  <span className={`font-semibold text-sm ${(avgIncomePerDay !== null && avgCostPerDay !== null) ? ((avgIncomePerDay - avgCostPerDay) >= 0 ? 'text-blue-600' : 'text-orange-600') : ''}`}>
                    {avgIncomePerDay !== null && avgCostPerDay !== null ? `€${(avgIncomePerDay - avgCostPerDay).toFixed(2)} / day` : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Value Loss Over Time Card */}
          {!isSold && (
          <Card className="border-border bg-card h-[106px] overflow-hidden">
            <CardContent className="p-4 h-full">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">{t('fleet:valueLossOverTime')}</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3">
                      <p className="text-xs">{t('fleet:valueLossTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {hasDepreciationData && usageDepreciation ? <div className="flex flex-col">
                  <div className="text-lg font-bold text-orange-600">
                    -€{Math.round(usageDepreciation.totalDepreciation).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(usageDepreciation.depreciationPercentage)}% {t('fleet:loss')} • €{Math.round(usageDepreciation.estimatedCurrentValue).toLocaleString()} {t('fleet:currentValue')}
                  </div>
                </div> : <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">{t('fleet:unavailableAddData')}</span>
                </div>}
            </CardContent>
          </Card>
          )}
        </div>}

      {/* Variable Cost per Booking Widget */}
      {(() => {
        const maintenanceCost = records
          .filter(r => r.type === 'expense' && (r.category === 'maintenance' || r.category === 'vehicle_maintenance' || r.category === 'boat_maintenance'))
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const bookingsCount = vehicleBookings.length;
        const variableCost = bookingsCount > 0 ? maintenanceCost / bookingsCount : 0;
        const netProfitPerBooking = dailyRate - variableCost;

        return (
          <Card className="border-border bg-card">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">{t('finance:variableCostPerBooking')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center text-center">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{t('finance:pricePerBooking')}</span>
                  <span className="text-lg font-bold text-foreground">
                    {dailyRate > 0 ? `€${dailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center border-x border-border px-2">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{t('finance:variableCostPerBooking')}</span>
                  <span className="text-lg font-bold text-red-600">
                    {bookingsCount > 0 ? `€${variableCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{t('finance:variableCostFormula')}</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{t('finance:netProfitPerBooking')}</span>
                  <span className={`text-lg font-bold ${netProfitPerBooking >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {dailyRate > 0 && bookingsCount > 0 ? `€${netProfitPerBooking.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('fleet:transactionHistory')}
            </div>
            {records.length > DEFAULT_VISIBLE_ITEMS && <Button variant="outline" size="sm" onClick={() => setShowAllRecords(true)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('common:viewAll')} ({records.length})
              </Button>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t('fleet:noFinancialRecords')}</p>
              <p className="text-sm mt-1">{t('fleet:createBookingsOrExpenses')}</p>
            </div> : <div className="space-y-2">
              {records.slice(0, DEFAULT_VISIBLE_ITEMS).map(record => <TransactionItem key={record.id} record={record} />)}
              {records.length > DEFAULT_VISIBLE_ITEMS && <div className="text-center py-2 text-sm text-muted-foreground">
                  {t('common:showing')} {DEFAULT_VISIBLE_ITEMS} {t('common:of')} {records.length} {t('common:records')}
                </div>}
            </div>}
        </CardContent>
      </Card>

      {/* View All Dialog with Pagination */}
      <Dialog open={showAllRecords} onOpenChange={setShowAllRecords}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('fleet:allTransactions')} - {vehicleName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {paginatedRecords.map(record => <TransactionItem key={record.id} record={record} />)}
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t('common:page')} {currentPage} {t('common:of')} {totalPages}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}

// Transaction Item Component
function TransactionItem({ record }: { record: FinanceRecord }) {
  const isIncome = record.type === 'income';
  return <div className={`flex items-center justify-between p-3 rounded-lg border ${isIncome ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
          {isIncome ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
        </div>
        <div>
          <div className="font-medium text-sm">{record.category}</div>
          {record.description && <div className="text-xs text-muted-foreground">{record.description}</div>}
          <div className="text-xs text-muted-foreground">
            {format(new Date(record.date), 'dd MMM yyyy')}
          </div>
        </div>
      </div>
      <div className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
        {isIncome ? '+' : '-'}€{Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
    </div>;
}
