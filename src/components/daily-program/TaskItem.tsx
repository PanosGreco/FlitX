import { useState } from "react";
import { Clock, Edit, Trash2, Check, MapPin, FileText, Fuel, CreditCard, Info } from "lucide-react";
import { formatTime24h } from "@/utils/dateFormatUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePreviewModal } from "@/components/shared/FilePreviewModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditTaskDialog } from "./EditTaskDialog";
import { DailyTask } from "@/hooks/useDailyTasks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";

interface TaskItemProps { task: DailyTask; onUpdate: (task: DailyTask) => void; onDelete: (taskId: string) => void; }

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const { t } = useTranslation(['dailyProgram', 'common']);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isDeleteContractDialogOpen, setIsDeleteContractDialogOpen] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleToggleComplete = async () => { setIsUpdating(true); await onUpdate({ ...task, completed: !task.completed }); setIsUpdating(false); };

  const handleViewContract = async () => {
    if (!task.contractPath) return;
    try {
      const { data } = await supabase.storage.from('rental-contracts').getPublicUrl(task.contractPath);
      setContractUrl(data.publicUrl); setIsContractOpen(true);
    } catch (error) {
      console.error('Error loading contract:', error);
      toast({ title: t('common:error'), description: t('fleet:contractLoadFailed'), variant: "destructive" });
    }
  };

  const handleDeleteContract = async () => {
    if (!task.contractPath) return;
    try {
      const { error: storageError } = await supabase.storage.from('rental-contracts').remove([task.contractPath]);
      if (storageError) console.error('Error deleting contract from storage:', storageError);
      const { error: taskError } = await supabase.from('daily_tasks').update({ contract_path: null }).eq('id', task.id);
      if (taskError) throw taskError;
      if (task.bookingId) await supabase.from('rental_bookings').update({ contract_photo_path: null }).eq('id', task.bookingId);
      onUpdate({ ...task, contractPath: null });
      setIsContractOpen(false); setIsDeleteContractDialogOpen(false); setContractUrl(null);
      toast({ title: t('dailyProgram:contractDeleted'), description: t('dailyProgram:contractDeletedDesc') });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({ title: t('common:error'), description: t('common:error'), variant: "destructive" });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'return': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivery': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'delivery': return t('home:pickUp');
      case 'return': return t('home:dropOff');
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <>
      <Card className={`border ${task.completed ? 'opacity-60 bg-muted/30' : ''}`}>
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={`${getTypeColor(task.type)} text-xs px-2 py-0.5`}>{getTypeLabel(task.type)}</Badge>
                  {task.completed && <Badge variant="secondary" className="text-green-600 text-xs px-2 py-0.5"><Check className="h-3 w-3 mr-1" />{t('dailyProgram:done')}</Badge>}
                  {task.contractPath && <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800" onClick={handleViewContract} title={t('dailyProgram:contractDocument')}><FileText className="h-3.5 w-3.5" /></Button>}
                </div>
                {task.type === 'other' && task.title ? (
                  <h4 className={`font-medium text-sm truncate ${task.completed ? 'line-through' : ''}`}>{task.title}</h4>
                ) : task.vehicleName ? (
                  <h4 className={`font-medium text-sm truncate ${task.completed ? 'line-through' : ''}`}>{task.vehicleName}</h4>
                ) : (
                  <h4 className={`font-medium text-sm text-muted-foreground ${task.completed ? 'line-through' : ''}`}>{t('dailyProgram:generalTask')}</h4>
                )}
              </div>
              <div className="flex space-x-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditDialogOpen(true)}><Edit className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground"><Clock className="h-3 w-3" /><span className="text-sm">{formatTime24h(task.scheduledTime) || task.scheduledTime}</span></div>
            {task.location && <div className="flex items-center space-x-2 text-xs text-muted-foreground"><MapPin className="w-3 h-[20px]" /><span className="truncate text-sm">{task.location}</span></div>}
            {task.notes && <p className="text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2 text-sm">{task.notes}</p>}
            {(task.type === 'delivery' || task.type === 'return') && (task.fuelLevel || task.paymentStatus) && (
              <div className="space-y-1">
                {task.fuelLevel && <div className="flex items-center text-xs text-muted-foreground"><Fuel className="h-3 w-3 mr-1" /><span className="text-sm">{t('dailyProgram:fuelLevel')}: {task.fuelLevel}</span></div>}
                {task.paymentStatus && <div className="flex items-center text-xs text-muted-foreground"><CreditCard className="h-3 w-3 mr-1" /><span className="text-sm">{task.paymentStatus === 'paid_in_full' ? t('dailyProgram:paidInFull') : `${t('dailyProgram:balanceDue')}${task.balanceDueAmount ? ` (€${task.balanceDueAmount})` : ''}`}</span></div>}
              </div>
            )}
            {(task.type === 'delivery' || task.type === 'return') && task.additionalInfo && task.additionalInfo.length > 0 && (
              <div className="space-y-1">
                {task.additionalInfo.map((info, idx) => <div key={idx} className="flex items-center text-xs text-muted-foreground"><Info className="h-3 w-3 mr-1" /><span className="text-sm">{info.categoryName}: {info.subcategoryValue}</span></div>)}
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button variant={task.completed ? "secondary" : "default"} size="sm" className="h-7 px-3 text-xs" onClick={handleToggleComplete} disabled={isUpdating}>
                {isUpdating ? '...' : task.completed ? t('dailyProgram:reopen') : t('dailyProgram:complete')}
              </Button>
            </div>
          </div>
          <EditTaskDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} task={task} onUpdate={onUpdate} />
        </CardContent>
      </Card>
      <FilePreviewModal open={isContractOpen} onOpenChange={setIsContractOpen} url={contractUrl} fileType={contractUrl && contractUrl.split('?')[0].split('#')[0].toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'} title={t('dailyProgram:contractDocument')}
        actions={<Button variant="destructive" size="sm" onClick={() => setIsDeleteContractDialogOpen(true)} className="gap-2"><Trash2 className="h-4 w-4" />{t('dailyProgram:deleteContract')}</Button>} />
      <AlertDialog open={isDeleteContractDialogOpen} onOpenChange={setIsDeleteContractDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dailyProgram:deleteContractTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('dailyProgram:deleteContractDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common:delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
