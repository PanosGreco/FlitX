
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
import SignUpPage from "./pages/SignUp";
import BoatsHome from "./pages/BoatsHome";
import DailyProgram from "./pages/DailyProgram";
import { LanguageProvider } from "./contexts/LanguageContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Fleet />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/vehicle/:id" element={<VehicleDetail />} />
            <Route path="/finances" element={<Finance />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/daily-program" element={<DailyProgram />} />
            <Route path="/boats" element={<BoatsHome />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
