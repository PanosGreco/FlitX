
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Settings,
  Bell,
  Upload,
  UserCog,
  LogOut
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function UserProfile() {
  const [activeTab, setActiveTab] = useState("account");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSaveProfile = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-flitx-gray-500">
          Manage your account settings and preferences
        </p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md mb-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="h-20 w-20 border border-input shadow-sm">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-xl">JD</AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                      <p className="text-xs text-flitx-gray-400">
                        JPG, GIF or PNG. Max size of 800K
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" defaultValue="John" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" defaultValue="Doe" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="john.doe@example.com" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input id="company" defaultValue="Acme Car Rentals" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      className="bg-flitx-blue hover:bg-flitx-blue-600"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Password & Authentication</CardTitle>
                <CardDescription>
                  Update your password and security settings
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      className="bg-flitx-blue text-white hover:bg-flitx-blue-600"
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-4">Two-Factor Authentication</h3>
                  
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-flitx-blue" />
                        <span className="font-medium">Two-Factor Authentication</span>
                      </div>
                      <p className="text-sm text-flitx-gray-500">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    
                    <div className="flex items-center">
                      <Switch id="2fa" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>
                  Configure how you receive notifications
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Email Notifications</div>
                    <div className="text-xs text-flitx-gray-500">
                      Receive email notifications for important updates
                    </div>
                  </div>
                  <Switch id="email-notifications" defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Push Notifications</div>
                    <div className="text-xs text-flitx-gray-500">
                      Receive push notifications on your mobile device
                    </div>
                  </div>
                  <Switch id="push-notifications" defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Maintenance Reminders</div>
                    <div className="text-xs text-flitx-gray-500">
                      Get notified when vehicles need service
                    </div>
                  </div>
                  <Switch id="maintenance-reminders" defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Booking Alerts</div>
                    <div className="text-xs text-flitx-gray-500">
                      Get notified for new bookings and cancellations
                    </div>
                  </div>
                  <Switch id="booking-alerts" defaultChecked />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Danger Zone</CardTitle>
                <CardDescription>
                  Actions here can't be undone
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Sign out of all devices</div>
                    <div className="text-xs text-flitx-gray-500">
                      Log out from all devices where you're currently signed in
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    Sign Out All
                  </Button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Delete account</div>
                    <div className="text-xs text-flitx-gray-500">
                      Permanently delete your account and all your data
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
