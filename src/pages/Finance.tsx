
import { useState, useEffect, useMemo } from "react";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { IncomeSourceSelector } from "@/components/finances/IncomeSourceSelector";
import { AppLayout } from "@/components/layout/AppLayout";
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
  SelectLabel,
  SelectSeparator,
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
import { useMaintenanceCategories } from "@/hooks/useMaintenanceCategories";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useVehiclePartsCategories } from "@/hooks/useVehiclePartsCategories";
import { useTaxesFeesCategories } from "@/hooks/useTaxesFeesCategories";
import { useVatSettings } from "@/hooks/useVatSettings";
import { VatControl } from "@/components/finances/VatControl";

const Finance = () => {
  const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordType, setRecordType] = useState("income");
  const [isVehicleSaleMode, setIsVehicleSaleMode] = useState(false);
  const [saleVehicleId, setSaleVehicleId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().substring(0, 10));
  const [expenseCategory, setExpenseCategory] = useState("fuel");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [maintenanceIsCustom, setMaintenanceIsCustom] = useState(false);
  const [customMaintenanceType, setCustomMaintenanceType] = useState("");
  const [vehiclePartsIsCustom, setVehiclePartsIsCustom] = useState(false);
  const [customVehiclePart, setCustomVehiclePart] = useState("");
  const [taxIsCustom, setTaxIsCustom] = useState(false);
  const [customTaxType, setCustomTaxType] = useState("");
  const [incomeSourceType, setIncomeSourceType] = useState("walk_in");
  const [incomeSourceSpecification, setIncomeSourceSpecification] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vatEnabled, setVatEnabled] = useState(false);
  const { vatRate, setVatRate } = useVatSettings();
  const [vehicles, setVehicles] = useState<Array<{id: string; make: string; model: string; year: number; fuel_type?: string}>>([]);
  const [financialRecords, setFinancialRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userIncomeCategories, refetchCategories: refetchIncomeCategories } = useIncomeCategories();
  const { userMaintenanceCategories, refetchMaintenanceCategories } = useMaintenanceCategories();
  const { userExpenseCategories, refetchExpenseCategories } = useExpenseCategories();
  const { vehiclePartsSubcategories, refetchVehiclePartsCategories } = useVehiclePartsCategories();
  const { taxSubcategories, refetchTaxCategories } = useTaxesFeesCategories();
  const { toast } = useToast();
  const { t, language, isLanguageLoading } = useLanguage();
  const isBoats = isBoatBusiness();
  
  // Use the page title hook
  usePageTitle("finances");

  // Fetch financial records and vehicles when component mounts
  useEffect(() => {
    fetchFinancialRecords();
    fetchVehicles();
    
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
        .select('id, make, model, year, fuel_type, is_sold')
        .order('make');

      if (!error && data) {
        setVehicles(data as any);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
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
    setIsVehicleSaleMode(false);
    setSaleVehicleId("");
    setSalePrice("");
    setSaleDate(new Date().toISOString().substring(0, 10));
    setExpenseCategory("fuel");
    setExpenseSubcategory("");
    setMaintenanceIsCustom(false);
    setCustomMaintenanceType("");
    setVehiclePartsIsCustom(false);
    setCustomVehiclePart("");
    setTaxIsCustom(false);
    setCustomTaxType("");
    setIncomeSourceType("walk_in");
    setIncomeSourceSpecification("");
    setAmount("");
    setDate(new Date().toISOString().substring(0, 10));
    setNotes("");
    setSelectedVehicleId("");
    setVatEnabled(false);
  };

  // Get active (non-sold) vehicles for sale dropdown
  const activeVehicles = useMemo(() => vehicles.filter(v => {
    // Check if the vehicle has is_sold info - we need to fetch full vehicle data
    // For now, filter by checking the vehicles array
    return true; // Will be refined after fetch includes is_sold
  }), [vehicles]);

  const handleSubmitVehicleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleVehicleId || !salePrice) return;
    
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setIsSubmitting(false);
        return;
      }

      // Fetch full vehicle data for depreciation calculation
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', saleVehicleId)
        .single();

      if (!vehicleData) {
        toast({ title: "Error", description: "Vehicle not found", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      // Import depreciation utils inline
      const { calculateUsageDepreciation } = await import("@/utils/depreciationUtils");

      // Calculate remaining value for depreciation
      const purchasePrice = vehicleData.purchase_price ? Number(vehicleData.purchase_price) : 0;
      const netIncome = 0; // We need vehicle-specific income to calculate remaining
      
      // Fetch vehicle financial records to calculate net income
      const { data: vehicleRecords } = await supabase
        .from('financial_records')
        .select('type, amount')
        .eq('vehicle_id', saleVehicleId);
      
      const vehicleIncome = (vehicleRecords || []).filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
      const vehicleExpenses = (vehicleRecords || []).filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
      const vehicleNetIncome = vehicleIncome - vehicleExpenses;
      
      // Remaining for depreciation = max(0, purchasePrice - netIncome)
      const remainingForDepreciation = purchasePrice > 0 ? Math.max(0, purchasePrice - vehicleNetIncome) : 0;
      
      const salePriceNum = parseFloat(salePrice);
      const profitOrLoss = salePriceNum - remainingForDepreciation;
      const isProfit = profitOrLoss >= 0;

      // Create financial record for the sale
      const saleRecord: any = {
        user_id: session.session.user.id,
        type: isProfit ? 'income' : 'expense',
        category: 'vehicle_sale',
        amount: Math.abs(profitOrLoss),
        date: saleDate,
        description: isProfit 
          ? `Profit from Vehicle Sale - ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`
          : `Loss from Vehicle Sale - ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`,
        vehicle_id: saleVehicleId,
        source_section: 'vehicle_sale',
        income_source_type: 'vehicle_sale',
        income_source_specification: `Sale Price: €${salePriceNum} | Remaining: €${remainingForDepreciation.toFixed(2)}`,
      };

      const { error: recordError } = await supabase
        .from('financial_records')
        .insert([saleRecord]);

      if (recordError) {
        console.error("Error creating sale record:", recordError);
        toast({ title: "Error", description: "Failed to create sale record", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      // Mark vehicle as sold
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          is_sold: true, 
          sale_price: salePriceNum, 
          sale_date: saleDate 
        })
        .eq('id', saleVehicleId);

      if (vehicleError) {
        console.error("Error marking vehicle as sold:", vehicleError);
        toast({ title: "Error", description: "Failed to update vehicle", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: language === 'el' ? 'Πώληση Καταγράφηκε' : 'Sale Recorded',
        description: isProfit
          ? `${language === 'el' ? 'Κέρδος' : 'Profit'}: +€${Math.abs(profitOrLoss).toFixed(2)}`
          : `${language === 'el' ? 'Ζημία' : 'Loss'}: -€${Math.abs(profitOrLoss).toFixed(2)}`,
      });

      setIsAddFinanceOpen(false);
      fetchFinancialRecords();
      fetchVehicles();
    } catch (error) {
      console.error("Error in vehicle sale:", error);
      toast({ title: "Error", description: "An error occurred", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
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
        if (incomeSourceType === 'additional_cost' && incomeSourceSpecification) {
          // Save as 'additional' category with proper description for aggregation
          newRecord.category = 'additional';
          newRecord.description = `${incomeSourceSpecification} (Additional Cost) - Manual`;
          newRecord.income_source_type = 'other';
          newRecord.income_source_specification = incomeSourceSpecification;
        } else if (incomeSourceType === 'insurance' && incomeSourceSpecification) {
          // Save as 'additional' category with insurance type description for aggregation
          newRecord.category = 'additional';
          newRecord.description = `Insurance - ${incomeSourceSpecification} (Additional Cost) - Manual`;
          newRecord.income_source_type = 'other';
          newRecord.income_source_specification = `Insurance - ${incomeSourceSpecification}`;
        } else {
          newRecord.income_source_type = incomeSourceType;
          if (incomeSourceType === 'collaboration' || incomeSourceType === 'other') {
            newRecord.income_source_specification = incomeSourceSpecification;
          }
        }
      }
      
      // Add expense subcategory
      if (recordType === "expense") {
        if (expenseCategory === 'maintenance' || expenseCategory === 'other' || expenseCategory === 'marketing' || expenseCategory === 'vehicle_parts' || expenseCategory === 'tax') {
          newRecord.expense_subcategory = expenseSubcategory || null;
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

        // VAT auto-expense: create a separate tax expense when VAT is enabled on income
        if (recordType === "income" && vatEnabled && vatRate > 0) {
          const vatAmount = parseFloat(amount) * (vatRate / 100);
          if (vatAmount > 0) {
            const { error: vatError } = await supabase
              .from('financial_records')
              .insert({
                user_id: session.session.user.id,
                type: 'expense' as const,
                category: 'tax',
                expense_subcategory: 'Income Tax',
                amount: vatAmount,
                date: date,
                description: `Income Tax (VAT ${vatRate}%) - auto`,
                source_section: 'vat_auto',
                vehicle_id: selectedVehicleId || null,
              });

            if (vatError) {
              console.error("Error creating VAT expense record:", vatError);
            }
          }
        }

        toast({
          title: language === 'el' ? "Επιτυχία" : "Record Added",
          description: language === 'el'
            ? `Προστέθηκε νέα εγγραφή ${recordType === "income" ? "εσόδων" : "εξόδων"}`
            : `New ${recordType} record has been added`,
        });
        
        // Close the dialog and refresh categories
        setIsAddFinanceOpen(false);
        refetchIncomeCategories();
        refetchMaintenanceCategories();
        refetchExpenseCategories();
        refetchVehiclePartsCategories();
        refetchTaxCategories();
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
    <AppLayout>
      <div className="w-full max-w-none px-4 lg:px-6 py-6">
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
              <DialogTitle>{isVehicleSaleMode 
                ? (language === 'el' ? 'Πώληση Οχήματος' : 'Vehicle Sale')
                : t('addTransaction')}</DialogTitle>
              <DialogDescription>
                {isVehicleSaleMode 
                  ? (language === 'el' ? 'Καταγράψτε πώληση οχήματος' : 'Record a vehicle sale')
                  : t('enterTransactionDetails')}
              </DialogDescription>
            </DialogHeader>
            
            {isVehicleSaleMode ? (
              <form onSubmit={handleSubmitVehicleSale} className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'el' ? 'Επιλέξτε Όχημα' : 'Select Vehicle'}</Label>
                  <Select value={saleVehicleId} onValueChange={setSaleVehicleId}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε όχημα...' : 'Select vehicle...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.filter(v => !(v as any).is_sold).map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'el' ? 'Τιμή Πώλησης (€)' : 'Sale Price (€)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="e.g. 15000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'el' ? 'Ημερομηνία Πώλησης' : 'Sale Date'}</Label>
                  <Input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsVehicleSaleMode(false)}>
                    {language === 'el' ? 'Πίσω' : 'Back'}
                  </Button>
                  <Button type="submit" className="bg-flitx-blue hover:bg-flitx-blue-600" disabled={isSubmitting || !saleVehicleId || !salePrice}>
                    {isSubmitting 
                      ? (language === 'el' ? 'Καταγραφή...' : 'Recording...') 
                      : (language === 'el' ? 'Καταγραφή Πώλησης' : 'Record Sale')}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
            <form onSubmit={handleSubmitFinanceRecord} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recordType">{t('transactionType')}</Label>
                <Select value={recordType} onValueChange={(val) => {
                  if (val === 'vehicle_sale') {
                    setIsVehicleSaleMode(true);
                  } else {
                    setRecordType(val);
                  }
                }} disabled={isLanguageLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t('income')}</SelectItem>
                    <SelectItem value="expense">{t('expense')}</SelectItem>
                    <SelectSeparator />
                    <SelectItem value="vehicle_sale" className="font-medium">
                      {language === 'el' ? 'Πώληση Οχήματος' : 'Vehicle Sale'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {recordType === "income" && (
                <div className="space-y-2">
                  <IncomeSourceSelector
                    incomeSourceType={incomeSourceType}
                    incomeSourceSpecification={incomeSourceSpecification}
                    onSourceChange={(type, spec) => {
                      setIncomeSourceType(type);
                      setIncomeSourceSpecification(spec);
                    }}
                    disabled={isLanguageLoading}
                    labelText={language === 'el' ? 'Πηγή Εσόδου' : 'Income Source'}
                  />
                </div>
              )}

              {recordType === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="expenseType">{t('category')}</Label>
                  <Select value={expenseCategory} onValueChange={(val) => {
                    // If selecting a user-created expense category
                    if (val.startsWith('__custom_exp__:')) {
                      const spec = val.replace('__custom_exp__:', '');
                      setExpenseCategory('other');
                      setExpenseSubcategory(spec);
                      setVehiclePartsIsCustom(false);
                      setCustomVehiclePart('');
                    } else {
                      setExpenseCategory(val);
                      if (val !== 'maintenance' && val !== 'other' && val !== 'marketing' && val !== 'vehicle_parts' && val !== 'tax') {
                        setExpenseSubcategory('');
                      }
                      if (val !== 'vehicle_parts') {
                        setVehiclePartsIsCustom(false);
                        setCustomVehiclePart('');
                      }
                      if (val !== 'tax') {
                        setTaxIsCustom(false);
                        setCustomTaxType('');
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
                            <SelectItem value="other" className="bg-muted/50 rounded-sm">
                              {t.other}
                            </SelectItem>
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
                            <SelectItem value="other" className="bg-muted/50 rounded-sm">
                              {t.other}
                            </SelectItem>
                          </>
                        )}
                      </SelectGroup>
                      {userExpenseCategories.length > 0 && (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground font-medium">
                              {language === 'el' ? 'Προσαρμοσμένες Κατηγορίες' : 'Custom Categories'}
                            </SelectLabel>
                            {userExpenseCategories.map((cat) => (
                              <SelectItem key={cat} value={`__custom_exp__:${cat}`}>{cat}</SelectItem>
                            ))}
                          </SelectGroup>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Expense Subcategory - dropdown for maintenance */}
              {recordType === "expense" && expenseCategory === 'maintenance' && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceType">
                    {language === 'el' ? 'Τύπος Συντήρησης' : 'Maintenance Type'} *
                  </Label>
                  <Select value={maintenanceIsCustom ? 'other' : expenseSubcategory} onValueChange={(val) => {
                    if (val.startsWith('__custom_maint__:')) {
                      const custom = val.replace('__custom_maint__:', '');
                      setMaintenanceIsCustom(false);
                      setCustomMaintenanceType('');
                      setExpenseSubcategory(custom);
                    } else if (val === 'other') {
                      setMaintenanceIsCustom(true);
                      setExpenseSubcategory('');
                      setCustomMaintenanceType('');
                    } else {
                      setMaintenanceIsCustom(false);
                      setCustomMaintenanceType('');
                      setExpenseSubcategory(val);
                    }
                  }} disabled={isLanguageLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο...' : 'Select type...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {getMaintenanceTypeOptions(language).filter(o => o.value !== 'other').map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="other" className="bg-muted/50 rounded-sm">
                          {language === 'el' ? '+ Προσθήκη Νέου' : '+ Add New'}
                        </SelectItem>
                      </SelectGroup>
                      {userMaintenanceCategories.length > 0 && (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground font-medium">
                              {language === 'el' ? 'Προσαρμοσμένες Κατηγορίες' : 'Custom Categories'}
                            </SelectLabel>
                            {userMaintenanceCategories.map(cat => (
                              <SelectItem key={cat} value={`__custom_maint__:${cat}`}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Free-text input when "Other" maintenance type is selected */}
              {recordType === "expense" && expenseCategory === 'maintenance' && maintenanceIsCustom && (
                <div className="space-y-2">
                  <Label>
                    {language === 'el' ? 'Νέα Κατηγορία Συντήρησης' : 'New Maintenance Category'} *
                  </Label>
                  <Input
                    placeholder={language === 'el' ? 'Εισάγετε νέα κατηγορία...' : 'Enter new category...'}
                    value={customMaintenanceType}
                    onChange={(e) => {
                      setCustomMaintenanceType(e.target.value);
                      setExpenseSubcategory(e.target.value);
                    }}
                    required
                    disabled={isLanguageLoading}
                  />
                </div>
              )}

              {/* Vehicle Parts - optional subcategory */}
              {recordType === "expense" && expenseCategory === 'vehicle_parts' && (
                <div className="space-y-2">
                  <Label>
                    {language === 'el' ? 'Τύπος Ανταλλακτικού (προαιρετικό)' : 'Part Type (optional)'}
                  </Label>
                  <Select 
                    value={vehiclePartsIsCustom ? '__new__' : (expenseSubcategory || '__none__')} 
                    onValueChange={(val) => {
                      if (val === '__none__') {
                        setVehiclePartsIsCustom(false);
                        setCustomVehiclePart('');
                        setExpenseSubcategory('');
                      } else if (val === '__new__') {
                        setVehiclePartsIsCustom(true);
                        setCustomVehiclePart('');
                        setExpenseSubcategory('');
                      } else if (val.startsWith('__vp__:')) {
                        const part = val.replace('__vp__:', '');
                        setVehiclePartsIsCustom(false);
                        setCustomVehiclePart('');
                        setExpenseSubcategory(part);
                      } else {
                        setVehiclePartsIsCustom(false);
                        setExpenseSubcategory(val);
                      }
                    }} 
                    disabled={isLanguageLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο...' : 'Select type...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="__none__">
                          {language === 'el' ? 'Χωρίς προδιαγραφή' : 'No specification'}
                        </SelectItem>
                        <SelectItem value="__new__" className="bg-muted/50 rounded-sm">
                          {language === 'el' ? 'Προσθήκη νέου...' : 'Add new...'}
                        </SelectItem>
                      </SelectGroup>
                      {vehiclePartsSubcategories.length > 0 && (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground font-medium">
                              {language === 'el' ? 'Αποθηκευμένα Ανταλλακτικά' : 'Saved Parts'}
                            </SelectLabel>
                            {vehiclePartsSubcategories.map(part => (
                              <SelectItem key={part} value={`__vp__:${part}`}>
                                {part}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Free-text input for new vehicle part */}
              {recordType === "expense" && expenseCategory === 'vehicle_parts' && vehiclePartsIsCustom && (
                <div className="space-y-2">
                  <Label>
                    {language === 'el' ? 'Νέο Ανταλλακτικό' : 'New Part Type'}
                  </Label>
                  <Input
                    placeholder={language === 'el' ? 'π.χ. Μπαταρία, Ελαστικά...' : 'e.g. Battery, Tires...'}
                    value={customVehiclePart}
                    onChange={(e) => {
                      setCustomVehiclePart(e.target.value);
                      setExpenseSubcategory(e.target.value);
                    }}
                    disabled={isLanguageLoading}
                  />
                </div>
              )}

              {/* Free-text subcategory for 'other' expense category (required) */}
              {recordType === "expense" && expenseCategory === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="expenseSubcat">
                    {language === 'el' ? 'Όνομα Νέας Κατηγορίας' : 'New Category Name'} *
                  </Label>
                  <Input 
                    id="expenseSubcat"
                    placeholder={language === 'el' ? 'Εισάγετε όνομα κατηγορίας...' : 'Enter category name...'}
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

              {/* Taxes & Fees subcategory selector */}
              {recordType === "expense" && expenseCategory === 'tax' && (
                <div className="space-y-2">
                  <Label>
                    {language === 'el' ? 'Τύπος Φόρου/Τέλους' : 'Tax/Fee Type'}
                  </Label>
                  <Select 
                    value={taxIsCustom ? '__new_tax__' : (expenseSubcategory || '')} 
                    onValueChange={(val) => {
                      if (val === '__new_tax__') {
                        setTaxIsCustom(true);
                        setCustomTaxType('');
                        setExpenseSubcategory('');
                      } else if (val.startsWith('__tax__:')) {
                        const tax = val.replace('__tax__:', '');
                        setTaxIsCustom(false);
                        setCustomTaxType('');
                        setExpenseSubcategory(tax);
                      } else {
                        setTaxIsCustom(false);
                        setExpenseSubcategory(val);
                      }
                    }} 
                    disabled={isLanguageLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο...' : 'Select type...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {taxSubcategories.map(tax => (
                          <SelectItem key={tax} value={`__tax__:${tax}`}>
                            {tax}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem value="__new_tax__" className="bg-muted/50 rounded-sm">
                          {language === 'el' ? '+ Προσθήκη Νέου' : '+ Add New'}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Free-text input for new tax/fee type */}
              {recordType === "expense" && expenseCategory === 'tax' && taxIsCustom && (
                <div className="space-y-2">
                  <Label>
                    {language === 'el' ? 'Νέος Τύπος Φόρου/Τέλους' : 'New Tax/Fee Type'} *
                  </Label>
                  <Input
                    placeholder={language === 'el' ? 'π.χ. Δημοτικός Φόρος, Τέλη Κυκλοφορίας...' : 'e.g. Municipal Tax, Road Tax...'}
                    value={customTaxType}
                    onChange={(e) => {
                      setCustomTaxType(e.target.value);
                      setExpenseSubcategory(e.target.value);
                    }}
                    required
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
                    {vehicles.filter(v => !(v as any).is_sold).map((vehicle) => (
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

              {/* VAT Control - only for income */}
              {recordType === "income" && (
                <VatControl
                  vatEnabled={vatEnabled}
                  onVatEnabledChange={setVatEnabled}
                  vatRate={vatRate}
                  onVatRateChange={setVatRate}
                />
              )}
              
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
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Finance;
