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
  const radius = 45
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius

  // Calculate percentage (clamped 0-100)
  const safeRange = max - min
  const normalizedPercent = safeRange > 0 ? ((value - min) / safeRange) * 100 : 0
  const currentPercent = Math.max(0, Math.min(100, normalizedPercent))

  // Calculate stroke dash for progress arc
  const progressLength = (currentPercent / 100) * circumference
  const remainingLength = circumference - progressLength

  const progressCircle = (
    <circle
      cx="50"
      cy="50"
      r={radius}
      fill="none"
      stroke={gaugePrimaryColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${progressLength} ${remainingLength}`}
      strokeDashoffset={circumference * 0.25} // Start from top
      style={{
        transition: "stroke-dasharray 1s ease",
      }}
    />
  )

  return (
    <div className={cn("relative size-32 text-2xl font-semibold", className)}>
      <svg
        fill="none"
        className="size-full -rotate-90"
        viewBox="0 0 100 100"
      >
        {/* Background track (gray) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={gaugeSecondaryColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress arc (blue) with optional tooltip */}
        {tooltipContent && currentPercent > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <g className="cursor-pointer">{progressCircle}</g>
              </TooltipTrigger>
              <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          progressCircle
        )}
      </svg>

      {/* Center display value */}
      <span className="absolute inset-0 flex items-center justify-center">
        {displayValue !== undefined ? displayValue : `${Math.round(currentPercent)}%`}
      </span>
    </div>
  )
}
