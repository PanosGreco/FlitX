import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Eye } from "lucide-react";
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

  const netProfit = totalRevenue - totalExpenses;
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const paginatedRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Calculate break-even / profit status
  const getBreakEvenStatus = () => {
    if (!purchasePrice || purchasePrice <= 0) {
      return null;
    }
    
    const remainingToBreakEven = purchasePrice - netProfit;
    
    if (remainingToBreakEven > 0) {
      return {
        type: 'remaining' as const,
        amount: remainingToBreakEven,
        percentage: Math.min(100, (netProfit / purchasePrice) * 100)
      };
    } else {
      return {
        type: 'profit' as const,
        amount: Math.abs(remainingToBreakEven),
        percentage: 100
      };
    }
  };

  const breakEvenStatus = getBreakEvenStatus();

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
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-red-600 mt-1">
              From {records.filter(r => r.type === 'expense').length} transactions
            </div>
          </CardContent>
        </Card>
        
        <Card className={netProfit >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Net Income</span>
            </div>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merged Vehicle Value & Profitability Card */}
      {purchasePrice && purchasePrice > 0 && (
        <Card className="border-muted">
          <CardContent className="py-3 px-4">
            <div className="text-sm text-muted-foreground">
              Vehicle purchase value: <span className="font-medium text-foreground">${purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {breakEvenStatus && (
              <div className={`text-sm mt-1 ${breakEvenStatus.type === 'profit' ? 'text-green-600' : 'text-amber-600'}`}>
                {breakEvenStatus.type === 'profit' 
                  ? <>Profit: <span className="font-semibold">${breakEvenStatus.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></>
                  : <>Remaining for depreciation: <span className="font-semibold">${breakEvenStatus.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></>
                }
              </div>
            )}
          </CardContent>
        </Card>
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
          {record.type === 'income' ? '+' : '-'}${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(record.date), 'MMM dd, yyyy')}
        </div>
      </div>
    </div>
  );
}
