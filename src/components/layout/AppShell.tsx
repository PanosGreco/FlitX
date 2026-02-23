import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlassTheme } from "@/hooks/useGlassTheme";
import { GlassSidebar } from "./GlassSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { MobileHeader } from "./MobileHeader";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isGlassEnabled } = useGlassTheme();

  // Set CSS variable for mobile vh to handle mobile browser address bar
  useEffect(() => {
    const setVhVariable = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVhVariable();
    window.addEventListener('resize', setVhVariable);
    return () => window.removeEventListener('resize', setVhVariable);
  }, []);

  // Desktop layout with permanent sidebar
  if (!isMobile) {
    return (
      <div className="relative min-h-screen bg-background flex">
        {/* Reserved sidebar width to prevent CLS */}
        <div className="w-[72px] flex-shrink-0">
          {isGlassEnabled ? (
            <GlassSidebar />
          ) : (
            <GlassSidebar />
          )}
        </div>
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Mobile layout with hamburger sidebar
  return (
    <div className="relative min-h-screen-safe bg-background">
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col min-h-screen">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
