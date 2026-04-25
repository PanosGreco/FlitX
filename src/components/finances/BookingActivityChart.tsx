import { useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Info, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BookingActivityChartProps {
  bookings: Array<{ start_date: string; end_date: string }>;
  lang: string;
  seasonMonths?: number[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function BookingActivityChart({ bookings, seasonMonths }: BookingActivityChartProps) {
  const { t } = useTranslation("finance");

  const chartData = useMemo(() => {
    const dayTotals: Record<string, number> = {};
    DAYS.forEach((d) => {
      dayTotals[d] = 0;
    });

    for (const booking of bookings) {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);

      if (seasonMonths && seasonMonths.length > 0) {
        const startMonth = startDate.getMonth() + 1;
        if (!seasonMonths.includes(startMonth)) continue;
      }

      const durationDays = Math.max(
        1,
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );

      const jsDay = startDate.getDay();
      const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
      const dayName = DAYS[dayIndex];
      dayTotals[dayName] += durationDays;
    }

    return DAYS.map((day) => ({
      day,
      label: t(`day${day}`),
      bookingDays: dayTotals[day],
    }));
  }, [bookings, seasonMonths, t]);

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-l-blue-500 relative h-full">
      <div className="absolute top-2 right-2 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          </PopoverTrigger>
          <PopoverContent className="max-w-xs p-3">
            <p className="text-xs text-muted-foreground leading-snug">
              {t("bookingActivityTooltip")}
            </p>
          </PopoverContent>
        </Popover>
      </div>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
            <CalendarDays className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pr-5">
            {t("bookingActivityByDay")}
          </p>
        </div>
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                formatter={(value: number) => [`${value} ${t("days")}`, t("bookingDays")]}
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "12px",
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
