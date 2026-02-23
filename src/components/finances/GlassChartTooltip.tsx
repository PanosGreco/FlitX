import React from 'react';

interface GlassChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
  lang?: string;
  nameFormatter?: (name: string) => string;
}

export function GlassChartTooltip({ active, payload, label, lang = 'en', nameFormatter }: GlassChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const currencySymbol = lang === 'el' ? '€' : '$';

  return (
    <div className="glass-tooltip px-4 py-3 min-w-[140px]">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground/80">
              {nameFormatter ? nameFormatter(entry.name) : entry.name}
            </span>
          </div>
          <span className="font-semibold text-foreground">
            {currencySymbol}{entry.value.toLocaleString(lang === 'el' ? 'el-GR' : undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
