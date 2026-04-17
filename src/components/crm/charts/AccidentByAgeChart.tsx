import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import type { AgeGroupData } from '@/hooks/useCRMChartData';

interface Props {
  data: AgeGroupData[];
  hasData: boolean;
  loading: boolean;
}

const formatEuro = (value: number) => {
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value}`;
};

const CustomTooltip = ({ active, payload, t }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
      <div className="font-semibold text-slate-900">{d.ageGroup}</div>
      <div className="text-orange-600">€{d.totalDamageCost.toLocaleString()}</div>
      <div className="text-slate-500">{t('crm:chart_accidentByAge_tooltip', { count: d.accidentCount })}</div>
    </div>
  );
};

export function AccidentByAgeChart({ data, hasData, loading }: Props) {
  const { t } = useTranslation(['crm']);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {t('crm:chart_accidentByAge')}
      </h3>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center px-4">
          <TrendingUp className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">{t('crm:chart_noAccidentData')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('crm:chart_noAccidentDataHint')}</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="ageGroup" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatEuro} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: 'rgba(249, 115, 22, 0.08)' }} />
              <Bar dataKey="totalDamageCost" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
