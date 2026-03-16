import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Calendar, Plus, Settings2, Wrench, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { MAINTENANCE_TYPES, getMaintenanceTypeLabel, getMaintenanceTypeOptions } from "@/constants/maintenanceTypes";
import { useMaintenanceCategories } from "@/hooks/useMaintenanceCategories";

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  type: string;
  description: string | null;
  cost: number;
  date: string;
  next_date: string | null;
  mileage: number | null;
}

interface VehicleMaintenanceProps {
  vehicleId: string;
}

const ITEMS_PER_PAGE = 10;
const DEFAULT_VISIBLE_ITEMS = 4;

export function VehicleMaintenance({ vehicleId }: VehicleMaintenanceProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [serviceType, setServiceType] = useState("oil_change");
  const [customServiceType, setCustomServiceType] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().substring(0, 10));
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { language, isLanguageLoading } = useLanguage();
  const { t } = useTranslation(['fleet', 'common']);
  const { user } = useAuth();
  const { userMaintenanceCategories, refetchMaintenanceCategories } = useMaintenanceCategories();
  
  useEffect(() => {
    if (vehicleId && user) {
      fetchMaintenanceRecords();
    }
  }, [vehicleId, user]);
  
  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      if (!vehicleId) return;
      
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("date", { ascending: false });
        
      if (error) {
        console.error("Error fetching maintenance records:", error);
        toast({
          title: t('common:error'),
          description: "Failed to load maintenance history",
          variant: "destructive"
        });
      } else {
        setRecords(data || []);
      }
    } catch (error) {
      console.error("Exception fetching maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddRecord = async () => {
    const finalServiceType = serviceType === 'other' ? customServiceType.trim() : serviceType;
    if (!finalServiceType || !serviceDate || !cost) {
      toast({
        title: t('fleet:missingInfo'),
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: t('common:error'),
        description: t('fleet:mustBeLoggedIn'),
        variant: "destructive"
      });
      return;
    }
      
    try {
      const costValue = parseFloat(cost);
      
      const { data: maintenanceData, error } = await supabase
        .from("vehicle_maintenance")
        .insert([{
          vehicle_id: vehicleId,
          user_id: user.id,
          type: finalServiceType,
          date: serviceDate,
          next_date: nextServiceDate || null,
          cost: costValue,
          description: notes
        }])
        .select()
        .single();
        
      if (error) {
        console.error("Error adding maintenance record:", error);
        toast({
          title: t('common:error'),
          description: "Failed to add maintenance record",
          variant: "destructive"
        });
        return;
      }
      
      if (costValue > 0) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('fuel_type, year')
          .eq('id', vehicleId)
          .single();

        const { error: financeError } = await supabase
          .from("financial_records")
          .insert({
            user_id: user.id,
            vehicle_id: vehicleId,
            type: 'expense',
            category: 'maintenance',
            amount: costValue,
            date: serviceDate,
            description: `${serviceType === 'other' ? finalServiceType : getServiceTypeLabel(serviceType)}${notes ? ': ' + notes : ''}`,
            expense_subcategory: finalServiceType,
            source_section: 'vehicle_maintenance',
            vehicle_fuel_type: vehicleData?.fuel_type || null,
            vehicle_year: vehicleData?.year || null
          });
          
        if (financeError) {
          console.error("Error creating financial record for maintenance:", financeError);
        }
      }
      
      toast({
        title: t('common:success'),
        description: t('fleet:maintenanceRecordAdded')
      });
      
      setServiceType("oil_change");
      setCustomServiceType("");
      setServiceDate(new Date().toISOString().substring(0, 10));
      setNextServiceDate("");
      setCost("");
      setNotes("");
      setIsDialogOpen(false);
      fetchMaintenanceRecords();
      refetchMaintenanceCategories();
    } catch (error) {
      console.error("Exception adding maintenance record:", error);
    }
  };
  
  const getServiceTypeLabel = (type: string) => getMaintenanceTypeLabel(type, language);
  
  const formatDate = (dateString: string) => {
    const localeMap: Record<string, string> = {
      en: 'en-GB', el: 'el-GR', it: 'it-IT', es: 'es-ES', de: 'de-DE', fr: 'fr-FR'
    };
    return new Date(dateString).toLocaleDateString(localeMap[language] || 'en-GB');
  };

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const paginatedRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const MaintenanceRecordItem = ({ record }: { record: MaintenanceRecord }) => (
    <div className="p-4 border rounded-md hover:bg-accent/50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">
            {getServiceTypeLabel(record.type)}
          </h3>
          <div className="text-sm text-muted-foreground mt-1">
            {t('fleet:performedOn')} {formatDate(record.date)}
          </div>
          {record.next_date && (
            <div className="flex items-center text-sm text-primary mt-1">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              {t('fleet:nextService')} {formatDate(record.next_date)}
            </div>
          )}
          {record.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {record.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">
            ${Number(record.cost).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-primary" />
            {t('fleet:maintenanceHistory')}
          </CardTitle>
          <div className="flex gap-2">
            {records.length > DEFAULT_VISIBLE_ITEMS && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllRecords(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('common:viewAll')} ({records.length})
              </Button>
            )}
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
              disabled={isLanguageLoading}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('common:add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {t('fleet:loadingMaintenance')}
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Settings2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-1">
                {t('fleet:noMaintenanceRecords')}
              </h3>
              <p className="text-sm max-w-md mx-auto">
                {t('fleet:trackServicesDesc')}
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="mt-4 bg-primary hover:bg-primary/90"
                disabled={isLanguageLoading}
              >
                {t('fleet:addFirstServiceRecord')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {records.slice(0, DEFAULT_VISIBLE_ITEMS).map((record) => (
                <MaintenanceRecordItem key={record.id} record={record} />
              ))}
              
              {records.length > DEFAULT_VISIBLE_ITEMS && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  {t('common:showing')} {DEFAULT_VISIBLE_ITEMS} {t('common:of')} {records.length} {t('common:records')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAllRecords} onOpenChange={setShowAllRecords}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {t('fleet:allMaintenanceRecords')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {paginatedRecords.map((record) => (
              <MaintenanceRecordItem key={record.id} record={record} />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t('common:page')} {currentPage} {t('common:of')} {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common:previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('common:next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('fleet:addMaintenanceRecord')}</DialogTitle>
            <DialogDescription>
              {t('fleet:maintenanceRecordDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="service-type">{t('fleet:serviceType')}</Label>
              <Select value={serviceType} onValueChange={(val) => {
                if (val.startsWith('__custom_maint__:')) {
                  const custom = val.replace('__custom_maint__:', '');
                  setServiceType('other');
                  setCustomServiceType(custom);
                } else {
                  setServiceType(val);
                  if (val !== 'other') setCustomServiceType('');
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
                          {t('common:customCategories')}
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
            
            {serviceType === 'other' && (
              <div className="space-y-2">
                <Label>
                  {t('fleet:newMaintenanceCategory')} *
                </Label>
                <Input
                  placeholder={t('fleet:enterNewCategory')}
                  value={customServiceType}
                  onChange={(e) => setCustomServiceType(e.target.value)}
                  required
                  disabled={isLanguageLoading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="service-date">{t('fleet:serviceDate')}</Label>
              <Input
                id="service-date"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                disabled={isLanguageLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">{t('fleet:costEuro')}</Label>
              <Input
                id="cost"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                disabled={isLanguageLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next-service-date">{t('fleet:nextServiceDate')}</Label>
              <Input
                id="next-service-date"
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
                disabled={isLanguageLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">{t('fleet:notesOptional')}</Label>
              <Textarea
                id="notes"
                placeholder={t('fleet:notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isLanguageLoading}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isLanguageLoading}
            >
              {t('common:cancel')}
            </Button>
            <Button 
              onClick={handleAddRecord}
              className="bg-primary hover:bg-primary/90"
              disabled={isLanguageLoading}
            >
              {t('fleet:addRecord')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
