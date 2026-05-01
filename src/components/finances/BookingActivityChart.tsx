import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface BookingActivityChartProps {
  bookings: Array<{ start_date: string; end_date: string }>;
  lang: string;
  seasonMonths?: number[];
}

export function BookingActivityChart({ bookings, seasonMonths }: BookingActivityChartProps) {
  const { t } = useTranslation('finance');

  const chartData = useMemo(() => {
    const dayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
    const dayTotals: Record<string, number> = {};
    dayKeys.forEach((d) => {
      dayTotals[d] = 0;
    });

    for (const booking of bookings) {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);

      if (seasonMonths && seasonMonths.length > 0) {
        const startMonth = startDate.getMonth() + 1;
        if (!seasonMonths.includes(startMonth)) continue;
      }

      // Walk through every day of the booking and count which weekday it falls on
      const current = new Date(startDate);
      while (current <= endDate) {
        const jsDay = current.getDay();
        const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
        const dayName = dayKeys[dayIndex];
        dayTotals[dayName] += 1;
        current.setDate(current.getDate() + 1);
      }
    }

    return dayKeys.map((day) => ({
      day,
      label: t(`day${day}`),
      bookingDays: dayTotals[day],
    }));
  }, [bookings, seasonMonths, t]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('bookingActivityByDay')}
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-w-xs p-3" align="end">
              <p className="text-xs text-muted-foreground leading-snug">
                {t('bookingActivityTooltip')}
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number) => [`${value} ${t('bookingDaysUnit')}`, t('bookingDays')]}
                labelStyle={{ color: '#333' }}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="bookingDays" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
