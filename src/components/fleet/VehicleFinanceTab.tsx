import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Eye, Sparkles, Clock, Gauge, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateUsageDepreciation, formatYearsOwned } from "@/utils/depreciationUtils";

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
  purchasePrice?: number | null;          // Actual price paid (for ROI metrics)
  marketValueAtPurchase?: number | null;  // Market value for depreciation
  purchaseDate?: string | null;
  currentMileage?: number;
  initialMileage?: number;
  vehicleType?: string;
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
  vehicleType = 'car'
}: VehicleFinanceTabProps) {
  const { language } = useLanguage();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchVehicleFinanceRecords();
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
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('date', { ascending: false });

      if (error) {
        console.error("Error fetching vehicle finance records:", error);
        return;
      }
      setRecords(data || []);
      const income = (data || []).filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
      const expenses = (data || []).filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
      setTotalRevenue(income);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error("Exception fetching vehicle finance:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
    purchaseDate,
    currentMileage,
    initialMileage,
    vehicleType: vehicleType as 'car' | 'motorbike' | 'boat' | 'atv',
  }) : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-muted-foreground">Loading finance data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
              €{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {language === 'el' 
                ? `Από ${records.filter(r => r.type === 'income').length} συναλλαγές`
                : `From ${records.filter(r => r.type === 'income').length} transactions`}
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
              €{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-red-600 mt-1">
              {language === 'el' 
                ? `Από ${records.filter(r => r.type === 'expense').length} συναλλαγές`
                : `From ${records.filter(r => r.type === 'expense').length} transactions`}
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
              €{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance Metrics Row: Purchase Value + Depreciation/Profit + Value Loss */}
      {purchaseValue && purchaseValue > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Purchase Value Card - Compact */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  {language === 'el' ? 'Αξία Αγοράς' : 'Purchase Value'}
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                €{purchaseValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {language === 'el' ? 'Αρχική επένδυση' : 'Initial investment'}
              </div>
            </CardContent>
          </Card>

          {/* Depreciation Circle OR Net Profit Card - Compact */}
          {depreciationStatus && (
            <Card className="border-border bg-card">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                {!depreciationStatus.isFullyDepreciated ? (
                  <>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {language === 'el' ? 'Υπόλοιπο Απόσβεσης' : 'Remaining for Depreciation'}
                    </span>
                    <AnimatedCircularProgressBar
                      min={0}
                      max={purchaseValue}
                      value={netIncome}
                      gaugePrimaryColor="hsl(var(--primary))"
                      gaugeSecondaryColor="hsl(var(--foreground) / 0.12)"
                      className="size-24"
                      displayValue={
                        <span className="text-sm font-semibold text-foreground">
                          €{depreciationStatus.remainingForDepreciation.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })}
                        </span>
                      }
                      tooltipContent={
                        <span className="text-sm">
                          €{netIncome.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })} {language === 'el' ? 'αποσβέστηκε' : 'depreciated'}
                        </span>
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-medium uppercase tracking-wide text-xs">
                        {language === 'el' ? 'ΚΑΘΑΡΟ ΚΕΡΔΟΣ' : 'NET PROFIT'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      +€{depreciationStatus.netProfitAfterDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {language === 'el' ? 'Πλήρως αποσβεσμένο' : 'Fully Depreciated'}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vehicle Value Loss Over Time Card */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <Gauge className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {language === 'el' ? 'Μείωση Αξίας' : 'Value Loss Over Time'}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3">
                      <p className="text-xs">
                        {language === 'el'
                          ? 'Οι τιμές απόσβεσης είναι εκτιμήσεις βάσει χρόνου και χρήσης. Προορίζονται για εσωτερική παρακολούθηση και δεν αντιπροσωπεύουν εγγυημένες αξίες μεταπώλησης.'
                          : 'These values are estimates based on time and usage patterns. Intended for internal tracking and do not represent guaranteed market resale values.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {hasDepreciationData && usageDepreciation ? (
                <>
                  {/* Total Value Loss */}
                  <div className="text-2xl font-bold text-orange-600">
                    -€{Math.round(usageDepreciation.totalDepreciation).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round(usageDepreciation.depreciationPercentage)}% {language === 'el' ? 'μείωση' : 'loss'}
                  </div>

                  {/* Inline Breakdown */}
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {language === 'el' ? 'Από χρόνο' : 'From time'}
                      </span>
                      <span className="font-medium">
                        €{Math.round(usageDepreciation.timeDepreciation).toLocaleString()} 
                        <span className="text-muted-foreground ml-1">({Math.round(usageDepreciation.timeDepreciationShare)}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Gauge className="h-3 w-3" />
                        {language === 'el' ? 'Από χιλιόμετρα' : 'From mileage'}
                      </span>
                      <span className="font-medium">
                        €{Math.round(usageDepreciation.mileageDepreciation).toLocaleString()}
                        <span className="text-muted-foreground ml-1">({Math.round(usageDepreciation.mileageDepreciationShare)}%)</span>
                      </span>
                    </div>
                  </div>

                  {/* Estimated Current Value */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">
                      {language === 'el' ? 'Εκτιμώμενη τρέχουσα αξία' : 'Estimated current value'}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      €{Math.round(usageDepreciation.estimatedCurrentValue).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatYearsOwned(usageDepreciation.yearsOwned, language)} • {usageDepreciation.milesDriven.toLocaleString()} km {language === 'el' ? 'προστέθηκαν' : 'added'}
                    </div>
                  </div>
                </>
              ) : (
                /* Fallback: Missing depreciation data */
                <div className="py-4 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <div className="text-sm font-medium text-muted-foreground">
                    {language === 'el' ? 'Μη διαθέσιμο' : 'Unavailable'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {language === 'el' 
                      ? 'Προσθέστε δεδομένα απόσβεσης για υπολογισμό μείωσης αξίας.'
                      : 'Add depreciation data to calculate vehicle value loss.'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === 'el' ? 'Ιστορικό Συναλλαγών' : 'Transaction History'}
            </div>
            {records.length > DEFAULT_VISIBLE_ITEMS && (
              <Button variant="outline" size="sm" onClick={() => setShowAllRecords(true)}>
                <Eye className="h-4 w-4 mr-2" />
                {language === 'el' ? `Προβολή Όλων (${records.length})` : `View All (${records.length})`}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{language === 'el' ? 'Δεν υπάρχουν οικονομικές εγγραφές για αυτό το όχημα.' : 'No financial records for this vehicle yet.'}</p>
              <p className="text-sm mt-1">
                {language === 'el' 
                  ? 'Δημιουργήστε κρατήσεις ή προσθέστε έξοδα για να τα δείτε εδώ.'
                  : 'Create bookings or add expenses to see them here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.slice(0, DEFAULT_VISIBLE_ITEMS).map(record => (
                <TransactionItem key={record.id} record={record} language={language} />
              ))}
              
              {records.length > DEFAULT_VISIBLE_ITEMS && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  {language === 'el' 
                    ? `Εμφάνιση ${DEFAULT_VISIBLE_ITEMS} από ${records.length} εγγραφές`
                    : `Showing ${DEFAULT_VISIBLE_ITEMS} of ${records.length} records`}
                </div>
              )}
            </div>
          )}
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
            {paginatedRecords.map(record => (
              <TransactionItem key={record.id} record={record} language={language} />
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {language === 'el' 
                  ? `Σελίδα ${currentPage} από ${totalPages}`
                  : `Page ${currentPage} of ${totalPages}`}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Transaction Item Component
function TransactionItem({ record, language }: { record: FinanceRecord; language: string }) {
  const isIncome = record.type === 'income';
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isIncome ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
          {isIncome ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div>
          <div className="font-medium text-sm">{record.category}</div>
          {record.description && (
            <div className="text-xs text-muted-foreground">{record.description}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {format(new Date(record.date), 'dd MMM yyyy')}
          </div>
        </div>
      </div>
      <div className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
        {isIncome ? '+' : '-'}€{Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}
