import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Eye, Sparkles, Clock, Gauge, Info } from "lucide-react";
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
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  currentMileage?: number;
  initialMileage?: number;
}

const ITEMS_PER_PAGE = 10;
const DEFAULT_VISIBLE_ITEMS = 4;

export function VehicleFinanceTab({
  vehicleId,
  vehicleName,
  purchasePrice,
  purchaseDate,
  currentMileage = 0,
  initialMileage = 0
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

  // Calculate usage-based depreciation (time + mileage)
  const usageDepreciation = calculateUsageDepreciation({
    purchasePrice: purchaseValue,
    purchaseDate,
    currentMileage,
    initialMileage,
  });

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

      {/* Finance Metrics Row: Purchase Value + Depreciation/Profit + Usage Depreciation */}
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

          {/* Usage-Based Depreciation Card */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <Gauge className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {language === 'el' ? 'Απόσβεση Χρήσης' : 'Usage Depreciation'}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3">
                      <p className="text-xs mb-2">
                        {language === 'el'
                          ? 'Οι τιμές απόσβεσης είναι εκτιμήσεις βάσει χρόνου και χρήσης. Προορίζονται για εσωτερική παρακολούθηση και δεν αντιπροσωπεύουν εγγυημένες αξίες μεταπώλησης.'
                          : 'Depreciation values are estimates based on time and usage. Intended for internal tracking and do not represent guaranteed resale values.'}
                      </p>
                      {usageDepreciation && (
                        <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                          <div>• €{Math.round(usageDepreciation.timeDepreciation * 0.6).toLocaleString()} {language === 'el' ? 'από χρόνο' : 'from time'}</div>
                          <div>• €{Math.round(usageDepreciation.mileageDepreciation * 0.4).toLocaleString()} {language === 'el' ? 'από χιλιόμετρα' : 'from mileage'}</div>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {usageDepreciation ? (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    -€{usageDepreciation.totalDepreciation.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {language === 'el' 
                      ? `Μείωση αξίας (${usageDepreciation.depreciationPercentage.toFixed(0)}%)`
                      : `Value loss (${usageDepreciation.depreciationPercentage.toFixed(0)}%)`}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">
                      {language === 'el' ? 'Εκτιμώμενη τρέχουσα αξία' : 'Estimated current value'}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      €{usageDepreciation.estimatedCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </div>
                    {usageDepreciation.yearsOwned > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatYearsOwned(usageDepreciation.yearsOwned, language)} • {usageDepreciation.milesDriven.toLocaleString()} km
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  {language === 'el' 
                    ? 'Προσθέστε ημερομηνία αγοράς για υπολογισμό'
                    : 'Add purchase date to calculate'}
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
                {language === 'el' ? `Σελίδα ${currentPage} από ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {language === 'el' ? 'Προηγούμενη' : 'Previous'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {language === 'el' ? 'Επόμενη' : 'Next'}
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

function TransactionItem({ record, language }: { record: FinanceRecord; language: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${record.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <div className="font-medium text-sm">
            {record.category.charAt(0).toUpperCase() + record.category.slice(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {record.description || (record.type === 'income' 
              ? (language === 'el' ? 'Έσοδα ενοικίασης' : 'Rental income') 
              : (language === 'el' ? 'Έξοδο' : 'Expense'))}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-semibold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
          {record.type === 'income' ? '+' : '-'}€{Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(record.date), 'dd/MM/yyyy')}
        </div>
      </div>
    </div>
  );
}