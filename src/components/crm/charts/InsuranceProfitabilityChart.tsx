import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import type { InsuranceProfitData } from '@/hooks/useCRMChartData';

interface Props {
  data: InsuranceProfitData[];
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
      <div className="font-semibold text-slate-900 mb-1">{d.insuranceType}</div>
      <div className="text-emerald-600">{t('crm:chart_insuranceRevenue')}: €{d.revenue.toLocaleString()}</div>
      <div className="text-orange-600">{t('crm:chart_businessLosses')}: €{d.businessPaidCost.toLocaleString()}</div>
      <div className={d.netProfit >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
        {t('crm:chart_netProfit')}: {d.netProfit >= 0 ? '+' : ''}€{d.netProfit.toLocaleString()}
      </div>
    </div>
  );
};

export function InsuranceProfitabilityChart({ data, hasData, loading }: Props) {
  const { t } = useTranslation(['crm']);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {t('crm:chart_insuranceProfitability')}
      </h3>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center px-4">
          <Shield className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">{t('crm:chart_noInsuranceData')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('crm:chart_noInsuranceDataHint')}</p>
        </div>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="insuranceType" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatEuro} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                <Bar dataKey="revenue" name={t('crm:chart_insuranceRevenue')} fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="businessPaidCost" name={t('crm:chart_businessLosses')} fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            {data.map(d => (
              <div key={d.insuranceType} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate mr-2">{d.insuranceType}</span>
                <span className={d.netProfit >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                  {d.netProfit >= 0 ? '+' : ''}€{d.netProfit.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
