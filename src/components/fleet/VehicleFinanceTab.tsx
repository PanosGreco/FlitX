import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Eye, Sparkles, Clock, Gauge, Info, AlertCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateUsageDepreciation, formatYearsOwned } from "@/utils/depreciationUtils";
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
  purchasePrice?: number | null; // Actual price paid (for ROI metrics)
  marketValueAtPurchase?: number | null; // Market value for depreciation
  purchaseDate?: string | null;
  currentMileage?: number;
  initialMileage?: number;
  vehicleType?: string;
  vehicleYear: number; // Vehicle model year (required for depreciation)
  vehicleCreatedAt?: string | null; // Date vehicle was added to the fleet
  isSold?: boolean;
  salePrice?: number | null;
  saleDate?: string | null;
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
  saleDate
}: VehicleFinanceTabProps) {
  const {
    language
  } = useLanguage();
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
      const {
        data: session
      } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setIsLoading(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('financial_records').select('*').eq('vehicle_id', vehicleId).order('date', {
        ascending: false
      });
      if (error) {
        console.error("Error fetching vehicle finance records:", error);
        return;
      }
      setRecords(data || []);
      // Exclude vehicle_sale from operational metrics
      const operationalRecords = (data || []).filter(r => r.category !== 'Profit from Vehicle Sale' && r.category !== 'Loss from Vehicle Sale' && r.category !== 'Vehicle Sale');
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
      const {
        data: session
      } = await supabase.auth.getSession();
      if (!session?.session?.user) return;
      const {
        data,
        error
      } = await supabase.from('rental_bookings').select('start_date, end_date, total_amount').eq('vehicle_id', vehicleId);
      if (error) {
        console.error("Error fetching vehicle bookings:", error);
        return;
      }
      setVehicleBookings(data || []);
    } catch (error) {
      console.error("Exception fetching vehicle bookings:", error);
    }
  };

  // Calculate total booked days
  const calculateTotalBookedDays = (bookings: VehicleBooking[]): number => {
    return bookings.reduce((total, booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const days = Math.max(1, differenceInDays(end, start) + 1);
      return total + days;
    }, 0);
  };

  // Calculate days from vehicle added date to today
  const calculateActiveDays = (createdAt: string | null | undefined): number => {
    if (!createdAt) return 0;
    const startDate = new Date(createdAt);
    const today = new Date();
    return Math.max(1, differenceInDays(today, startDate) + 1);
  };
  const totalBookedDays = calculateTotalBookedDays(vehicleBookings);

  // Active days from vehicle added to today (unified for both metrics)
  const activeDays = calculateActiveDays(vehicleCreatedAt);

  // Average Rental Price = Total Income / Total Booked Days
  const avgRentalPrice = totalBookedDays > 0 ? totalRevenue / totalBookedDays : null;

  // Average Income per Day = Total Income / Days from vehicle added to today
  const avgIncomePerDay = activeDays > 0 ? totalRevenue / activeDays : null;

  // Average Cost per Day = Total Expenses / Days from vehicle added to today
  const avgCostPerDay = activeDays > 0 ? totalExpenses / activeDays : null;
  const netIncome = totalRevenue - totalExpenses;
  const purchaseValue = typeof purchasePrice === "number" ? purchasePrice : Number(purchasePrice);
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const paginatedRecords = records.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Calculate depreciation status (income-based)
  const getDepreciationStatus = () => {
    if (!purchaseValue || purchaseValue <= 0) {
      return null;
    }
    const remainingForDepreciation = Math.max(0, purchaseValue - netIncome);
    const depreciationPercentage = Math.min(100, netIncome / purchaseValue * 100);
    const isFullyDepreciated = netIncome >= purchaseValue;
    const netProfitAfterDepreciation = isFullyDepreciated ? netIncome - purchaseValue : 0;
    return {
      remainingForDepreciation,
      depreciationPercentage,
      isFullyDepreciated,
      netProfitAfterDepreciation
    };
  };
  const depreciationStatus = getDepreciationStatus();

  // Calculate usage-based depreciation (time + mileage) using market value
  const marketValue = typeof marketValueAtPurchase === "number" ? marketValueAtPurchase : Number(marketValueAtPurchase);
  const hasDepreciationData = marketValue && marketValue > 0;
  const usageDepreciation = hasDepreciationData ? calculateUsageDepreciation({
    marketValueAtPurchase: marketValue,
    vehicleModelYear: vehicleYear,
    purchaseDate,
    currentMileage,
    initialMileage,
    vehicleType: vehicleType as 'car' | 'motorbike' | 'boat' | 'atv'
  }) : null;
  if (isLoading) {
    return <div className="flex justify-center py-12">
        <div className="text-muted-foreground">Loading finance data...</div>
      </div>;
  }
  return <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === 'el' ? 'Συνολικά Έσοδα' : 'Total Revenue'}
              </span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              €{totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2
            })}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {language === 'el' ? `Από ${records.filter(r => r.type === 'income').length} συναλλαγές` : `From ${records.filter(r => r.type === 'income').length} transactions`}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === 'el' ? 'Συνολικά Έξοδα' : 'Total Expenses'}
              </span>
            </div>
            <div className="text-2xl font-bold text-red-700">
              €{totalExpenses.toLocaleString(undefined, {
              minimumFractionDigits: 2
            })}
            </div>
            <div className="text-xs text-red-600 mt-1">
              {language === 'el' ? `Από ${records.filter(r => r.type === 'expense').length} συναλλαγές` : `From ${records.filter(r => r.type === 'expense').length} transactions`}
            </div>
          </CardContent>
        </Card>
        
        <Card className={netIncome >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === 'el' ? 'Καθαρό Εισόδημα' : 'Net Income'}
              </span>
            </div>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              €{netIncome.toLocaleString(undefined, {
              minimumFractionDigits: 2
            })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance Metrics Row: Purchase/Depreciation + Vehicle Averages + Value Loss */}
      {purchaseValue && purchaseValue > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SOLD State or Depreciation Card */}
          {isSold ? (
            <Card className="border-red-200 bg-red-50 h-[130px] overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className="flex flex-col w-full gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {language === 'el' ? 'Αξία Αγοράς' : 'Purchase Value'}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      €{purchaseValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                      {language === 'el' ? 'ΠΩΛΗΘΗΚΕ ΓΙΑ' : 'SOLD FOR'}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      €{(salePrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="border-t border-red-200 pt-1">
                    {(() => {
                      const saleResult = (salePrice ?? 0) - (depreciationStatus?.remainingForDepreciation ?? 0);
                      const isProfit = saleResult >= 0;
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {isProfit 
                              ? (language === 'el' ? 'Κέρδος' : 'Profit')
                              : (language === 'el' ? 'Ζημία' : 'Loss')}
                          </span>
                          <span className={`text-xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : '−'}€{Math.abs(saleResult).toLocaleString(undefined, { minimumFractionDigits: 0 })}
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
                    {/* Purchase Value - Left Side */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {language === 'el' ? 'Αξία Αγοράς' : 'Purchase Value'}
                      </span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        €{purchaseValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0
                })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Math.round(depreciationStatus.depreciationPercentage)}% {language === 'el' ? 'αποσβεσμένο' : 'depreciated'}
                      </div>
                    </div>
                    
                    {/* Progress Circle - Right Side */}
                    <div className="flex items-center gap-3 border-l border-border pl-3 shrink-0">
                      <AnimatedCircularProgressBar min={0} max={purchaseValue} value={netIncome} gaugePrimaryColor="hsl(var(--primary))" gaugeSecondaryColor="hsl(var(--foreground) / 0.12)" className="size-14" displayValue={<span className="text-[10px] font-semibold text-foreground">
                            €{depreciationStatus.remainingForDepreciation.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
                          </span>} tooltipContent={<span className="text-sm">
                            €{netIncome.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })} {language === 'el' ? 'αποσβέστηκε' : 'depreciated'}
                          </span>} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                          {language === 'el' ? 'Υπόλοιπο' : 'Remaining'}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                          {language === 'el' ? 'Απόσβεσης' : 'for Depreciation'}
                        </span>
                      </div>
                    </div>
                  </div> : <div className="flex items-center justify-between w-full gap-3">
                    {/* Purchase Value - Left Side */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {language === 'el' ? 'Αξία Αγοράς' : 'Purchase Value'}
                      </span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        €{purchaseValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0
                })}
                      </div>
                      <div className="text-xs text-green-600 mt-0.5">
                        {language === 'el' ? 'Πλήρως αποσβεσμένο' : 'Fully depreciated'}
                      </div>
                    </div>
                    
                    {/* Net Profit Display - Right Side */}
                    <div className="flex items-center gap-2 border-l border-border pl-3 shrink-0">
                      <Sparkles className="h-5 w-5 text-green-600" />
                      <div className="flex flex-col">
                        <div className="text-lg font-bold text-green-600">
                          +€{depreciationStatus.netProfitAfterDepreciation.toLocaleString(undefined, {
                    minimumFractionDigits: 0
                  })}
                        </div>
                        <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">
                          {language === 'el' ? 'Καθαρό Κέρδος' : 'Net Profit'}
                        </span>
                      </div>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          )}

          {/* Vehicle Averages Card - NEW */}
          <Card className="border-border bg-card h-[130px] overflow-hidden">
            <CardContent className="p-3 h-full flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {language === 'el' ? 'Μέσοι Όροι Οχήματος' : 'Vehicle Averages'}
                </span>
              </div>
              
              <div className="space-y-1">
                {/* Average Rental Price */}
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-orange-400">
                  <span className="text-muted-foreground text-sm">
                    {language === 'el' ? 'Μ.Ο. Τιμή Ενοικίασης' : 'Avg Rental Price'}
                  </span>
                  <span className="font-medium text-sm">
                    {avgRentalPrice !== null ? `€${avgRentalPrice.toFixed(2)} / day` : '—'}
                  </span>
                </div>
                
                {/* Average Income per Day */}
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-green-400">
                  <span className="text-muted-foreground text-sm">
                    {language === 'el' ? 'Μ.Ο. Έσοδα/Ημέρα' : 'Avg Income/Day'}
                  </span>
                  <span className="font-medium text-green-600 text-sm">
                    {avgIncomePerDay !== null ? `€${avgIncomePerDay.toFixed(2)} / day` : '—'}
                  </span>
                </div>
                
                {/* Average Cost per Day */}
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-red-400">
                  <span className="text-muted-foreground text-sm">
                    {language === 'el' ? 'Μ.Ο. Κόστος/Ημέρα' : 'Avg Cost/Day'}
                  </span>
                  <span className="font-medium text-red-600 text-sm">
                    {avgCostPerDay !== null ? `€${avgCostPerDay.toFixed(2)} / day` : '—'}
                  </span>
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-border/60 my-0.5" />

                {/* Average Profit per Day */}
                <div className="flex items-center justify-between text-xs pl-2 border-l-2 border-l-blue-400">
                  <span className="text-muted-foreground text-sm">
                    {language === 'el' ? 'Μ.Ο. Κέρδος/Ημέρα' : 'Avg Profit/Day'}
                  </span>
                  <span className={`font-semibold text-sm ${(avgIncomePerDay !== null && avgCostPerDay !== null) ? ((avgIncomePerDay - avgCostPerDay) >= 0 ? 'text-blue-600' : 'text-orange-600') : ''}`}>
                    {avgIncomePerDay !== null && avgCostPerDay !== null
                      ? `€${(avgIncomePerDay - avgCostPerDay).toFixed(2)} / day`
                      : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Value Loss Over Time Card */}
          <Card className="border-border bg-card h-[106px] overflow-hidden">
            <CardContent className="p-4 h-full">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {language === 'el' ? 'Μείωση Αξίας' : 'Value Loss Over Time'}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3">
                      <p className="text-xs">
                        {language === 'el' ? 'Οι τιμές απόσβεσης είναι εκτιμήσεις βάσει χρόνου και χρήσης. Προορίζονται για εσωτερική παρακολούθηση και δεν αντιπροσωπεύουν εγγυημένες αξίες μεταπώλησης.' : 'These values are estimates based on time and usage patterns. Intended for internal tracking and do not represent guaranteed market resale values.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {hasDepreciationData && usageDepreciation ? <div className="flex flex-col">
                  {/* Total Value Loss */}
                  <div className="text-lg font-bold text-orange-600">
                    -€{Math.round(usageDepreciation.totalDepreciation).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(usageDepreciation.depreciationPercentage)}% {language === 'el' ? 'μείωση' : 'loss'} • €{Math.round(usageDepreciation.estimatedCurrentValue).toLocaleString()} {language === 'el' ? 'τρέχουσα αξία' : 'current value'}
                  </div>
                </div> : <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">
                    {language === 'el' ? 'Μη διαθέσιμο - προσθέστε δεδομένα' : 'Unavailable - add depreciation data'}
                  </span>
                </div>}
            </CardContent>
          </Card>
        </div>}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === 'el' ? 'Ιστορικό Συναλλαγών' : 'Transaction History'}
            </div>
            {records.length > DEFAULT_VISIBLE_ITEMS && <Button variant="outline" size="sm" onClick={() => setShowAllRecords(true)}>
                <Eye className="h-4 w-4 mr-2" />
                {language === 'el' ? `Προβολή Όλων (${records.length})` : `View All (${records.length})`}
              </Button>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{language === 'el' ? 'Δεν υπάρχουν οικονομικές εγγραφές για αυτό το όχημα.' : 'No financial records for this vehicle yet.'}</p>
              <p className="text-sm mt-1">
                {language === 'el' ? 'Δημιουργήστε κρατήσεις ή προσθέστε έξοδα για να τα δείτε εδώ.' : 'Create bookings or add expenses to see them here.'}
              </p>
            </div> : <div className="space-y-2">
              {records.slice(0, DEFAULT_VISIBLE_ITEMS).map(record => <TransactionItem key={record.id} record={record} language={language} />)}
              
              {records.length > DEFAULT_VISIBLE_ITEMS && <div className="text-center py-2 text-sm text-muted-foreground">
                  {language === 'el' ? `Εμφάνιση ${DEFAULT_VISIBLE_ITEMS} από ${records.length} εγγραφές` : `Showing ${DEFAULT_VISIBLE_ITEMS} of ${records.length} records`}
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
              {language === 'el' ? `Όλες οι Συναλλαγές - ${vehicleName}` : `All Transactions - ${vehicleName}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {paginatedRecords.map(record => <TransactionItem key={record.id} record={record} language={language} />)}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {language === 'el' ? `Σελίδα ${currentPage} από ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
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
function TransactionItem({
  record,
  language
}: {
  record: FinanceRecord;
  language: string;
}) {
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
        {isIncome ? '+' : '-'}€{Number(record.amount).toLocaleString(undefined, {
        minimumFractionDigits: 2
      })}
      </div>
    </div>;
}