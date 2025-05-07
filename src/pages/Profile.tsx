
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
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Don't do any redirects if test mode is enabled
    if (isTestMode) {
      setIsReady(true);
      return;
    }
    
    // Only check auth if not in test mode and loading is complete
    if (!loading) {
      setIsReady(true);
      if (!user && !isTestMode) {
        navigate('/auth?mode=signin');
      }
    }
  }, [user, loading, isTestMode, navigate]);
  
  // Show loading spinner while checking authentication or initializing
  if (!isReady || (!isTestMode && loading)) {
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
