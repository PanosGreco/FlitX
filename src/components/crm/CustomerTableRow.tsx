import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from '@/components/ui/table';
import { CustomerTypeTag } from './CustomerTypeTag';
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
        {customer.total_accidents_amount > 0 ? (
          <span className="text-orange-600 font-medium">€{customer.total_accidents_amount.toLocaleString()}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
