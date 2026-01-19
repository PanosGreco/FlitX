import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Upload,
  Globe,
  LogOut,
  Trash2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function UserProfile() {
  const navigate = useNavigate();
  const { profile, user, signOut, updateProfile, refreshProfile, isLoading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("account");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Form state - initialized from profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Populate form from profile when it loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || user?.email || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url);
    } else if (user) {
      setEmail(user.email || "");
      setName(user.user_metadata?.name || "");
    }
  }, [profile, user]);

  const getInitials = () => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleLanguageChange = (newLang: "en" | "el") => {
    setLanguage(newLang);
    toast({
      title: newLang === "en" ? "Language Updated" : "Η Γλώσσα Ενημερώθηκε",
      description: newLang === "en"
        ? "Your language preference has been set to English"
        : "Η προτίμηση γλώσσας σας έχει οριστεί στα Ελληνικά",
    });
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      if (event.target?.result) {
        const imageUrl = event.target.result.toString();
        setAvatarUrl(imageUrl);
        
        // Save to profile
        const { error } = await updateProfile({ avatar_url: imageUrl });
        if (error) {
          toast({
            title: "Error",
            description: "Failed to update profile photo",
            variant: "destructive",
          });
        } else {
          toast({
            title: t.photoUpdated,
            description: t.photoUpdateSuccess,
          });
        }
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const isEmailChanging = email !== (user.email || "");

    setIsLoading(true);
    const { error } = await updateProfile({
      name,
      email,
      phone,
    });
    setIsLoading(false);

    if (error) {
      // Detect rate limit errors and show user-friendly message
      const isRateLimited = error.message?.includes("security") || error.message?.includes("rate") || error.message?.includes("wait");
      toast({
        title: isRateLimited ? (language === "el" ? "Παρακαλώ περιμένετε" : "Please Wait") : "Error",
        description: isRateLimited 
          ? (language === "el" ? "Για λόγους ασφαλείας, περιμένετε 60 δευτερόλεπτα πριν δοκιμάσετε ξανά." : "For security, please wait 60 seconds before trying again.")
          : (error.message || "Failed to update profile. Please try again."),
        variant: "destructive",
      });
    } else {
      // Show appropriate message based on whether email changed
      if (isEmailChanging) {
        toast({
          title: t.profileUpdated,
          description: language === "el" 
            ? "Το email σας ενημερώθηκε επιτυχώς."
            : "Your email has been updated successfully.",
        });
      } else {
        toast({
          title: t.profileUpdated,
          description: t.profileUpdateSuccess,
        });
      }
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/auth", { replace: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Delete all user data from tables (RLS ensures only user's data is deleted)
      // Order matters: delete child records before parent records to respect foreign keys
      await supabase.from('daily_tasks').delete().eq('user_id', user.id);
      await supabase.from('damage_reports').delete().eq('user_id', user.id);
      await supabase.from('financial_records').delete().eq('user_id', user.id);
      await supabase.from('vehicle_maintenance').delete().eq('user_id', user.id);
      await supabase.from('vehicle_reminders').delete().eq('user_id', user.id);
      await supabase.from('vehicle_documents').delete().eq('user_id', user.id);
      await supabase.from('maintenance_blocks').delete().eq('user_id', user.id);
      // Delete booking_contacts before rental_bookings (foreign key dependency)
      await supabase.from('booking_contacts').delete().eq('user_id', user.id);
      await supabase.from('rental_bookings').delete().eq('user_id', user.id);
      await supabase.from('vehicles').delete().eq('user_id', user.id);
      await supabase.from('user_roles').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);

      // Sign out and let user know they need to contact support for full account deletion
      // (Supabase doesn't allow deleting auth.users from client)
      await signOut();
      
      toast({
        title: "Account data deleted",
        description: "Your data has been permanently deleted. You have been signed out.",
      });
      
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div>
        <h1 className="text-2xl font-bold">{t.myProfile}</h1>
        <p className="text-muted-foreground">{t.profileSubtitle}</p>
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
                <CardDescription>{t.personalInfo.subtitle}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="h-20 w-20 border border-input shadow-sm">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} className="object-cover" />
                      ) : (
                        <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
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
                        />
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {t.personalInfo.uploadPhoto}
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {t.personalInfo.photoRestriction}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t.personalInfo.firstName}</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t.personalInfo.email}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t.personalInfo.phone}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.personalInfo.saving}
                        </>
                      ) : (
                        t.personalInfo.saveChanges
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.language.title}</CardTitle>
                <CardDescription>{t.language.subtitle}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.language.languageLabel}</Label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={language === "en" ? "default" : "outline"}
                      onClick={() => handleLanguageChange("en")}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      {t.language.english}
                    </Button>
                    <Button
                      variant={language === "el" ? "default" : "outline"}
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
                <CardDescription>{t.security.subtitle}</CardDescription>
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
                    <Button variant="outline">{t.security.updatePassword}</Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-medium mb-4">{t.security.twoFactorTitle}</h3>

                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-primary" />
                        <span className="font-medium">{t.security.twoFactorTitle}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
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
                <CardDescription>{t.notifications.subtitle}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.emailNotifications}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.notifications.emailDescription}
                    </div>
                  </div>
                  <Switch id="email-notifications" defaultChecked />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.pushNotifications}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.notifications.pushDescription}
                    </div>
                  </div>
                  <Switch id="push-notifications" defaultChecked />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.maintenanceReminders}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.notifications.maintenanceDescription}
                    </div>
                  </div>
                  <Switch id="maintenance-reminders" defaultChecked />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.notifications.bookingAlerts}</div>
                    <div className="text-xs text-muted-foreground">
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
                <CardDescription>{t.dangerZone.subtitle}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.dangerZone.signOutAll}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.dangerZone.signOutDescription}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        {t.dangerZone.signOutButton}
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{t.dangerZone.deleteAccount}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.dangerZone.deleteDescription}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t.dangerZone.deleteButton}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove all your data including vehicles, bookings, financial records,
                          and maintenance history from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete Account"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
