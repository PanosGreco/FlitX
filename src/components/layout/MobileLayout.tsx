
import { useState, useEffect } from "react";
import { MobileSidebar } from "./MobileSidebar";
import { MobileHeader } from "./MobileHeader";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Set CSS variable for mobile vh to handle mobile browser address bar
  useEffect(() => {
    const setVhVariable = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVhVariable();
    window.addEventListener('resize', setVhVariable);
    
    return () => {
      window.removeEventListener('resize', setVhVariable);
    };
  }, []);

  return (
    <div className="relative min-h-screen-safe bg-gray-50">
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
