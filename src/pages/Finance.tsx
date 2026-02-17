
import { useState, useEffect, useMemo } from "react";
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
import { getMaintenanceTypeOptions, getMaintenanceTypeLabel } from "@/constants/maintenanceTypes";

const Finance = () => {
  const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordType, setRecordType] = useState("income");
  const [expenseCategory, setExpenseCategory] = useState("fuel");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [incomeSourceType, setIncomeSourceType] = useState("walk_in");
  const [incomeSourceSpecification, setIncomeSourceSpecification] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vehicles, setVehicles] = useState<Array<{id: string; make: string; model: string; year: number; fuel_type?: string}>>([]);
  const [financialRecords, setFinancialRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userIncomeCategories, setUserIncomeCategories] = useState<string[]>([]);
  const [userExpenseCategories, setUserExpenseCategories] = useState<string[]>([]);
  const { toast } = useToast();
  const { t, language, isLanguageLoading } = useLanguage();
  const isBoats = isBoatBusiness();
  
  // Use the page title hook
  usePageTitle("finances");

  // Fetch financial records and vehicles when component mounts
  useEffect(() => {
    fetchFinancialRecords();
    fetchVehicles();
    fetchUserCategories();
    
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

  const fetchVehicles = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, fuel_type')
        .order('make');

      if (!error && data) {
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchUserCategories = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      // Fetch user-created income categories (from 'other' with specification, manual source)
      const { data: incomeData } = await supabase
        .from('financial_records')
        .select('income_source_specification')
        .eq('income_source_type', 'other')
        .eq('source_section', 'manual')
        .eq('type', 'income')
        .not('income_source_specification', 'is', null);

      if (incomeData) {
        const unique = [...new Set(
          incomeData
            .map(r => r.income_source_specification?.trim())
            .filter(Boolean)
        )] as string[];
        setUserIncomeCategories(unique);
      }

      // Fetch user-created expense categories (from 'other' with subcategory)
      const { data: expenseData } = await supabase
        .from('financial_records')
        .select('expense_subcategory')
        .eq('category', 'other')
        .eq('type', 'expense')
        .eq('source_section', 'manual')
        .not('expense_subcategory', 'is', null);

      if (expenseData) {
        const unique = [...new Set(
          expenseData
            .map(r => r.expense_subcategory?.trim())
            .filter(Boolean)
        )] as string[];
        setUserExpenseCategories(unique);
      }
    } catch (error) {
      console.error("Error fetching user categories:", error);
    }
  };
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
        .order('created_at', { ascending: false });

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
    setExpenseSubcategory("");
    setIncomeSourceType("walk_in");
    setIncomeSourceSpecification("");
    setAmount("");
    setDate(new Date().toISOString().substring(0, 10));
    setNotes("");
    setSelectedVehicleId("");
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
      
      const newRecord: {
        user_id: string;
        type: 'income' | 'expense';
        category: string;
        amount: number;
        date: string;
        description: string;
        vehicle_id?: string;
        vehicle_fuel_type?: string;
        vehicle_year?: number;
        income_source_type?: string;
        income_source_specification?: string;
        expense_subcategory?: string;
        source_section: string;
      } = {
        user_id: session.session.user.id,
        type: recordType as 'income' | 'expense',
        category: recordType === "income" ? "sales" : expenseCategory,
        amount: parseFloat(amount),
        date: date,
        description: notes || `${recordType === "income" ? 
          (language === 'el' ? "Έσοδο" : "Income") : 
          (language === 'el' ? "Έξοδο" : "Expense")} record`,
        source_section: 'manual',
      };
      
      // Add income source tracking
      if (recordType === "income") {
        newRecord.income_source_type = incomeSourceType;
        if (incomeSourceType === 'collaboration' || incomeSourceType === 'other') {
          newRecord.income_source_specification = incomeSourceSpecification;
        }
      }
      
      // Add expense subcategory
      if (recordType === "expense") {
        if (expenseCategory === 'maintenance' || expenseCategory === 'other' || expenseCategory === 'marketing') {
          newRecord.expense_subcategory = expenseSubcategory;
        }
      }
      
      // Link to vehicle if selected and auto-populate vehicle data
      if (selectedVehicleId) {
        newRecord.vehicle_id = selectedVehicleId;
        // Auto-populate vehicle fuel type and year
        const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
        if (selectedVehicle) {
          newRecord.vehicle_fuel_type = selectedVehicle.fuel_type || 'petrol';
          newRecord.vehicle_year = selectedVehicle.year;
        }
      }
      
      const { data: insertedRecord, error } = await supabase
        .from('financial_records')
        .insert([newRecord])
        .select()
        .single();
      
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
        // BI-DIRECTIONAL SYNC: If this is a maintenance expense with a vehicle, 
        // also create a vehicle_maintenance record
        if (recordType === "expense" && expenseCategory === 'maintenance' && selectedVehicleId && expenseSubcategory) {
          // expenseSubcategory is now directly a maintenance type key (e.g., 'oil_change', 'brakes')
          const { error: maintenanceError } = await supabase
            .from('vehicle_maintenance')
            .insert({
              user_id: session.session.user.id,
              vehicle_id: selectedVehicleId,
              type: expenseSubcategory,
              date: date,
              cost: parseFloat(amount),
              description: notes || getMaintenanceTypeLabel(expenseSubcategory, language)
            });

          if (maintenanceError) {
            console.error("Error creating vehicle maintenance record:", maintenanceError);
            // Don't fail the whole operation, just log the error
          }
        }

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
          onRecordDeleted={fetchFinancialRecords}
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
              
              {/* Income Source Type - for income records */}
              {recordType === "income" && (
                <div className="space-y-2">
                  <Label htmlFor="incomeSource">{language === 'el' ? 'Πηγή Εσόδου' : 'Income Source'}</Label>
                  <Select value={incomeSourceType} onValueChange={(val) => {
                    // If selecting a user-created category, auto-set other + specification
                    if (val.startsWith('__custom__:')) {
                      const spec = val.replace('__custom__:', '');
                      setIncomeSourceType('other');
                      setIncomeSourceSpecification(spec);
                    } else {
                      setIncomeSourceType(val);
                      if (val !== 'collaboration' && val !== 'other') {
                        setIncomeSourceSpecification('');
                      }
                    }
                  }} disabled={isLanguageLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε πηγή...' : 'Select source...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">{language === 'el' ? 'Απευθείας Κράτηση' : 'Direct Booking'}</SelectItem>
                      <SelectItem value="collaboration">{language === 'el' ? 'Συνεργασία' : 'Collaboration'}</SelectItem>
                      {userIncomeCategories.map((cat) => (
                        <SelectItem key={cat} value={`__custom__:${cat}`}>{cat}</SelectItem>
                      ))}
                      <SelectItem value="other">{language === 'el' ? 'Άλλο' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Income Source Specification - for collaboration/other */}
              {recordType === "income" && (incomeSourceType === 'collaboration' || incomeSourceType === 'other') && (
                <div className="space-y-2">
                  <Label htmlFor="incomeSpec">
                    {language === 'el' ? 'Προσδιορισμός Πηγής' : 'Source Specification'} *
                  </Label>
                  <Input 
                    id="incomeSpec"
                    placeholder={incomeSourceType === 'collaboration' 
                      ? (language === 'el' ? 'π.χ. Hotel Blue Bay' : 'e.g. Hotel Blue Bay')
                      : (language === 'el' ? 'Περιγράψτε την πηγή...' : 'Describe the source...')}
                    value={incomeSourceSpecification}
                    onChange={(e) => setIncomeSourceSpecification(e.target.value)}
                    required
                    disabled={isLanguageLoading}
                  />
                </div>
              )}

              {recordType === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="expenseType">{t.category}</Label>
                  <Select value={expenseCategory} onValueChange={(val) => {
                    // If selecting a user-created expense category
                    if (val.startsWith('__custom_exp__:')) {
                      const spec = val.replace('__custom_exp__:', '');
                      setExpenseCategory('other');
                      setExpenseSubcategory(spec);
                    } else {
                      setExpenseCategory(val);
                      if (val !== 'maintenance' && val !== 'other' && val !== 'marketing') {
                        setExpenseSubcategory('');
                      }
                    }
                  }} disabled={isLanguageLoading}>
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
                            {userExpenseCategories.map((cat) => (
                              <SelectItem key={cat} value={`__custom_exp__:${cat}`}>{cat}</SelectItem>
                            ))}
                            <SelectItem value="other">{t.other}</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="fuel">{t.fuel}</SelectItem>
                            <SelectItem value="maintenance">{t.vehicleMaintenance}</SelectItem>
                            <SelectItem value="vehicle_parts">{language === 'el' ? 'Ανταλλακτικά Οχήματος' : 'Vehicle Parts'}</SelectItem>
                            <SelectItem value="carwash">{t.carWash}</SelectItem>
                            <SelectItem value="insurance">{t.insurance}</SelectItem>
                            <SelectItem value="tax">{t.taxesFees}</SelectItem>
                            <SelectItem value="salary">{t.employeeSalaries}</SelectItem>
                            <SelectItem value="marketing">{language === 'el' ? 'Μάρκετινγκ' : 'Marketing'}</SelectItem>
                            {userExpenseCategories.map((cat) => (
                              <SelectItem key={cat} value={`__custom_exp__:${cat}`}>{cat}</SelectItem>
                            ))}
                            <SelectItem value="other">{t.other}</SelectItem>
                          </>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Expense Subcategory - dropdown for maintenance, free-text for other */}
              {recordType === "expense" && expenseCategory === 'maintenance' && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceType">
                    {language === 'el' ? 'Τύπος Συντήρησης' : 'Maintenance Type'} *
                  </Label>
                  <Select value={expenseSubcategory} onValueChange={setExpenseSubcategory} disabled={isLanguageLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο...' : 'Select type...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {getMaintenanceTypeOptions(language).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Free-text subcategory for 'other' expense category (required) */}
              {recordType === "expense" && expenseCategory === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="expenseSubcat">
                    {language === 'el' ? 'Προσδιορισμός' : 'Specification'} *
                  </Label>
                  <Input 
                    id="expenseSubcat"
                    placeholder={language === 'el' ? 'Περιγράψτε το έξοδο...' : 'Describe the expense...'}
                    value={expenseSubcategory}
                    onChange={(e) => setExpenseSubcategory(e.target.value)}
                    required
                    disabled={isLanguageLoading}
                  />
                </div>
              )}

              {/* Optional specification for 'marketing' expense category */}
              {recordType === "expense" && expenseCategory === 'marketing' && (
                <div className="space-y-2">
                  <Label htmlFor="expenseSubcat">
                    {language === 'el' ? 'Προσδιορισμός (προαιρετικό)' : 'Specification (optional)'}
                  </Label>
                  <Input 
                    id="expenseSubcat"
                    placeholder={language === 'el' ? 'π.χ. Social Media, Google Ads...' : 'e.g. Social Media, Google Ads...'}
                    value={expenseSubcategory}
                    onChange={(e) => setExpenseSubcategory(e.target.value)}
                    disabled={isLanguageLoading}
                  />
                </div>
              )}
              
              {/* Vehicle Selector - Optional link to vehicle */}
              <div className="space-y-2">
                <Label htmlFor="vehicle">
                  {language === 'el' ? 'Σύνδεση με Όχημα' : 'Link to Vehicle'} 
                  <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                </Label>
                <Select value={selectedVehicleId || "none"} onValueChange={(val) => setSelectedVehicleId(val === "none" ? "" : val)} disabled={isLanguageLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Επιλέξτε όχημα...' : 'Select vehicle...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {language === 'el' ? 'Κανένα όχημα' : 'No vehicle (global)'}
                    </SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {language === 'el' 
                    ? 'Αν επιλέξετε όχημα, αυτή η εγγραφή θα εμφανίζεται στα οικονομικά του οχήματος' 
                    : 'If selected, this record will appear in the vehicle\'s finance section'}
                </p>
              </div>
              
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
