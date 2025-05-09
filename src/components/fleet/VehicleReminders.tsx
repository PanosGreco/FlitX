
import { useState, useEffect } from "react";
import { 
  Calendar,
  Clock, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Bell,
  BellOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  frequency: string;
  notification_days: number;
  is_completed: boolean;
  is_predefined: boolean;
}

interface VehicleRemindersProps {
  vehicleId: string;
}

export function VehicleReminders({ vehicleId }: VehicleRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isEditReminderOpen, setIsEditReminderOpen] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [frequency, setFrequency] = useState("once");
  const [notificationDays, setNotificationDays] = useState(1);
  const [isPredefined, setIsPredefined] = useState(false);
  
  const { toast } = useToast();
  
  const predefinedOptions = [
    "Insurance Renewal",
    "Road Tax (ΕΚΤΕΟ)",
    "Oil Change",
    "Annual Service",
    "Tire Rotation",
    "Other"
  ];

  useEffect(() => {
    fetchReminders();
  }, [vehicleId]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("vehicle_reminders")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("event_date");
      
      if (error) throw error;
      
      setReminders(data || []);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast({
        title: "Error",
        description: "Failed to load reminders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    try {
      // Validate inputs
      if (!title) {
        toast({
          title: "Error",
          description: "Title is required",
          variant: "destructive",
        });
        return;
      }

      const newReminder = {
        vehicle_id: vehicleId,
        title,
        description: description || null,
        event_date: eventDate.toISOString(),
        frequency,
        notification_days: notificationDays,
        is_predefined: isPredefined
      };

      const { data, error } = await supabase
        .from("vehicle_reminders")
        .insert([newReminder])
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder added successfully",
      });
      
      // Reset form and close dialog
      resetForm();
      setIsAddReminderOpen(false);
      
      // Refresh reminders list
      fetchReminders();
      
    } catch (error) {
      console.error("Error adding reminder:", error);
      toast({
        title: "Error",
        description: "Failed to add reminder",
        variant: "destructive",
      });
    }
  };

  const handleEditReminder = async () => {
    if (!currentReminder) return;
    
    try {
      const updatedReminder = {
        title,
        description: description || null,
        event_date: eventDate.toISOString(),
        frequency,
        notification_days: notificationDays,
        is_predefined: isPredefined
      };

      const { error } = await supabase
        .from("vehicle_reminders")
        .update(updatedReminder)
        .eq("id", currentReminder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder updated successfully",
      });
      
      // Reset form and close dialog
      resetForm();
      setIsEditReminderOpen(false);
      setCurrentReminder(null);
      
      // Refresh reminders list
      fetchReminders();
      
    } catch (error) {
      console.error("Error updating reminder:", error);
      toast({
        title: "Error",
        description: "Failed to update reminder",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vehicle_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder deleted successfully",
      });
      
      // Refresh reminders list
      fetchReminders();
      
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    }
  };

  const handleToggleCompletion = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from("vehicle_reminders")
        .update({ is_completed: !reminder.is_completed })
        .eq("id", reminder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reminder marked as ${!reminder.is_completed ? 'completed' : 'incomplete'}`,
      });
      
      // Refresh reminders list
      fetchReminders();
      
    } catch (error) {
      console.error("Error toggling reminder completion:", error);
      toast({
        title: "Error",
        description: "Failed to update reminder",
        variant: "destructive",
      });
    }
  };

  const editReminder = (reminder: Reminder) => {
    setCurrentReminder(reminder);
    setTitle(reminder.title);
    setDescription(reminder.description || "");
    setEventDate(new Date(reminder.event_date));
    setFrequency(reminder.frequency);
    setNotificationDays(reminder.notification_days);
    setIsPredefined(reminder.is_predefined);
    setIsEditReminderOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate(new Date());
    setFrequency("once");
    setNotificationDays(1);
    setIsPredefined(false);
  };

  const handlePredefinedSelect = (option: string) => {
    if (option === "Other") {
      setTitle("");
      setIsPredefined(false);
    } else {
      setTitle(option);
      setIsPredefined(true);
    }
  };

  const getNotificationText = (days: number) => {
    return days === 1 ? "1 day before" : 
           days === 7 ? "1 week before" : 
           days === 14 ? "2 weeks before" : 
           days === 30 ? "1 month before" : 
           `${days} days before`;
  };

  const getFrequencyText = (freq: string) => {
    return freq === "once" ? "One-time" :
           freq === "monthly" ? "Monthly" :
           freq === "quarterly" ? "Every 3 months" :
           freq === "biannually" ? "Every 6 months" :
           freq === "annually" ? "Yearly" : freq;
  };

  const isRemindedSoon = (reminder: Reminder) => {
    const eventDate = new Date(reminder.event_date);
    const today = new Date();
    const notificationDate = new Date(eventDate);
    notificationDate.setDate(notificationDate.getDate() - reminder.notification_days);
    
    return today >= notificationDate && today < eventDate && !reminder.is_completed;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming Reminders</h2>
        <Button onClick={() => setIsAddReminderOpen(true)} className="bg-flitx-blue hover:bg-flitx-blue-600">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-flitx-gray-500">Loading reminders...</div>
        </div>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-flitx-gray-500">
            <Bell className="mx-auto mb-3 h-10 w-10 text-flitx-gray-300" />
            <h3 className="mb-1 text-lg font-medium">No reminders yet</h3>
            <p className="text-sm">
              Add reminders for important events like insurance renewal or maintenance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          className="space-y-2"
          defaultValue={["upcoming"]}
        >
          {/* Upcoming Reminders */}
          <AccordionItem value="upcoming" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-flitx-gray-50">
              <span className="flex gap-2 items-center">
                <Bell className="h-4 w-4 text-flitx-blue" />
                Upcoming
                <span className="ml-2 rounded-full bg-flitx-blue-100 px-2 py-0.5 text-xs text-flitx-blue">
                  {reminders.filter(r => !r.is_completed).length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 p-2">
                {reminders
                  .filter(reminder => !reminder.is_completed)
                  .map(reminder => (
                    <div 
                      key={reminder.id}
                      className={`relative rounded-md border p-3 transition-all ${
                        isRemindedSoon(reminder) ? 'border-amber-200 bg-amber-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{reminder.title}</h3>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-flitx-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {format(new Date(reminder.event_date), "MMM d, yyyy")}
                            </div>
                            
                            <div className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              {getFrequencyText(reminder.frequency)}
                            </div>
                            
                            {isRemindedSoon(reminder) && (
                              <span className="flex items-center text-amber-600 font-medium">
                                <Bell className="h-3.5 w-3.5 mr-1" />
                                Coming soon
                              </span>
                            )}
                          </div>
                          {reminder.description && (
                            <p className="text-sm mt-1.5 text-flitx-gray-600">
                              {reminder.description}
                            </p>
                          )}
                          <div className="mt-1 text-xs text-flitx-gray-400">
                            Notify {getNotificationText(reminder.notification_days)}
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => editReminder(reminder)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500"
                            onClick={() => handleToggleCompletion(reminder)}
                          >
                            {reminder.is_completed ? (
                              <BellOff className="h-3.5 w-3.5" />
                            ) : (
                              <Bell className="h-3.5 w-3.5" />
                            )}
                            <span className="sr-only">
                              {reminder.is_completed ? "Mark as incomplete" : "Mark as complete"}
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDeleteReminder(reminder.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                {reminders.filter(r => !r.is_completed).length === 0 && (
                  <div className="text-center py-3 text-flitx-gray-500 text-sm">
                    No upcoming reminders
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Completed Reminders */}
          <AccordionItem value="completed" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-flitx-gray-50">
              <span className="flex gap-2 items-center">
                <BellOff className="h-4 w-4 text-flitx-gray-400" />
                Completed
                <span className="ml-2 rounded-full bg-flitx-gray-100 px-2 py-0.5 text-xs text-flitx-gray-500">
                  {reminders.filter(r => r.is_completed).length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 p-2">
                {reminders
                  .filter(reminder => reminder.is_completed)
                  .map(reminder => (
                    <div 
                      key={reminder.id}
                      className="relative rounded-md border border-gray-200 p-3 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium line-through text-flitx-gray-500">{reminder.title}</h3>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-flitx-gray-400">
                            <span className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {format(new Date(reminder.event_date), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400"
                            onClick={() => handleToggleCompletion(reminder)}
                          >
                            <Bell className="h-3.5 w-3.5" />
                            <span className="sr-only">Mark as incomplete</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDeleteReminder(reminder.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                {reminders.filter(r => r.is_completed).length === 0 && (
                  <div className="text-center py-3 text-flitx-gray-500 text-sm">
                    No completed reminders
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Add Reminder Dialog */}
      <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Reminder</DialogTitle>
            <DialogDescription>
              Create a reminder for your vehicle's maintenance, service, or other important events.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reminder Type</Label>
              <Select onValueChange={handlePredefinedSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reminder type" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter reminder title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add additional details"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(eventDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={eventDate}
                    onSelect={(date) => date && setEventDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Every 3 months</SelectItem>
                    <SelectItem value="biannually">Every 6 months</SelectItem>
                    <SelectItem value="annually">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Notification</Label>
                <Select 
                  value={notificationDays.toString()} 
                  onValueChange={(value) => setNotificationDays(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">1 week before</SelectItem>
                    <SelectItem value="14">2 weeks before</SelectItem>
                    <SelectItem value="30">1 month before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setIsAddReminderOpen(false);
            }}>
              Cancel
            </Button>
            <Button className="bg-flitx-blue hover:bg-flitx-blue-600" onClick={handleAddReminder}>
              Save Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Reminder Dialog */}
      <Dialog open={isEditReminderOpen} onOpenChange={setIsEditReminderOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
            <DialogDescription>
              Update the details of this reminder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input 
                id="edit-title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter reminder title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add additional details"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(eventDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={eventDate}
                    onSelect={(date) => date && setEventDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Every 3 months</SelectItem>
                    <SelectItem value="biannually">Every 6 months</SelectItem>
                    <SelectItem value="annually">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Notification</Label>
                <Select 
                  value={notificationDays.toString()} 
                  onValueChange={(value) => setNotificationDays(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">1 week before</SelectItem>
                    <SelectItem value="14">2 weeks before</SelectItem>
                    <SelectItem value="30">1 month before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setIsEditReminderOpen(false);
              setCurrentReminder(null);
            }}>
              Cancel
            </Button>
            <Button className="bg-flitx-blue hover:bg-flitx-blue-600" onClick={handleEditReminder}>
              Update Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
