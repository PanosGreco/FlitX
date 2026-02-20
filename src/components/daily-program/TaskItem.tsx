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
interface TaskItemProps {
  task: DailyTask;
  onUpdate: (task: DailyTask) => void;
  onDelete: (taskId: string) => void;
}
export function TaskItem({
  task,
  onUpdate,
  onDelete
}: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isDeleteContractDialogOpen, setIsDeleteContractDialogOpen] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const handleToggleComplete = async () => {
    setIsUpdating(true);
    await onUpdate({
      ...task,
      completed: !task.completed
    });
    setIsUpdating(false);
  };
  const handleViewContract = async () => {
    if (!task.contractPath) return;
    try {
      const {
        data
      } = await supabase.storage.from('rental-contracts').getPublicUrl(task.contractPath);
      setContractUrl(data.publicUrl);
      setIsContractOpen(true);
    } catch (error) {
      console.error('Error loading contract:', error);
      toast({
        title: "Error",
        description: "Failed to load contract",
        variant: "destructive"
      });
    }
  };
  const handleDeleteContract = async () => {
    if (!task.contractPath) return;
    try {
      // Delete from storage
      const {
        error: storageError
      } = await supabase.storage.from('rental-contracts').remove([task.contractPath]);
      if (storageError) {
        console.error('Error deleting contract from storage:', storageError);
      }

      // Update task to remove contract reference
      const {
        error: taskError
      } = await supabase.from('daily_tasks').update({
        contract_path: null
      }).eq('id', task.id);
      if (taskError) {
        throw taskError;
      }

      // Also update related booking if exists
      if (task.bookingId) {
        await supabase.from('rental_bookings').update({
          contract_photo_path: null
        }).eq('id', task.bookingId);
      }

      // Update local task state
      onUpdate({
        ...task,
        contractPath: null
      });
      setIsContractOpen(false);
      setIsDeleteContractDialogOpen(false);
      setContractUrl(null);
      toast({
        title: "Contract Deleted",
        description: "Contract has been permanently removed"
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive"
      });
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'return':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivery':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'other':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  return <>
      <Card className={`border ${task.completed ? 'opacity-60 bg-muted/30' : ''}`}>
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={`${getTypeColor(task.type)} text-xs px-2 py-0.5`}>
                    {task.type === 'delivery' ? 'Pick-Up' : task.type === 'return' ? 'Drop-Off' : task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                  </Badge>
                  {task.completed && <Badge variant="secondary" className="text-green-600 text-xs px-2 py-0.5">
                      <Check className="h-3 w-3 mr-1" />
                      Done
                    </Badge>}
                  {task.contractPath && <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800" onClick={handleViewContract} onDoubleClick={handleViewContract} title="View Contract (double-click for large view)">
                      <FileText className="h-3.5 w-3.5" />
                    </Button>}
                </div>
                {task.type === 'other' && task.title ? (
                  <h4 className={`font-medium text-sm truncate ${task.completed ? 'line-through' : ''}`}>
                    {task.title}
                  </h4>
                ) : task.vehicleName ? (
                  <h4 className={`font-medium text-sm truncate ${task.completed ? 'line-through' : ''}`}>
                    {task.vehicleName}
                  </h4>
                ) : (
                  <h4 className={`font-medium text-sm text-muted-foreground ${task.completed ? 'line-through' : ''}`}>
                    General Task
                  </h4>
                )}
              </div>
              <div className="flex space-x-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-sm">{formatTime24h(task.scheduledTime) || task.scheduledTime}</span>
            </div>

            {/* Location */}
            {task.location && <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-[20px]" />
                <span className="truncate text-sm">{task.location}</span>
              </div>}

            {/* Notes */}
            {task.notes && <p className="text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2 text-sm">
                {task.notes}
              </p>}

            {/* Fuel & Payment - only for delivery/return tasks */}
            {(task.type === 'delivery' || task.type === 'return') && (task.fuelLevel || task.paymentStatus) && (
              <div className="space-y-1">
                {task.fuelLevel && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Fuel className="h-3 w-3 mr-1" />
                    <span>Fuel Level: {task.fuelLevel}</span>
                  </div>
                )}
                {task.paymentStatus && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CreditCard className="h-3 w-3 mr-1" />
                    <span>{task.paymentStatus === 'paid_in_full' ? 'Paid in Full' : `Balance Due${task.balanceDueAmount ? ` (€${task.balanceDueAmount})` : ''}`}</span>
                  </div>
                )}
              </div>
            )}

            {/* Additional Information - only for delivery/return tasks */}
            {(task.type === 'delivery' || task.type === 'return') && task.additionalInfo && task.additionalInfo.length > 0 && (
              <div className="space-y-1">
                {task.additionalInfo.map((info, idx) => (
                  <div key={idx} className="flex items-center text-xs text-muted-foreground">
                    <Info className="h-3 w-3 mr-1" />
                    <span>{info.categoryName}: {info.subcategoryValue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Complete Button */}
            <div className="flex justify-end pt-1">
              <Button variant={task.completed ? "secondary" : "default"} size="sm" className="h-7 px-3 text-xs" onClick={handleToggleComplete} disabled={isUpdating}>
                {isUpdating ? '...' : task.completed ? "Reopen" : "Complete"}
              </Button>
            </div>
          </div>

          <EditTaskDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} task={task} onUpdate={onUpdate} />
        </CardContent>
      </Card>

      {/* Full-resolution Contract Viewer */}
      <FilePreviewModal
        open={isContractOpen}
        onOpenChange={setIsContractOpen}
        url={contractUrl}
        fileType="image"
        title="Contract Document"
        actions={
          <Button variant="destructive" size="sm" onClick={() => setIsDeleteContractDialogOpen(true)} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Contract
          </Button>
        }
      />
      {/* Delete Contract Confirmation */}
      <AlertDialog open={isDeleteContractDialogOpen} onOpenChange={setIsDeleteContractDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contract file. The task will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}