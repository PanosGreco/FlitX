import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { LocationData } from '@/hooks/useCRMChartData';

interface Props {
  countries: LocationData[];
  cities: LocationData[];
  customerTypeDistribution: LocationData[];
  hasData: boolean;
  loading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c43'];
const OTHER_COLOR = '#94a3b8';

const colorFor = (entry: LocationData, idx: number) =>
  entry.name === 'Other' ? OTHER_COLOR : COLORS[idx % COLORS.length];

const PieTooltip = ({ active, payload, t }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold text-slate-900">{d.name}</div>
      <div className="text-slate-600">
        {t('crm:chart_customers', { count: d.count })} ({d.value}%)
      </div>
    </div>
  );
};

function CompactLegend({ data }: { data: LocationData[] }) {
  const top = data.slice(0, 5);
  const rest = data.length - 5;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-2 px-1">
      {top.map((entry, idx) => (
        <div key={entry.name} className="flex items-center gap-1 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: colorFor(entry, idx) }}
          />
          <span className="text-[10px] text-slate-600 truncate max-w-[70px]">{entry.name}</span>
        </div>
      ))}
      {rest > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-[10px] text-primary hover:underline font-medium">
              +{rest} more
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="center">
            <div className="max-h-60 overflow-y-auto space-y-1">
              {data.map((entry, idx) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between gap-2 text-xs px-1 py-0.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colorFor(entry, idx) }}
                    />
                    <span className="truncate text-slate-700">{entry.name}</span>
                  </div>
                  <span className="text-slate-500 flex-shrink-0">
                    {entry.count} ({entry.value}%)
                  </span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function PieSection({ title, data, t }: { title: string; data: LocationData[]; t: any }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <p className="text-[11px] font-medium text-slate-500 mb-3 text-center">{title}</p>
      {data.length === 0 ? (
        <div className="h-44 flex items-center text-xs text-slate-400">—</div>
      ) : (
        <div className="flex flex-col w-full">
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                  style={{ cursor: 'pointer' }}
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={colorFor(entry, idx)} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip t={t} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CompactLegend data={data} />
        </div>
      )}
    </div>
  );
}

export function LocationDistributionChart({ countries, cities, customerTypeDistribution, hasData, loading }: Props) {
  const { t } = useTranslation(['crm']);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-[340px]">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {t('crm:chart_customerDistribution')}
      </h3>
      {loading ? (
        <Skeleton className="flex-1 w-full min-h-[260px]" />
      ) : !hasData ? (
        <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center px-4">
          <MapPin className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">{t('crm:chart_noLocationData')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('crm:chart_noLocationDataHint')}</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-[260px]">
          <PieSection title={t('crm:chart_countries')} data={countries} t={t} />
          <PieSection title={t('crm:chart_cities')} data={cities} t={t} />
          <PieSection title={t('crm:chart_customerTypes')} data={customerTypeDistribution} t={t} />
        </div>
      )}
    </div>
  );
}
