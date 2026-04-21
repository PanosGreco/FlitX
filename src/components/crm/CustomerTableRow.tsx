import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from '@/components/ui/table';
import { CustomerTypeTag } from './CustomerTypeTag';
import { VehicleTypeTag } from './VehicleTypeTag';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateEuropean } from '@/utils/dateFormatUtils';
import type { CustomerRow } from '@/hooks/useCustomers';

interface CustomerTableRowProps {
  customer: CustomerRow;
}

export function CustomerTableRow({ customer }: CustomerTableRowProps) {
  const { t } = useTranslation('crm');

  const location = customer.city && customer.country
    ? `${customer.city}, ${customer.country}`
    : customer.city || customer.country || t('locationNotAvailable');

  const lastBooking = customer.last_booking_date
    ? formatDateEuropean(customer.last_booking_date)
    : t('lastBookingNotAvailable');

  return (
    <TableRow className="hover:bg-slate-50 transition-colors border-b border-slate-100">
      <TableCell className="px-4 py-3.5 font-mono text-slate-500 text-sm">
        {customer.customer_number}
      </TableCell>
      <TableCell className="px-4 py-3.5 font-medium text-slate-900">
        {customer.name}
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="text-xs text-primary hover:underline truncate max-w-[180px]"
              title={customer.email}
              onClick={(e) => e.stopPropagation()}
            >
              {customer.email}
            </a>
          ) : null}
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="text-xs text-slate-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.phone}
            </a>
          ) : null}
          {!customer.email && !customer.phone && (
            <span className="text-xs text-slate-400">{t('noContact')}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3.5 text-slate-700 text-right">
        {customer.age ?? t('ageNotAvailable')}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-slate-700">
        {location}
      </TableCell>
      <TableCell className="px-4 py-3.5 font-semibold text-emerald-700 text-right">
        €{customer.total_lifetime_value.toLocaleString()}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-slate-700 text-right">
        {customer.total_bookings_count}
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1">
          {customer.customer_types.length > 0
            ? customer.customer_types.map(type => (
                <CustomerTypeTag key={type} type={type} />
              ))
            : <CustomerTypeTag type="Unknown" />
          }
        </div>
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-1">
          {customer.vehicle_types.length === 0 ? (
            <span className="text-xs text-slate-400">—</span>
          ) : (
            <>
              {customer.vehicle_types.slice(0, 2).map(vt => (
                <VehicleTypeTag key={vt} type={vt} />
              ))}
              {customer.vehicle_types.length > 2 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold rounded border bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      +{customer.vehicle_types.length - 2}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-auto max-w-[260px] p-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-wrap gap-1">
                      {customer.vehicle_types.map(vt => (
                        <VehicleTypeTag key={vt} type={vt} />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3.5 text-slate-700">
        {lastBooking}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-right">
        {customer.total_accidents_count > 0 ? (
          <span className="text-orange-600 font-medium">{customer.total_accidents_count}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-right">
        {customer.total_accidents_count === 0 ? (
          <span className="text-slate-400">—</span>
        ) : customer.total_accidents_amount === 0 ? (
          <div className="flex flex-col items-end">
            <span className="text-emerald-600 font-medium">€0</span>
            <span className="text-[10px] text-slate-400">
              (€{(customer.total_damage_cost_sum ?? 0).toLocaleString()} {t('accidentTotal')})
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-orange-600 font-medium">
              €{(customer.total_accidents_amount ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">
              (€{(customer.total_damage_cost_sum ?? 0).toLocaleString()} {t('accidentTotal')})
            </span>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
