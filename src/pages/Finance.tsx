
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
import { useMarketingCategories } from "@/hooks/useMarketingCategories";
import { useVatSettings } from "@/hooks/useVatSettings";
import { VatControl } from "@/components/finances/VatControl";
import { useTranslation } from "react-i18next";

const Finance = () => {
  const { t } = useTranslation(['finance', 'common']);
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
  const [marketingIsCustom, setMarketingIsCustom] = useState(false);
  const [customMarketingType, setCustomMarketingType] = useState("");
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
  const { language, isLanguageLoading } = useLanguage();
  const isBoats = isBoatBusiness();
  
  usePageTitle("finances");

  useEffect(() => {
    fetchFinancialRecords();
    fetchVehicles();
    
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
          title: t('finance:error'),
          description: t('finance:failedLoadRecords'),
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

  const activeVehicles = useMemo(() => vehicles.filter(v => {
    return true;
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

      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', saleVehicleId)
        .single();

      if (!vehicleData) {
        toast({ title: t('finance:error'), description: "Vehicle not found", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      

      const purchasePrice = vehicleData.purchase_price ? Number(vehicleData.purchase_price) : 0;
      
      const { data: vehicleRecords } = await supabase
        .from('financial_records')
        .select('type, amount')
        .eq('vehicle_id', saleVehicleId);
      
      const vehicleIncome = (vehicleRecords || []).filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
      const vehicleExpenses = (vehicleRecords || []).filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
      const vehicleNetIncome = vehicleIncome - vehicleExpenses;
      
      const remainingForDepreciation = purchasePrice > 0 ? Math.max(0, purchasePrice - vehicleNetIncome) : 0;
      
      const salePriceNum = parseFloat(salePrice);
      const profitOrLoss = salePriceNum - remainingForDepreciation;
      const isProfit = profitOrLoss >= 0;

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
        toast({ title: t('finance:error'), description: "Failed to create sale record", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

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
        toast({ title: t('finance:error'), description: "Failed to update vehicle", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: t('finance:saleRecorded'),
        description: isProfit
          ? `${t('finance:profit')}: +€${Math.abs(profitOrLoss).toFixed(2)}`
          : `${t('finance:lossLabel')}: -€${Math.abs(profitOrLoss).toFixed(2)}`,
      });

      setIsAddFinanceOpen(false);
      fetchFinancialRecords();
      fetchVehicles();
    } catch (error) {
      console.error("Error in vehicle sale:", error);
      toast({ title: t('finance:error'), description: t('finance:unexpectedError'), variant: "destructive" });
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
          title: t('finance:error'),
          description: t('finance:mustBeLoggedInFinance'),
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
        description: notes || `${recordType === "income" ? t('finance:incomeDefault') : t('finance:expenseDefault')} record`,
        source_section: 'manual',
      };
      
      if (recordType === "income") {
        if (incomeSourceType === 'additional_cost' && incomeSourceSpecification) {
          newRecord.category = 'additional';
          newRecord.description = `${incomeSourceSpecification} (Additional Cost) - Manual`;
          newRecord.income_source_type = 'other';
          newRecord.income_source_specification = incomeSourceSpecification;
        } else if (incomeSourceType === 'insurance' && incomeSourceSpecification) {
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
      
      if (recordType === "expense") {
        if (expenseCategory === 'maintenance' || expenseCategory === 'other' || expenseCategory === 'marketing' || expenseCategory === 'vehicle_parts' || expenseCategory === 'tax') {
          newRecord.expense_subcategory = expenseSubcategory || null;
        }
      }
      
      if (selectedVehicleId) {
        newRecord.vehicle_id = selectedVehicleId;
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
          title: t('finance:error'),
          description: t('finance:failedAddRecord'),
          variant: "destructive",
        });
      } else {
        if (recordType === "expense" && expenseCategory === 'maintenance' && selectedVehicleId && expenseSubcategory) {
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
          }
        }

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
          title: t('finance:recordAdded'),
          description: recordType === "income" ? t('finance:newIncomeAdded') : t('finance:newExpenseAdded'),
        });
        
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
        title: t('finance:error'),
        description: t('finance:unexpectedError'),
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
        
        <Dialog open={isAddFinanceOpen} onOpenChange={setIsAddFinanceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isVehicleSaleMode 
                ? t('finance:vehicleSale')
                : t('finance:addTransaction')}</DialogTitle>
              <DialogDescription>
                {isVehicleSaleMode 
                  ? t('finance:recordVehicleSale')
                  : t('finance:enterTransactionDetails')}
              </DialogDescription>
            </DialogHeader>
            
            {isVehicleSaleMode ? (
              <form onSubmit={handleSubmitVehicleSale} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('finance:selectVehicle')}</Label>
                  <Select value={saleVehicleId} onValueChange={setSaleVehicleId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('finance:selectVehiclePlaceholder')} />
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
                  <Label>{t('finance:salePrice')}</Label>
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
                  <Label>{t('finance:saleDate')}</Label>
                  <Input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsVehicleSaleMode(false)}>
                    {t('finance:back')}
                  </Button>
                  <Button type="submit" className="bg-flitx-blue hover:bg-flitx-blue-600" disabled={isSubmitting || !saleVehicleId || !salePrice}>
                    {isSubmitting ? t('finance:recording') : t('finance:recordSale')}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
            <form onSubmit={handleSubmitFinanceRecord} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recordType">{t('finance:transactionType')}</Label>
                <Select value={recordType} onValueChange={(val) => {
                  if (val === 'vehicle_sale') {
                    setIsVehicleSaleMode(true);
                  } else {
                    setRecordType(val);
                  }
                }} disabled={isLanguageLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common:selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t('finance:income')}</SelectItem>
                    <SelectItem value="expense">{t('finance:expense')}</SelectItem>
                    <SelectSeparator />
                    <SelectItem value="vehicle_sale" className="font-medium">
                      {t('finance:vehicleSale')}
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
                    labelText={t('finance:incomeSource')}
                  />
                </div>
              )}

              {recordType === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="expenseType">{t('finance:category')}</Label>
                  <Select value={expenseCategory} onValueChange={(val) => {
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
                    <SelectValue placeholder={t('finance:selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {isBoats ? (
                          <>
                            <SelectItem value="fuel">{t('finance:fuel')}</SelectItem>
                            <SelectItem value="maintenance">{t('finance:boatMaintenance')}</SelectItem>
                            <SelectItem value="cleaning">{t('finance:cleaning')}</SelectItem>
                            <SelectItem value="docking">{t('finance:dockingFees')}</SelectItem>
                            <SelectItem value="licensing">{t('finance:licensing')}</SelectItem>
                            <SelectItem value="salary">{t('finance:employeeSalaries')}</SelectItem>
                            <SelectItem value="other" className="bg-muted/50 rounded-sm">
                              {t('finance:other')}
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="fuel">{t('finance:fuel')}</SelectItem>
                            <SelectItem value="maintenance">{t('finance:vehicleMaintenance')}</SelectItem>
                            <SelectItem value="vehicle_parts">{t('finance:vehiclePartsLabel')}</SelectItem>
                            <SelectItem value="carwash">{t('finance:carWash')}</SelectItem>
                            <SelectItem value="insurance">{t('finance:insurance')}</SelectItem>
                            <SelectItem value="tax">{t('finance:taxesFees')}</SelectItem>
                            <SelectItem value="salary">{t('finance:employeeSalaries')}</SelectItem>
                            <SelectItem value="marketing">{t('finance:marketing')}</SelectItem>
                            <SelectItem value="other" className="bg-muted/50 rounded-sm">
                              {t('finance:other')}
                            </SelectItem>
                          </>
                        )}
                      </SelectGroup>
                      {userExpenseCategories.length > 0 && (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground font-medium">
                              {t('finance:customCategories')}
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

              {recordType === "expense" && expenseCategory === 'maintenance' && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceType">
                    {t('finance:maintenanceTypeLabel')} *
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
                      <SelectValue placeholder={t('fleet:selectServiceType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {getMaintenanceTypeOptions(language).filter(o => o.value !== 'other').map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="other" className="bg-muted/50 rounded-sm">
                          {t('finance:addNewCustom')}
                        </SelectItem>
                      </SelectGroup>
                      {userMaintenanceCategories.length > 0 && (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground font-medium">
                              {t('finance:customCategories')}
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

              {recordType === "expense" && expenseCategory === 'maintenance' && maintenanceIsCustom && (
                <div className="space-y-2">
                  <Label>
                    {t('finance:newMaintenanceCategory')} *
                  </Label>
                  <Input
                    placeholder={t('finance:enterNewCategory')}
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

              {recordType === "expense" && expenseCategory === 'vehicle_parts' && (
                <div className="space-y-2">
                  <Label>
                    {t('finance:partTypeOptional')}
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
                      <SelectValue placeholder={t('fleet:selectServiceType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="__none__">
                          {t('finance:noSpecification')}
                        </SelectItem>
                        <SelectItem value="__new__" className="bg-muted/50 rounded-sm">
                          {t('finance:addNewPart')}
                        </SelectItem>
                      </SelectGroup>
                      {vehiclePartsSubcategories.length > 0 && (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground font-medium">
                              {t('finance:savedParts')}
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

              {recordType === "expense" && expenseCategory === 'vehicle_parts' && vehiclePartsIsCustom && (
                <div className="space-y-2">
                  <Label>
                    {t('finance:newPartType')}
                  </Label>
                  <Input
                    placeholder={t('finance:enterNewCategory')}
                    value={customVehiclePart}
                    onChange={(e) => {
                      setCustomVehiclePart(e.target.value);
                      setExpenseSubcategory(e.target.value);
                    }}
                    disabled={isLanguageLoading}
                  />
                </div>
              )}

              {recordType === "expense" && expenseCategory === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="expenseSubcat">
                    {t('finance:otherSubcategory')} *
                  </Label>
                  <Input 
                    id="expenseSubcat"
                    placeholder={t('finance:otherSubcategoryPlaceholder')}
                    value={expenseSubcategory}
                    onChange={(e) => setExpenseSubcategory(e.target.value)}
                    required
                    disabled={isLanguageLoading}
                  />
                </div>
              )}

              {recordType === "expense" && expenseCategory === 'marketing' && (
                <div className="space-y-2">
                  <Label htmlFor="expenseSubcat">
                    {t('finance:marketingSpecification')}
                  </Label>
                  <Input 
                    id="expenseSubcat"
                    placeholder={t('finance:specifySource')}
                    value={expenseSubcategory}
                    onChange={(e) => setExpenseSubcategory(e.target.value)}
                    disabled={isLanguageLoading}
                  />
                </div>
              )}

              {recordType === "expense" && expenseCategory === 'tax' && (
                <div className="space-y-2">
                  <Label>
                    {t('finance:taxFeeTypeOptional')}
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
                      <SelectValue placeholder={t('fleet:selectServiceType')} />
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
                          {t('finance:addNewCustom')}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {recordType === "expense" && expenseCategory === 'tax' && taxIsCustom && (
                <div className="space-y-2">
                  <Label>
                    {t('finance:newTaxType')} *
                  </Label>
                  <Input
                    placeholder={t('finance:enterNewCategory')}
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
              
              <div className="space-y-2">
                <Label htmlFor="vehicle">
                  {t('finance:linkToVehicle')} 
                  <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                </Label>
                <Select value={selectedVehicleId || "none"} onValueChange={(val) => setSelectedVehicleId(val === "none" ? "" : val)} disabled={isLanguageLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance:selectVehiclePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('finance:noneGeneral')}
                    </SelectItem>
                    {vehicles.filter(v => !(v as any).is_sold).map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('finance:vehicleFinanceNote')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">{t('finance:amount')} (€)</Label>
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
                <Label htmlFor="date">{t('common:date')}</Label>
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
                <Label htmlFor="notes">{t('common:notes')}</Label>
                <Textarea 
                  id="notes" 
                  placeholder={t('finance:notes')}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isLanguageLoading}
                />
              </div>

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
                  {t('common:cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting || isLanguageLoading}
                >
                  {isSubmitting ? t('common:adding') : t('finance:addRecord')}
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
