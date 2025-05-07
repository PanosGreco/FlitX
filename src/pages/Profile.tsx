
import { MobileLayout } from "@/components/layout/MobileLayout";
import { UserProfile } from "@/components/profile/UserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTestMode } from "@/contexts/TestModeContext";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const { isTestMode } = useTestMode();
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isTestMode) {
      // In test mode, we don't need to redirect
      setIsInitialized(true);
      return;
    }
    
    // Only redirect if not in test mode and not authenticated
    if (!loading) {
      if (!user && !isTestMode) {
        navigate('/auth?mode=signin');
      } else {
        setIsInitialized(true);
      }
    }
  }, [user, loading, navigate, isTestMode]);
  
  // Show loading spinner while checking authentication
  if (loading && !isTestMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Prevent flickering by waiting until we know whether we should render or redirect
  if (!isInitialized && !isTestMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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
