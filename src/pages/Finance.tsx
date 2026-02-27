
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

const Finance = () => {
  const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordType, setRecordType] = useState("income");
  const [expenseCategory, setExpenseCategory] = useState("fuel");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [maintenanceIsCustom, setMaintenanceIsCustom] = useState(false);
  const [customMaintenanceType, setCustomMaintenanceType] = useState("");
  const [vehiclePartsIsCustom, setVehiclePartsIsCustom] = useState(false);
  const [customVehiclePart, setCustomVehiclePart] = useState("");
  const [incomeSourceType, setIncomeSourceType] = useState("walk_in");
  const [incomeSourceSpecification, setIncomeSourceSpecification] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vehicles, setVehicles] = useState<Array<{id: string; make: string; model: string; year: number; fuel_type?: string}>>([]);
  const [financialRecords, setFinancialRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userIncomeCategories, refetchCategories: refetchIncomeCategories } = useIncomeCategories();
  const { userMaintenanceCategories, refetchMaintenanceCategories } = useMaintenanceCategories();
  const { userExpenseCategories, refetchExpenseCategories } = useExpenseCategories();
  const { vehiclePartsSubcategories, refetchVehiclePartsCategories } = useVehiclePartsCategories();
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
        .select('id, make, model, year, fuel_type')
        .order('make');

      if (!error && data) {
        setVehicles(data);
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
    setExpenseCategory("fuel");
    setExpenseSubcategory("");
    setMaintenanceIsCustom(false);
    setCustomMaintenanceType("");
    setVehiclePartsIsCustom(false);
    setCustomVehiclePart("");
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
        if (expenseCategory === 'maintenance' || expenseCategory === 'other' || expenseCategory === 'marketing' || expenseCategory === 'vehicle_parts') {
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
                  <Label htmlFor="expenseType">{t.category}</Label>
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
                      if (val !== 'maintenance' && val !== 'other' && val !== 'marketing' && val !== 'vehicle_parts') {
                        setExpenseSubcategory('');
                      }
                      if (val !== 'vehicle_parts') {
                        setVehiclePartsIsCustom(false);
                        setCustomVehiclePart('');
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
                          {language === 'el' ? 'Άλλο' : 'Other'}
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
    </AppLayout>
  );
};

export default Finance;
