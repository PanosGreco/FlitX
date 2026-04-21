import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Users2, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { colorForVehicleType } from '@/components/crm/VehicleTypeTag';
import type { CustomerTypeVsVehicleData } from '@/hooks/useCRMChartData';

interface Props {
  data: CustomerTypeVsVehicleData[];
  vehicleTypes: string[];
  hasData: boolean;
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const items = payload.filter((p: any) => p.value > 0);
  const total = items.reduce((s: number, p: any) => s + p.value, 0);
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs min-w-[160px]">
      <div className="font-semibold text-slate-900 mb-1">{label}</div>
      {items.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-slate-600">{p.dataKey}</span>
          </span>
          <span className="text-slate-900 font-medium">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-slate-100 mt-1 pt-1 flex justify-between text-slate-500">
        <span>Total</span><span className="font-medium">{total}</span>
      </div>
    </div>
  );
};

export function CustomerTypeVsVehicleChart({ data, vehicleTypes, hasData, loading }: Props) {
  const { t } = useTranslation(['crm']);

  const chartData = data.map(d => ({ name: d.customerType, ...d.vehicleBreakdown }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-[340px]">
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('crm:chart_customerTypeVsVehicle')}
        </h3>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              aria-label="info"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-72 text-xs leading-relaxed text-slate-700">
            {t('crm:chart_customerTypeVsVehicleHint')}
          </PopoverContent>
        </Popover>
      </div>
      {loading ? (
        <Skeleton className="flex-1 w-full min-h-[240px]" />
      ) : !hasData ? (
        <div className="flex-1 min-h-[240px] flex flex-col items-center justify-center text-center px-4">
          <Users2 className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">{t('crm:chart_noTypeVsVehicleData')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('crm:chart_noTypeVsVehicleDataHint')}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              {vehicleTypes.map(vt => (
                <Bar key={vt} dataKey={vt} stackId="vehicles" fill={colorForVehicleType(vt)} barSize={36} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
