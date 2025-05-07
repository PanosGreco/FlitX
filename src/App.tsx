
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Fleet from "./pages/Fleet";
import VehicleDetail from "./pages/VehicleDetail";
import Finance from "./pages/Finance";
import Tracking from "./pages/Tracking";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import BoatsHome from "./pages/BoatsHome";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TestModeProvider } from "./contexts/TestModeContext";
import { RouteGuard } from "./components/auth/RouteGuard";
import { useEffect } from "react";
import { ensureStorageBuckets } from "./services/storageService";

const queryClient = new QueryClient();

const App = () => {
  // Initialize storage buckets when app loads
  useEffect(() => {
    ensureStorageBuckets();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TestModeProvider>
              <AuthProvider>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<RouteGuard><Fleet /></RouteGuard>} />
                  <Route path="/vehicle/:id" element={<RouteGuard><VehicleDetail /></RouteGuard>} />
                  <Route path="/finances" element={<RouteGuard><Finance /></RouteGuard>} />
                  <Route path="/tracking" element={<RouteGuard><Tracking /></RouteGuard>} />
                  <Route path="/profile" element={<RouteGuard><Profile /></RouteGuard>} />
                  <Route path="/boats" element={<RouteGuard><BoatsHome /></RouteGuard>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </TestModeProvider>
          </BrowserRouter>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
