
import { useAuth } from "@/contexts/AuthContext";
import { useTestMode } from "@/contexts/TestModeContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard = ({ children }: RouteGuardProps) => {
  const { user, loading } = useAuth();
  const { isTestMode } = useTestMode();
  const location = useLocation();
  
  // Allow access when in test mode
  if (isTestMode) {
    return <>{children}</>;
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    // Save the location they were trying to go to for redirection after login
    return <Navigate to="/auth?mode=signin" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};
