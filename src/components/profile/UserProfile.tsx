import { useState, useEffect } from "react";
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
  Bell,
  Upload,
  Globe,
  LogOut,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTestMode } from "@/contexts/TestModeContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function UserProfile() {
  const [activeTab, setActiveTab] = useState("account");
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: ""
  });
  
  const { language, setLanguage, t } = useLanguage();
  const { user, userProfile, updateProfile, signOut } = useAuth();
  const { isTestMode } = useTestMode();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if there's a saved profile image
    if (userProfile?.avatar_url) {
      setProfileImage(userProfile.avatar_url);
    }
    
    // Initialize form with user data
    if (user && userProfile) {
      const fullName = userProfile.full_name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      setFormState({
        firstName,
        lastName,
        email: user.email || "",
        phone: userProfile.phone || "",
        company: userProfile.business_name || ""
      });
    }
  }, [userProfile, user]);

  const handleLanguageChange = (newLang: "en" | "el") => {
    setLanguage(newLang);
    
    toast(newLang === "en" 
      ? "Your language preference has been set to English"
      : "Η προτίμηση γλώσσας σας έχει οριστεί στα Ελληνικά"
    );
  };
  
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && user) {
      try {
        setIsLoading(true);
        const file = e.target.files[0];
        
        if (isTestMode) {
          // In test mode, just update the UI
          const fakeUrl = URL.createObjectURL(file);
          setProfileImage(fakeUrl);
          
          // Update the test user profile
          await updateProfile({ avatar_url: fakeUrl });
          
          toast(t.photoUpdateSuccess);
          setIsLoading(false);
          return;
        }
        
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('vehicles') // Using the vehicles bucket for now
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('vehicles')
          .getPublicUrl(filePath);
        
        // Update profile with new avatar URL
        await updateProfile({ avatar_url: publicUrl });
        
        setProfileImage(publicUrl);
        
        toast(t.photoUpdateSuccess);
      } catch (error) {
        console.error('Error uploading profile photo:', error);
        toast.error("Failed to upload profile photo");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Combine first and last name
      const fullName = `${formState.firstName} ${formState.lastName}`.trim();
      
      // Update profile in Supabase
      await updateProfile({
        full_name: fullName,
        business_name: formState.company,
        phone: formState.phone
      });
      
      toast(t.profileUpdateSuccess);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await signOut();
    navigate('/auth?mode=signin');
  };

  // Show loading state if user or userProfile is not available yet
  if (!user || !userProfile) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div>
        <h1 className="text-2xl font-bold">{t.myProfile}</h1>
        <p className="text-flitx-gray-500">
          {t.profileSubtitle}
        </p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md mb-4">
          <TabsTrigger value="account">{t.tabs.account}</TabsTrigger>
          <TabsTrigger value="security">{t.tabs.security}</TabsTrigger>
          <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.personalInfo.title}</CardTitle>
                <CardDescription>
                  {t.personalInfo.subtitle}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="h-20 w-20 border border-input shadow-sm">
                      {profileImage ? (
                        <AvatarImage src={profileImage} className="object-cover" />
                      ) : (
                        <AvatarFallback className="text-xl">
                          {formState.firstName.charAt(0)}{formState.lastName.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="space-y-2">
                      <label htmlFor="profile-upload" className="cursor-pointer">
                        <input
                          id="profile-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleProfilePhotoUpload}
                          disabled={isLoading}
                        />
                        <Button variant="outline" size="sm" asChild disabled={isLoading}>
                          <span>
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {t.personalInfo.uploadPhoto}
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-flitx-gray-400">
                        {t.personalInfo.photoRestriction}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t.personalInfo.firstName}</Label>
                        <Input 
                          id="firstName" 
                          value={formState.firstName}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t.personalInfo.lastName}</Label>
                        <Input 
                          id="lastName" 
                          value={formState.lastName}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.personalInfo.email}</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={formState.email}
                        onChange={handleFormChange}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t.personalInfo.phone}</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        value={formState.phone}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company">{t.personalInfo.company}</Label>
                      <Input 
                        id="company" 
                        value={formState.company}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      className="bg-flitx-blue hover:bg-flitx-blue-600"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                    >
                      {isLoading ? t.personalInfo.saving : t.personalInfo.saveChanges}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.language.title}</CardTitle>
                <CardDescription>
                  {t.language.subtitle}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.language.languageLabel}</Label>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      variant={language === "en" ? "default" : "outline"}
                      className={language === "en" ? "bg-flitx-blue hover:bg-flitx-blue-600" : ""}
                      onClick={() => handleLanguageChange("en")}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      {t.language.english}
                    </Button>
                    <Button 
                      variant={language === "el" ? "default" : "outline"}
                      className={language === "el" ? "bg-flitx-blue hover:bg-flitx-blue-600" : ""}
                      onClick={() => handleLanguageChange("el")}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      {t.language.greek}
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
                <CardTitle className="text-lg">{t.security.title}</CardTitle>
                <CardDescription>
                  {t.security.subtitle}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">{t.security.currentPassword}</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">{t.security.newPassword}</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t.security.confirmPassword}</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      className="bg-flitx-blue text-white hover:bg-flitx-blue-600"
                    >
                      {t.security.updatePassword}
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-4">{t.security.twoFactorTitle}</h3>
                  
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-flitx-blue" />
                        <span className="font-medium">{t.security.twoFactorTitle}</span>
                      </div>
                      <p className="text-sm text-flitx-gray-500">
                        {t.security.twoFactorDescription}
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
                <CardTitle className="text-lg">{t.notifications.title}</CardTitle>
                <CardDescription>
                  {t.notifications.subtitle}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.emailNotifications}</div>
                    <div className="text-xs text-flitx-gray-500">
                      {t.notifications.emailDescription}
                    </div>
                  </div>
                  <Switch id="email-notifications" defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.pushNotifications}</div>
                    <div className="text-xs text-flitx-gray-500">
                      {t.notifications.pushDescription}
                    </div>
                  </div>
                  <Switch id="push-notifications" defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.maintenanceReminders}</div>
                    <div className="text-xs text-flitx-gray-500">
                      {t.notifications.maintenanceDescription}
                    </div>
                  </div>
                  <Switch id="maintenance-reminders" defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.bookingAlerts}</div>
                    <div className="text-xs text-flitx-gray-500">
                      {t.notifications.bookingDescription}
                    </div>
                  </div>
                  <Switch id="booking-alerts" defaultChecked />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.dangerZone.title}</CardTitle>
                <CardDescription>
                  {t.dangerZone.subtitle}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.dangerZone.signOutAll}</div>
                    <div className="text-xs text-flitx-gray-500">
                      {t.dangerZone.signOutDescription}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    {t.dangerZone.signOutButton}
                  </Button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.dangerZone.deleteAccount}</div>
                    <div className="text-xs text-flitx-gray-500">
                      {t.dangerZone.deleteDescription}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    {t.dangerZone.deleteButton}
                  </Button>
                </div>

                <div className="pt-4">
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
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
