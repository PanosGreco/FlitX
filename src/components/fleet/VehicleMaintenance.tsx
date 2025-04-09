
import { useState } from "react";
import { Wrench, Plus, Calendar, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, addYears } from "date-fns";

interface MaintenanceEntry {
  id: string;
  type: string;
  date: Date;
  cost: number;
  notes?: string;
  reminder?: {
    type: 'once' | '3months' | '6months' | '1year' | 'custom';
    date: Date;
  };
}

interface MaintenanceProps {
  vehicleId: string;
  updateExpenses: (amount: number) => void;
}

export function VehicleMaintenance({ vehicleId, updateExpenses }: MaintenanceProps) {
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<MaintenanceEntry | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<MaintenanceEntry>>({
    type: '',
    date: new Date(),
    cost: 0,
    notes: '',
  });
  const [reminderType, setReminderType] = useState<'once' | '3months' | '6months' | '1year' | 'custom'>('once');
  const [reminderDate, setReminderDate] = useState<Date>(new Date());
  
  const { toast } = useToast();

  const handleAddNew = () => {
    setNewEntry({
      type: '',
      date: new Date(),
      cost: 0,
      notes: '',
    });
    setIsAddDialogOpen(true);
  };

  const handleEditEntry = (entry: MaintenanceEntry) => {
    setCurrentEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    const entryToDelete = maintenanceHistory.find(entry => entry.id === entryId);
    
    if (entryToDelete && entryToDelete.cost > 0) {
      // Subtract the cost from total expenses
      updateExpenses(-entryToDelete.cost);
    }
    
    setMaintenanceHistory(prev => prev.filter(entry => entry.id !== entryId));
    
    toast({
      title: "Maintenance Entry Deleted",
      description: "The maintenance record has been removed."
    });
  };

  const handleSaveNewEntry = () => {
    if (!newEntry.type) {
      toast({
        title: "Error",
        description: "Please enter a maintenance type",
        variant: "destructive",
      });
      return;
    }

    const entryId = `maintenance-${Date.now()}`;
    const cost = Number(newEntry.cost) || 0;
    
    const entry: MaintenanceEntry = {
      id: entryId,
      type: newEntry.type,
      date: newEntry.date || new Date(),
      cost: cost,
      notes: newEntry.notes,
    };

    setMaintenanceHistory(prev => [...prev, entry]);
    
    if (cost > 0) {
      // Add the cost to total expenses
      updateExpenses(cost);
    }
    
    toast({
      title: "Maintenance Added",
      description: `${newEntry.type} maintenance record added successfully.`
    });
    
    setIsAddDialogOpen(false);
  };

  const handleUpdateEntry = () => {
    if (!currentEntry) return;

    const originalEntry = maintenanceHistory.find(entry => entry.id === currentEntry.id);
    const costDifference = (currentEntry.cost || 0) - (originalEntry?.cost || 0);
    
    setMaintenanceHistory(prev => 
      prev.map(entry => 
        entry.id === currentEntry.id ? currentEntry : entry
      )
    );
    
    // Update expenses if the cost has changed
    if (costDifference !== 0) {
      updateExpenses(costDifference);
    }
    
    toast({
      title: "Maintenance Updated",
      description: `${currentEntry.type} maintenance record updated successfully.`
    });
    
    setIsEditDialogOpen(false);
  };

  const openReminderDialog = () => {
    setReminderType('once');
    setReminderDate(new Date());
    setIsReminderDialogOpen(true);
  };

  const handleSetReminder = () => {
    if (!newEntry && !currentEntry) return;
    
    let reminderObj = {
      type: reminderType,
      date: reminderDate,
    };
    
    if (isAddDialogOpen) {
      setNewEntry(prev => ({
        ...prev,
        reminder: reminderObj,
      }));
    } else if (currentEntry) {
      setCurrentEntry(prev => ({
        ...prev!,
        reminder: reminderObj,
      }));
    }
    
    let reminderDescription = "once on " + format(reminderDate, "MMM d, yyyy");
    
    if (reminderType === '3months') {
      reminderDescription = "every 3 months";
    } else if (reminderType === '6months') {
      reminderDescription = "every 6 months";
    } else if (reminderType === '1year') {
      reminderDescription = "annually";
    }
    
    toast({
      title: "Reminder Set",
      description: `You'll be reminded ${reminderDescription}.`
    });
    
    setIsReminderDialogOpen(false);
  };

  const calculateNextReminderDate = (reminder?: { type: string; date: Date }) => {
    if (!reminder) return null;
    
    const { type, date } = reminder;
    const now = new Date();
    
    switch (type) {
      case '3months':
        return addMonths(now, 3);
      case '6months':
        return addMonths(now, 6);
      case '1year':
        return addYears(now, 1);
      case 'once':
      case 'custom':
      default:
        return new Date(date);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-flitx-blue" />
            Maintenance History
          </CardTitle>
          <Button 
            className="bg-flitx-blue hover:bg-flitx-blue-600" 
            size="sm"
            onClick={handleAddNew}
          >
            <Plus className="h-4 w-4 mr-1" /> Add New
          </Button>
        </CardHeader>
        <CardContent>
          {maintenanceHistory.length === 0 ? (
            <div className="text-center py-10 text-flitx-gray-500">
              <Wrench className="mx-auto h-12 w-12 text-flitx-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-1">No maintenance records</h3>
              <p className="text-sm">
                Keep track of your vehicle maintenance by adding service records.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {maintenanceHistory
                .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort by date, newest first
                .map((entry) => (
                  <div 
                    key={entry.id} 
                    className="border rounded-md p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleEditEntry(entry)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-lg">
                          {entry.type}
                        </div>
                        <div className="text-flitx-gray-500 text-sm mt-1">
                          {format(new Date(entry.date), "MMMM d, yyyy")}
                        </div>
                        {entry.notes && <div className="text-sm mt-2">{entry.notes}</div>}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-lg font-semibold">${entry.cost.toFixed(2)}</div>
                        {entry.reminder && (
                          <div className="flex items-center text-xs text-flitx-gray-500 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>
                              Next: {format(calculateNextReminderDate(entry.reminder) || new Date(), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEntry(entry);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                      >
                        <Trash className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Maintenance Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Record</DialogTitle>
            <DialogDescription>
              Enter the details for the new maintenance record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance-type">Maintenance Type</Label>
              <Input 
                id="maintenance-type" 
                placeholder="e.g., Oil Change, Tire Rotation"
                value={newEntry.type || ''}
                onChange={(e) => setNewEntry({...newEntry, type: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Maintenance Date</Label>
              <CalendarComponent
                mode="single"
                selected={newEntry.date}
                onSelect={(date) => date && setNewEntry({...newEntry, date})}
                className="border rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maintenance-cost">Cost ($)</Label>
              <Input 
                id="maintenance-cost" 
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newEntry.cost || ''}
                onChange={(e) => setNewEntry({...newEntry, cost: parseFloat(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maintenance-notes">Notes (Optional)</Label>
              <Input 
                id="maintenance-notes" 
                placeholder="Additional details about the service"
                value={newEntry.notes || ''}
                onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              />
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={openReminderDialog}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Set Reminder
            </Button>
            
            {newEntry.reminder && (
              <div className="bg-blue-50 p-3 rounded-md text-sm">
                <div className="font-medium">Reminder Set</div>
                <div className="text-flitx-gray-500">
                  {reminderType === 'once' && `Once on ${format(reminderDate, "MMMM d, yyyy")}`}
                  {reminderType === '3months' && 'Every 3 months'}
                  {reminderType === '6months' && 'Every 6 months'}
                  {reminderType === '1year' && 'Every year'}
                  {reminderType === 'custom' && `On ${format(reminderDate, "MMMM d, yyyy")}`}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewEntry} className="bg-flitx-blue hover:bg-flitx-blue-600">
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Maintenance Record</DialogTitle>
            <DialogDescription>
              Update the details for this maintenance record.
            </DialogDescription>
          </DialogHeader>
          
          {currentEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-maintenance-type">Maintenance Type</Label>
                <Input 
                  id="edit-maintenance-type" 
                  value={currentEntry.type}
                  onChange={(e) => setCurrentEntry({...currentEntry, type: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Maintenance Date</Label>
                <CalendarComponent
                  mode="single"
                  selected={new Date(currentEntry.date)}
                  onSelect={(date) => date && setCurrentEntry({...currentEntry, date})}
                  className="border rounded-md"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-maintenance-cost">Cost ($)</Label>
                <Input 
                  id="edit-maintenance-cost" 
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentEntry.cost}
                  onChange={(e) => setCurrentEntry({...currentEntry, cost: parseFloat(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-maintenance-notes">Notes (Optional)</Label>
                <Input 
                  id="edit-maintenance-notes" 
                  value={currentEntry.notes || ''}
                  onChange={(e) => setCurrentEntry({...currentEntry, notes: e.target.value})}
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-2"
                onClick={openReminderDialog}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {currentEntry.reminder ? 'Edit Reminder' : 'Set Reminder'}
              </Button>
              
              {currentEntry.reminder && (
                <div className="bg-blue-50 p-3 rounded-md text-sm">
                  <div className="font-medium">Reminder Set</div>
                  <div className="text-flitx-gray-500">
                    {currentEntry.reminder.type === 'once' && `Once on ${format(new Date(currentEntry.reminder.date), "MMMM d, yyyy")}`}
                    {currentEntry.reminder.type === '3months' && 'Every 3 months'}
                    {currentEntry.reminder.type === '6months' && 'Every 6 months'}
                    {currentEntry.reminder.type === '1year' && 'Every year'}
                    {currentEntry.reminder.type === 'custom' && `On ${format(new Date(currentEntry.reminder.date), "MMMM d, yyyy")}`}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEntry} className="bg-flitx-blue hover:bg-flitx-blue-600">
              Update Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Maintenance Reminder</DialogTitle>
            <DialogDescription>
              Choose when you want to be reminded about this maintenance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-type">Reminder Frequency</Label>
              <Select value={reminderType} onValueChange={(value) => setReminderType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select when to remind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once on specific date</SelectItem>
                  <SelectItem value="3months">Every 3 months</SelectItem>
                  <SelectItem value="6months">Every 6 months</SelectItem>
                  <SelectItem value="1year">Every year</SelectItem>
                  <SelectItem value="custom">Custom date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(reminderType === 'once' || reminderType === 'custom') && (
              <div className="space-y-2">
                <Label>Select Date</Label>
                <CalendarComponent
                  mode="single"
                  selected={reminderDate}
                  onSelect={(date) => date && setReminderDate(date)}
                  className="border rounded-md"
                  disabled={(date) => date < new Date()}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetReminder} className="bg-flitx-blue hover:bg-flitx-blue-600">
              Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
