import { ReactNode } from "react";
import { Car, DollarSign, CalendarDays, TrendingUp } from "lucide-react";
import fleetxLogo from "@/assets/fleetx-logo.png";

interface AuthLayoutProps {
  children: ReactNode;
}

const DashboardCard = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) => (
  <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 flex items-center gap-3">
    <div className="rounded-lg bg-white/20 p-2.5">
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-white/70">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-lg font-bold text-white">{value}</p>
        {accent && (
          <span className="flex items-center text-xs font-medium text-emerald-300">
            <TrendingUp className="h-3 w-3 mr-0.5" />
            {accent}
          </span>
        )}
      </div>
    </div>
  </div>
);

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid grid-rows-[1fr_auto] lg:grid-rows-1 lg:grid-cols-2">
      {/* Left — Form Section */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24 bg-background">
        <div className="w-full max-w-md mx-auto">
          <img
            src={fleetxLogo}
            alt="FlitX"
            className="h-12 w-auto object-contain mb-10"
          />
          {children}
        </div>
      </div>

      {/* Right — Marketing Panel */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(217,71%,38%)] to-[hsl(217,80%,28%)] p-8 lg:p-12 xl:p-16 lg:m-3 lg:rounded-2xl">
        <div className="max-w-md text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Manage Your Rental Fleet in One Place
          </h2>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            Automate bookings, track vehicles, and monitor revenue with FlitX —
            the modern operating system for rental businesses.
          </p>

          {/* Decorative dashboard cards */}
          <div className="grid gap-3 pt-4">
            <DashboardCard
              icon={DollarSign}
              label="Today's Revenue"
              value="€2,450"
              accent="+12%"
            />
            <div className="grid grid-cols-2 gap-3">
              <DashboardCard
                icon={Car}
                label="Active Vehicles"
                value="24"
              />
              <DashboardCard
                icon={CalendarDays}
                label="Bookings This Week"
                value="18"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
