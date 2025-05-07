
import { useAuth } from "@/contexts/AuthContext";
import { useTestMode } from "@/contexts/TestModeContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard = ({ children }: RouteGuardProps) => {
  const { user, loading } = useAuth();
  const { isTestMode } = useTestMode();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Wait until we know the auth and test mode state
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);
  
  // Show loading state until everything is initialized
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Always allow access when in test mode, regardless of the page
  if (isTestMode) {
    return <>{children}</>;
  }
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    // Save the location they were trying to go to for redirection after login
    return <Navigate to="/auth?mode=signin" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};
