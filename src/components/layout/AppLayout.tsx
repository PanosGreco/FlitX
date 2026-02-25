
import { DesktopSidebar } from "./DesktopSidebar";
import { BottomNavigation } from "./BottomNavigation";
import { LanguageSwitcher } from "@/components/signup/LanguageSwitcher";
import { BackgroundShader } from "@/components/ui/background-shader";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background relative">
      <BackgroundShader />
      {/* Permanent desktop sidebar */}
      <DesktopSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile header - only visible on mobile */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-background border-b border-border">
          <div className="font-bold text-primary text-xl tracking-tight">
            FlitX
          </div>
          <LanguageSwitcher />
        </header>

        {/* Desktop top bar with language switcher */}
        <header className="hidden lg:flex items-center justify-end h-12 px-6 border-b border-border bg-background">
          <LanguageSwitcher />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNavigation />
    </div>
  );
}
