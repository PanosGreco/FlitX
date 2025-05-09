
import { useState } from "react";
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

const Finance = () => {
  const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordType, setRecordType] = useState("income");
  const { toast } = useToast();

  const handleOpenAddFinance = () => {
    setIsAddFinanceOpen(true);
  };
  
  const handleSubmitFinanceRecord = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsAddFinanceOpen(false);
      
      toast({
        title: "Record Added",
        description: `New ${recordType} record has been added`,
      });
    }, 1500);
  };
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <FinanceDashboard onAddRecord={handleOpenAddFinance} />
        
        {/* Add Finance Record Dialog */}
        <Dialog open={isAddFinanceOpen} onOpenChange={setIsAddFinanceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Financial Record</DialogTitle>
              <DialogDescription>
                Enter the details for the new income or expense.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitFinanceRecord} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recordType">Record Type</Label>
                <Select value={recordType} onValueChange={setRecordType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {recordType === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="expenseType">Expense Category</Label>
                  <Select defaultValue="fuel">
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="fuel">Fuel</SelectItem>
                        <SelectItem value="maintenance">Vehicle Maintenance</SelectItem>
                        <SelectItem value="carwash">Car Wash</SelectItem>
                        <SelectItem value="salary">Employee Salaries</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="e.g. 250.00"
                  min={0}
                  step="0.01"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  defaultValue={new Date().toISOString().substring(0, 10)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Add any additional details about this transaction"
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddFinanceOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Record"}
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
