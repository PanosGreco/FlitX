import { cn } from "@/lib/utils";

interface BackgroundGlowProps {
  children: React.ReactNode;
  className?: string;
}

export function BackgroundGlow({ children, className }: BackgroundGlowProps) {
  return (
    <div className={cn("relative min-h-full", className)}>
      {/* Light Sky Blue Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "hsl(199, 89%, 68%)" }}
        />
        {/* Soft Yellow Glow */}
        <div
          className="absolute left-1/4 top-2/3 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "hsl(48, 96%, 70%)" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default BackgroundGlow;
