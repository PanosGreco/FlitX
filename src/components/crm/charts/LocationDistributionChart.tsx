import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';
import type { LocationData } from '@/hooks/useCRMChartData';

interface Props {
  countries: LocationData[];
  cities: LocationData[];
  hasData: boolean;
  loading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c43'];
const OTHER_COLOR = '#94a3b8';

const PieTooltip = ({ active, payload, t }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
      <div className="font-semibold text-slate-900">{d.name}</div>
      <div className="text-slate-600">{t('crm:chart_customers', { count: d.count })} ({d.value}%)</div>
    </div>
  );
};

function PieSection({ title, data, t }: { title: string; data: LocationData[]; t: any }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <p className="text-[11px] font-medium text-slate-500 mb-1">{title}</p>
        <div className="h-44 flex items-center text-xs text-slate-400">—</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <p className="text-[11px] font-medium text-slate-500 mb-1">{title}</p>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={58}
              paddingAngle={2}
              dataKey="value"
              label={({ value }) => `${value}%`}
              labelLine={false}
              style={{ fontSize: 10 }}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.name === 'Other' ? OTHER_COLOR : COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip t={t} />} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LocationDistributionChart({ countries, cities, hasData, loading }: Props) {
  const { t } = useTranslation(['crm']);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {t('crm:chart_locationDistribution')}
      </h3>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center px-4">
          <MapPin className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">{t('crm:chart_noLocationData')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('crm:chart_noLocationDataHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <PieSection title={t('crm:chart_countries')} data={countries} t={t} />
          <PieSection title={t('crm:chart_cities')} data={cities} t={t} />
        </div>
      )}
    </div>
  );
}
