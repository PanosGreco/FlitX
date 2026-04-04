import { useMemo, useState, useEffect } from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/utils/localeMap';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const DOT_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#e11d48', // rose
];

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  booking_id?: string | null;
}

interface MarketingScatterPlotProps {
  financialRecords: FinancialRecord[];
  lang: string;
}

export function MarketingScatterPlot({ financialRecords, lang }: MarketingScatterPlotProps) {
  const { t } = useTranslation('finance');
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  const availablePeriods = useMemo(() => {
    const monthSet = new Set<string>();
    const yearSet = new Set<number>();
    financialRecords.forEach(r => {
      const d = new Date(r.date);
      monthSet.add(format(d, 'yyyy-MM'));
      yearSet.add(d.getFullYear());
    });
    const months = [...monthSet].sort().reverse();
    const years = [...yearSet].sort((a, b) => b - a);
    return { months, years };
  }, [financialRecords]);

  useEffect(() => {
    if (viewMode === 'monthly' && availablePeriods.months.length > 0 && selectedPeriods.length === 0) {
      setSelectedPeriods(availablePeriods.months.slice(0, 6));
    } else if (viewMode === 'yearly' && availablePeriods.years.length > 0 && selectedPeriods.length === 0) {
      setSelectedPeriods(availablePeriods.years.map(String));
    }
  }, [availablePeriods, viewMode, selectedPeriods.length]);

  const scatterData = useMemo(() => {
    return selectedPeriods.map(period => {
      const periodRecords = financialRecords.filter(r => {
        const d = new Date(r.date);
        if (viewMode === 'monthly') {
          return format(d, 'yyyy-MM') === period;
        } else {
          return d.getFullYear() === parseInt(period);
        }
      });

      const marketingSpend = periodRecords
        .filter(r => r.type === 'expense' && r.category === 'marketing')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const bookingRevenue = periodRecords
        .filter(r => r.type === 'income' && r.booking_id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const label = viewMode === 'monthly'
        ? format(new Date(period + '-01'), 'MMM yy', { locale: getDateFnsLocale(lang) })
        : period;

      return { x: marketingSpend, y: bookingRevenue, label, period };
    }).filter(d => d.x > 0 || d.y > 0);
  }, [financialRecords, selectedPeriods, viewMode, lang]);

  const togglePeriod = (period: string) => {
    setSelectedPeriods(prev =>
      prev.includes(period)
        ? prev.filter(p => p !== period)
        : [...prev, period]
    );
  };

  const formatAxis = (v: number) => v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${v}`;

  return (
    <div>
      {/* Controls - toggle top-right, chips below */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-end">
          <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2.5 rounded-md"
              onClick={() => { setViewMode('monthly'); setSelectedPeriods([]); }}
            >
              {t('monthly')}
            </Button>
            <Button
              variant={viewMode === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2.5 rounded-md"
              onClick={() => { setViewMode('yearly'); setSelectedPeriods([]); }}
            >
              {t('yearly')}
            </Button>
          </div>
        </div>

        {/* Period chips with scroll gradient hint */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
          <div className="flex gap-1 overflow-x-auto scrollbar-hide justify-end pb-0.5">
            {(viewMode === 'monthly' ? availablePeriods.months : availablePeriods.years.map(String)).map(period => {
              const isSelected = selectedPeriods.includes(period);
              const chipLabel = viewMode === 'monthly'
                ? format(new Date(period + '-01'), 'MMM yy', { locale: getDateFnsLocale(lang) })
                : period;
              return (
                <button
                  key={period}
                  onClick={() => togglePeriod(period)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors flex-shrink-0",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {chipLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart or empty state */}
      {scatterData.length >= 2 ? (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.4}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={t('marketingSpend')}
                  tickFormatter={formatAxis}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: t('marketingSpend'),
                    position: 'insideBottom',
                    offset: -5,
                    style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={t('bookingRevenue')}
                  tickFormatter={formatAxis}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: t('bookingRevenue'),
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
                  }}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                        <p className="font-semibold text-foreground mb-1">{data.label}</p>
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground">{t('marketingSpend')}: <span className="text-foreground font-medium">€{data.x.toLocaleString('de-DE')}</span></p>
                          <p className="text-muted-foreground">{t('bookingRevenue')}: <span className="text-foreground font-medium">€{data.y.toLocaleString('de-DE')}</span></p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DOT_COLORS[index % DOT_COLORS.length]}
                      fillOpacity={0.7}
                      stroke={DOT_COLORS[index % DOT_COLORS.length]}
                      strokeWidth={1.5}
                      strokeOpacity={0.9}
                    />
                  ))}
                </Scatter>
              </RechartsScatterChart>
            </ResponsiveContainer>
          </div>
          {/* Color legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {scatterData.map((entry, index) => (
              <div key={entry.period} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DOT_COLORS[index % DOT_COLORS.length] }}
                />
                <span className="text-[10px] text-muted-foreground">{entry.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center space-y-2">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">{t('insufficientMarketingData')}</p>
            <p className="text-xs text-muted-foreground/70 max-w-[220px]">{t('insufficientMarketingDataHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
