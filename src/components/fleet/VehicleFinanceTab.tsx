import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

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
}

const ITEMS_PER_PAGE = 10;
const DEFAULT_VISIBLE_ITEMS = 4;

export function VehicleFinanceTab({ vehicleId, vehicleName, purchasePrice }: VehicleFinanceTabProps) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchVehicleFinanceRecords();
    
    const channel = supabase
      .channel(`vehicle_finance_${vehicleId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'financial_records' }, 
        () => fetchVehicleFinanceRecords()
      )
      .subscribe();
      
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
      
      const income = (data || [])
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const expenses = (data || [])
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + Number(r.amount), 0);
        
      setTotalRevenue(income);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error("Exception fetching vehicle finance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const netIncome = totalRevenue - totalExpenses;
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const paginatedRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Calculate depreciation status
  const getDepreciationStatus = () => {
    if (!purchasePrice || purchasePrice <= 0) {
      return null;
    }
    
    const remainingForDepreciation = Math.max(0, purchasePrice - netIncome);
    const depreciationPercentage = Math.min(100, (netIncome / purchasePrice) * 100);
    const isFullyDepreciated = netIncome >= purchasePrice;
    const netProfitAfterDepreciation = isFullyDepreciated ? netIncome - purchasePrice : 0;
    
    return {
      remainingForDepreciation,
      depreciationPercentage,
      isFullyDepreciated,
      netProfitAfterDepreciation
    };
  };

  const depreciationStatus = getDepreciationStatus();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-muted-foreground">Loading finance data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - Unchanged */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              €{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-green-600 mt-1">
              From {records.filter(r => r.type === 'income').length} transactions
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">Total Expenses</span>
            </div>
            <div className="text-2xl font-bold text-red-700">
              €{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-red-600 mt-1">
              From {records.filter(r => r.type === 'expense').length} transactions
            </div>
          </CardContent>
        </Card>
        
        <Card className={netIncome >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Net Income</span>
            </div>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              €{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Finance Container: Purchase Value + Depreciation/Profit + Reserved Space */}
      {purchasePrice && purchasePrice > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Purchase Value Card */}
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Purchase Value</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                €{purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Initial investment
              </div>
            </CardContent>
          </Card>

          {/* Depreciation Circle OR Net Profit Card */}
          {depreciationStatus && (
            <Card className="border-border bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center">
                {!depreciationStatus.isFullyDepreciated ? (
                  // Depreciation in progress - Show circular progress
                  <>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                      Remaining for Depreciation
                    </span>
                    <AnimatedCircularProgressBar
                      max={100}
                      min={0}
                      value={depreciationStatus.depreciationPercentage}
                      gaugePrimaryColor="rgb(79 70 229)"
                      gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
                      className="size-32"
                      displayValue={
                        <span className="text-base font-semibold text-foreground">
                          €{depreciationStatus.remainingForDepreciation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      }
                      tooltipContent={
                        <span className="text-sm">
                          €{netIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} depreciated
                        </span>
                      }
                    />
                  </>
                ) : (
                  // Fully depreciated - Show Net Profit
                  <>
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Vehicle Fully Depreciated</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      +€{depreciationStatus.netProfitAfterDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-green-600 mt-2">
                      Net Profit since depreciation completed
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reserved Empty Space */}
          <div className="hidden md:block">
            {/* Intentionally empty for future use */}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Transaction History
            </div>
            {records.length > DEFAULT_VISIBLE_ITEMS && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllRecords(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All ({records.length})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No financial records for this vehicle yet.</p>
              <p className="text-sm mt-1">
                Create bookings or add expenses to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.slice(0, DEFAULT_VISIBLE_ITEMS).map((record) => (
                <TransactionItem key={record.id} record={record} />
              ))}
              
              {records.length > DEFAULT_VISIBLE_ITEMS && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  Showing {DEFAULT_VISIBLE_ITEMS} of {records.length} records
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
              All Transactions - {vehicleName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {paginatedRecords.map((record) => (
              <TransactionItem key={record.id} record={record} />
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
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

function TransactionItem({ record }: { record: FinanceRecord }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${record.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <div className="font-medium text-sm">
            {record.category.charAt(0).toUpperCase() + record.category.slice(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {record.description || (record.type === 'income' ? 'Rental income' : 'Expense')}
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
