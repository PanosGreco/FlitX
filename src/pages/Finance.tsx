
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
import { usePageTitle } from "@/hooks/usePageTitle";

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
  const { t, language, isLanguageLoading } = useLanguage();
  const isBoats = isBoatBusiness();
  
  // Use the page title hook
  usePageTitle("finances");

  // Fetch financial records when component mounts or language changes
  useEffect(() => {
    fetchFinancialRecords();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('financial_records_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'financial_records' }, 
        (payload) => {
          console.log('Real-time update received in Finance.tsx:', payload);
          fetchFinancialRecords();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [language]);

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
          title: language === 'el' ? "Σφάλμα" : "Error",
          description: language === 'el' 
            ? "Αποτυχία φόρτωσης οικονομικών εγγραφών" 
            : "Failed to fetch financial records",
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
          title: language === 'el' ? "Σφάλμα" : "Error",
          description: language === 'el'
            ? "Πρέπει να είστε συνδεδεμένοι για να προσθέσετε οικονομικές εγγραφές"
            : "You must be logged in to add financial records",
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
        description: notes || `${recordType === "income" ? 
          (language === 'el' ? "Έσοδο" : "Income") : 
          (language === 'el' ? "Έξοδο" : "Expense")} record`,
      };
      
      const { error } = await supabase
        .from('financial_records')
        .insert([newRecord]);
      
      if (error) {
        console.error("Error adding financial record:", error);
        toast({
          title: language === 'el' ? "Σφάλμα" : "Error",
          description: language === 'el'
            ? "Αποτυχία προσθήκης οικονομικής εγγραφής"
            : "Failed to add financial record",
          variant: "destructive",
        });
      } else {
        toast({
          title: language === 'el' ? "Επιτυχία" : "Record Added",
          description: language === 'el'
            ? `Προστέθηκε νέα εγγραφή ${recordType === "income" ? "εσόδων" : "εξόδων"}`
            : `New ${recordType} record has been added`,
        });
        
        // Close the dialog
        setIsAddFinanceOpen(false);
      }
    } catch (error) {
      console.error("Exception adding financial record:", error);
      toast({
        title: language === 'el' ? "Σφάλμα" : "Error",
        description: language === 'el'
          ? "Προέκυψε ένα απρόσμενο σφάλμα"
          : "An unexpected error occurred",
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
              <DialogTitle>{t.addTransaction}</DialogTitle>
              <DialogDescription>
                {t.enterTransactionDetails}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitFinanceRecord} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recordType">{t.transactionType}</Label>
                <Select value={recordType} onValueChange={setRecordType} disabled={isLanguageLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t.income}</SelectItem>
                    <SelectItem value="expense">{t.expense}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {recordType === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="expenseType">{t.category}</Label>
                  <Select value={expenseCategory} onValueChange={setExpenseCategory} disabled={isLanguageLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {isBoats ? (
                          <>
                            <SelectItem value="fuel">{t.fuel}</SelectItem>
                            <SelectItem value="maintenance">{t.boatMaintenance}</SelectItem>
                            <SelectItem value="cleaning">{t.cleaning}</SelectItem>
                            <SelectItem value="docking">{t.dockingFees}</SelectItem>
                            <SelectItem value="licensing">{t.licensing}</SelectItem>
                            <SelectItem value="salary">{t.employeeSalaries}</SelectItem>
                            <SelectItem value="other">{t.other}</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="fuel">{t.fuel}</SelectItem>
                            <SelectItem value="maintenance">{t.vehicleMaintenance}</SelectItem>
                            <SelectItem value="carwash">{t.carWash}</SelectItem>
                            <SelectItem value="insurance">{t.insurance}</SelectItem>
                            <SelectItem value="tax">{t.taxesFees}</SelectItem>
                            <SelectItem value="salary">{t.employeeSalaries}</SelectItem>
                            <SelectItem value="other">{t.other}</SelectItem>
                          </>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="amount">{t.amount} ({language === 'el' ? '€' : '$'})</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="e.g. 250.00"
                  min={0}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLanguageLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">{t.date}</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={isLanguageLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">{t.notes}</Label>
                <Textarea 
                  id="notes" 
                  placeholder={language === 'el' 
                    ? 'Προσθέστε τυχόν πρόσθετες λεπτομέρειες σχετικά με αυτή τη συναλλαγή' 
                    : 'Add any additional details about this transaction'}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isLanguageLoading}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddFinanceOpen(false)}
                  disabled={isLanguageLoading}
                >
                  {t.cancel}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting || isLanguageLoading}
                >
                  {isSubmitting ? t.adding : t.addRecord}
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
