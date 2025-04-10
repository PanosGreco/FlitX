
import React, { useState } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Marina } from "@/components/fleet/Marina";
import { sampleBoats } from "@/lib/boatData";
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
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Sailboat, Ship } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const BoatsHome = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [boatImage, setBoatImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleAddBoat = () => {
    setIsAddDialogOpen(true);
  };
  
  const handleBoatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          setBoatImage(event.target.result.toString());
        }
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmitNewBoat = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsAddDialogOpen(false);
      setBoatImage(null); // Reset image after submit
      
      toast({
        title: "Boat Added",
        description: "Your new boat has been added to the fleet.",
      });
    }, 1500);
  };
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <Marina 
          boats={sampleBoats} 
          onAddBoat={handleAddBoat}
        />
        
        {/* Add Boat Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Boat</DialogTitle>
              <DialogDescription>
                Enter the details of your new boat.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitNewBoat} className="space-y-4">
              {/* Boat Image Upload */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-32 w-full bg-flitx-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {boatImage ? (
                    <img 
                      src={boatImage} 
                      alt="Boat preview" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Ship className="h-12 w-12 text-flitx-gray-300" />
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <label 
                    htmlFor="boat-photo-upload" 
                    className="flex items-center px-3 py-1.5 text-sm border border-input rounded-md bg-background hover:bg-accent cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                    <input
                      id="boat-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBoatImageUpload}
                    />
                  </label>
                </div>
                <p className="text-xs text-flitx-gray-400 mt-1">
                  Upload a clear photo of your boat
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Boat Name</Label>
                <Input id="name" placeholder="e.g. Sea Breeze" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input id="make" placeholder="e.g. Bayliner" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" placeholder="e.g. Element E18" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    placeholder="e.g. 2023"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Boat Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Boat Types</SelectLabel>
                        <SelectItem value="deck-boat">Deck Boat</SelectItem>
                        <SelectItem value="cruiser">Cruiser</SelectItem>
                        <SelectItem value="center-console">Center Console</SelectItem>
                        <SelectItem value="pontoon">Pontoon</SelectItem>
                        <SelectItem value="dual-console">Dual Console</SelectItem>
                        <SelectItem value="sailboat">Sailboat</SelectItem>
                        <SelectItem value="fishing-boat">Fishing Boat</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input id="registrationNumber" placeholder="e.g. FL1234AB" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Daily Rate ($)</Label>
                  <Input 
                    id="dailyRate" 
                    type="number" 
                    placeholder="e.g. 250.00"
                    min={0}
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Length (feet)</Label>
                  <Input 
                    id="length" 
                    type="number" 
                    placeholder="e.g. 18"
                    min={0}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (people)</Label>
                  <Input 
                    id="capacity" 
                    type="number" 
                    placeholder="e.g. 8"
                    min={1}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="engineHours">Engine Hours</Label>
                <Input 
                  id="engineHours" 
                  type="number" 
                  placeholder="e.g. 125"
                  min={0}
                  required
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setBoatImage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Boat"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default BoatsHome;
