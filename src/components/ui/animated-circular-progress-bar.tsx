import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  max: number
  value: number
  min: number
  gaugePrimaryColor: string
  gaugeSecondaryColor: string
  className?: string
  displayValue?: React.ReactNode
  tooltipContent?: React.ReactNode
}

export function AnimatedCircularProgressBar({
  max = 100,
  min = 0,
  value = 0,
  gaugePrimaryColor,
  gaugeSecondaryColor,
  className,
  displayValue,
  tooltipContent,
}: Props) {
  const circumference = 2 * Math.PI * 45
  const percentPx = circumference / 100

  const safeRange = max - min
  const normalizedPercent =
    safeRange > 0 ? ((value - min) / safeRange) * 100 : 0

  // 21st.dev ring uses a 90% drawable arc to preserve a fixed visual gap.
  // Keep percent semantics (0–100) but map to 0–90 for the arc drawing.
  const currentPercent = Math.max(0, Math.min(100, normalizedPercent))
  const primaryArcPercent = (currentPercent / 100) * 90
  const secondaryArcPercent = 90 - primaryArcPercent

  const progressCircle = (
    <circle
      cx="50"
      cy="50"
      r="45"
      strokeWidth="10"
      strokeDashoffset="0"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-100"
      style={
        {
          stroke: gaugePrimaryColor,
          "--stroke-percent": primaryArcPercent,
          "--offset-factor-secondary": "calc(1 - var(--offset-factor))",
          strokeDasharray:
            "calc(var(--stroke-percent) * var(--percent-to-px) - var(--gap-percent-to-px)) var(--circumference)",
          transform:
            "rotate(calc(1turn - 90deg - (var(--gap-percent) * var(--percent-to-deg) * var(--offset-factor-secondary)))) scaleY(-1)",
          transition:
            "all var(--transition-length) ease var(--delay),stroke var(--transition-length) ease var(--delay)",
          transformOrigin: "calc(var(--circle-size) / 2) calc(var(--circle-size) / 2)",
        } as React.CSSProperties
      }
    />
  )

  return (
    <div
      className={cn("relative size-32 text-2xl font-semibold", className)}
      style={
        {
          "--circle-size": "100px",
          "--circumference": circumference,
          "--percent-to-px": `${percentPx}px`,
          "--gap-percent": "5",
          "--offset-factor": "0",
          "--transition-length": "1s",
          "--transition-step": "200ms",
          "--delay": "0s",
          "--percent-to-deg": "3.6deg",
          "--gap-percent-to-deg": "calc(var(--gap-percent) * var(--percent-to-deg))",
          "--gap-percent-to-px": "calc(var(--gap-percent) * var(--percent-to-px))",
        } as React.CSSProperties
      }
    >
      <svg
        fill="none"
        className="size-full"
        strokeWidth="2"
        viewBox="0 0 100 100"
      >
        {/* Primary (Blue) - Depreciated amount */}
        {tooltipContent ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <g className="cursor-pointer">{progressCircle}</g>
              </TooltipTrigger>
              <TooltipContent>
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          progressCircle
        )}
        
        {/* Secondary (Gray/White) - Remaining amount */}
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="10"
          strokeDashoffset="0"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-100"
          style={
            {
              stroke: gaugeSecondaryColor,
              "--stroke-percent": secondaryArcPercent,
              "--offset-factor-secondary": "calc(1 - var(--offset-factor))",
              strokeDasharray:
                "calc(var(--stroke-percent) * var(--percent-to-px) - var(--gap-percent-to-px)) var(--circumference)",
              transform:
                "rotate(calc(-90deg + var(--gap-percent) * var(--percent-to-deg) * var(--offset-factor))) scaleY(-1)",
              transition:
                "all var(--transition-length) ease var(--delay),stroke var(--transition-length) ease var(--delay)",
              transformOrigin: "calc(var(--circle-size) / 2) calc(var(--circle-size) / 2)",
            } as React.CSSProperties
          }
        />
      </svg>
      <span
        className="duration-[var(--transition-length)] delay-[var(--delay)] absolute inset-0 m-auto size-fit ease-linear animate-in fade-in flex items-center justify-center"
      >
        {displayValue !== undefined ? displayValue : `${Math.round(currentPercent)}%`}
      </span>
    </div>
  )
}
