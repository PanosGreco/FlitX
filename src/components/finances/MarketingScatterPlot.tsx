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
      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Monthly / Yearly toggle */}
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

        {/* Period chips */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
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

      {/* Chart or empty state */}
      {scatterData.length >= 2 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
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
              />
              <YAxis
                type="number"
                dataKey="y"
                name={t('bookingRevenue')}
                tickFormatter={formatAxis}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
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
              <Scatter data={scatterData} fill="#3b82f6">
                {scatterData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    stroke="#2563eb"
                    strokeWidth={1.5}
                  />
                ))}
              </Scatter>
            </RechartsScatterChart>
          </ResponsiveContainer>
        </div>
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
