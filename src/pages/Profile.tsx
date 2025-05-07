
import { MobileLayout } from "@/components/layout/MobileLayout";
import { UserProfile } from "@/components/profile/UserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTestMode } from "@/contexts/TestModeContext";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const { isTestMode } = useTestMode();
  const navigate = useNavigate();
  
  // Don't do any redirects if test mode is enabled
  if (isTestMode) {
    return (
      <MobileLayout>
        <div className="container py-6">
          <UserProfile />
        </div>
      </MobileLayout>
    );
  }
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Redirect to auth if not authenticated and not in test mode
  if (!user && !isTestMode) {
    navigate('/auth?mode=signin');
    return null;
  }
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <UserProfile />
      </div>
    </MobileLayout>
  );
};

export default Profile;
