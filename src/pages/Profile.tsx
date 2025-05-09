
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
  
  // Remove the isReady state as it's causing the endless loading
  
  useEffect(() => {
    // Only redirect if not in test mode, not loading, and no user
    if (!isTestMode && !loading && !user) {
      navigate('/auth?mode=signin');
    }
  }, [user, loading, isTestMode, navigate]);
  
  // Show loading spinner only while checking authentication
  if (!isTestMode && loading) {
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
