import { useState, useRef, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Home,
  Calendar,
  Sparkles,
  Car,
  Map,
  Settings,
} from "lucide-react";
import { glassTokens } from "@/styles/glass-tokens";
import { useGlassTheme } from "@/hooks/useGlassTheme";
import flitxLogo from "@/assets/fleetx-logo.png";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel: string;
}

const navItems: NavItem[] = [
  { label: "Analytics", href: "/finances", icon: BarChart3, ariaLabel: "Analytics" },
  { label: "Home", href: "/", icon: Home, ariaLabel: "Home" },
  { label: "Daily Program", href: "/daily-program", icon: Calendar, ariaLabel: "Daily Program" },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles, ariaLabel: "AI Assistant" },
  { label: "Fleet", href: "/fleet", icon: Car, ariaLabel: "Fleet" },
  { label: "Tracking", href: "/tracking", icon: Map, ariaLabel: "Tracking" },
];

const ITEM_HEIGHT = 56; // height per nav item in px

export function GlassSidebar() {
  const location = useLocation();
  const { isGlassEnabled } = useGlassTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const activeIndex = navItems.findIndex(
    (item) => item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)
  );

  const indicatorIndex = hoveredIndex !== null ? hoveredIndex : activeIndex;

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  return (
    <aside
      className="fixed inset-y-0 left-0 w-[72px] flex flex-col items-center py-4 glass-sidebar"
      style={{ zIndex: glassTokens.zIndex.sidebar, contain: 'layout style' }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center w-10 h-10">
        <img src={flitxLogo} alt="FlitX" className="w-8 h-8 object-contain" />
      </div>

      {/* Navigation items */}
      <nav
        ref={navRef}
        className="flex-1 flex flex-col items-center relative"
        onMouseLeave={handleMouseLeave}
      >
        {/* Liquid glass indicator */}
        {indicatorIndex >= 0 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[48px] h-[48px] rounded-2xl glass-indicator pointer-events-none"
            style={{
              transform: `translateX(-50%) translateY(${indicatorIndex * ITEM_HEIGHT + 4}px)`,
              transition: glassTokens.transition.indicator,
              willChange: 'transform',
            }}
          />
        )}

        {navItems.map((item, index) => {
          const isActive = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={item.href}
              className="relative flex flex-col items-center"
              style={{ height: ITEM_HEIGHT }}
              onMouseEnter={() => setHoveredIndex(index)}
            >
              <NavLink
                to={item.href}
                aria-label={item.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className={`
                  relative z-10 flex items-center justify-center w-[48px] h-[48px] rounded-2xl
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${isActive
                    ? "text-primary"
                    : isHovered
                      ? "text-foreground/90"
                      : "text-muted-foreground/60"
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
              </NavLink>

              {/* Section name label on hover */}
              <div
                className={`
                  absolute top-[48px] left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-[10px] font-medium text-foreground/70
                  transition-all duration-200
                  ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}
                `}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Divider + Settings */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="w-8 h-px bg-border/30 mb-2" />
        <NavLink
          to="/profile"
          aria-label="Settings"
          className={`
            flex items-center justify-center w-[48px] h-[48px] rounded-2xl
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            ${location.pathname === "/profile"
              ? "text-primary glass-indicator-active"
              : "text-muted-foreground/60 hover:text-foreground/90"
            }
          `}
        >
          <Settings className="h-5 w-5" />
        </NavLink>
      </div>
    </aside>
  );
}
