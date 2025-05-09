
import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { FinanceDashboard } from "@/components/finances/FinanceDashboard";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { isBoatBusiness } from "@/utils/businessTypeUtils";

const Finance = () => {
  const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordType, setRecordType] = useState("income");
  const [expenseCategory, setExpenseCategory] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState("");
  const [financialRecords, setFinancialRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();
  const isBoats = isBoatBusiness();

  // Fetch financial records when component mounts
  useEffect(() => {
    fetchFinancialRecords();
  }, []);

  const fetchFinancialRecords = async () => {
    try {
      setIsLoading(true);
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        console.log("No authenticated user");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error("Error fetching financial records:", error);
        toast({
          title: "Error",
          description: "Failed to fetch financial records",
          variant: "destructive",
        });
      } else {
        setFinancialRecords(data || []);
      }
    } catch (error) {
      console.error("Exception fetching financial records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddFinance = () => {
    setIsAddFinanceOpen(true);
    // Reset form fields
    setRecordType("income");
    setExpenseCategory("fuel");
    setAmount("");
    setDate(new Date().toISOString().substring(0, 10));
    setNotes("");
  };
  
  const handleSubmitFinanceRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        toast({
          title: "Error",
          description: "You must be logged in to add financial records",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const newRecord = {
        user_id: session.session.user.id,
        record_type: recordType,
        category: recordType === "income" ? "sales" : expenseCategory,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        description: notes || `${recordType === "income" ? "Income" : "Expense"} record`,
      };
      
      const { error } = await supabase
        .from('financial_records')
        .insert([newRecord]);
      
      if (error) {
        console.error("Error adding financial record:", error);
        toast({
          title: "Error",
          description: "Failed to add financial record",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Record Added",
          description: `New ${recordType} record has been added`,
        });
        
        // Refresh financial records
        fetchFinancialRecords();
        setIsAddFinanceOpen(false);
      }
    } catch (error) {
      console.error("Exception adding financial record:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <FinanceDashboard 
          onAddRecord={handleOpenAddFinance}
          financialRecords={financialRecords}
          isLoading={isLoading}
        />
        
        {/* Add Finance Record Dialog */}
        <Dialog open={isAddFinanceOpen} onOpenChange={setIsAddFinanceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Financial Record</DialogTitle>
              <DialogDescription>
                Enter the details for the new income or expense.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitFinanceRecord} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recordType">Record Type</Label>
                <Select value={recordType} onValueChange={setRecordType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {recordType === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="expenseType">Expense Category</Label>
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {isBoats ? (
                          <>
                            <SelectItem value="fuel">Fuel</SelectItem>
                            <SelectItem value="maintenance">Boat Maintenance</SelectItem>
                            <SelectItem value="cleaning">Cleaning</SelectItem>
                            <SelectItem value="docking">Docking Fees</SelectItem>
                            <SelectItem value="licensing">Licensing</SelectItem>
                            <SelectItem value="salary">Employee Salaries</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="fuel">Fuel</SelectItem>
                            <SelectItem value="maintenance">Vehicle Maintenance</SelectItem>
                            <SelectItem value="carwash">Car Wash</SelectItem>
                            <SelectItem value="insurance">Insurance</SelectItem>
                            <SelectItem value="tax">Taxes & Fees</SelectItem>
                            <SelectItem value="salary">Employee Salaries</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="e.g. 250.00"
                  min={0}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Add any additional details about this transaction"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddFinanceOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Record"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default Finance;
