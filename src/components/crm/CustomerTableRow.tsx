import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from '@/components/ui/table';
import { CustomerTypeTag } from './CustomerTypeTag';
import { formatDateEuropean } from '@/utils/dateFormatUtils';
import type { CustomerRow } from '@/hooks/useCustomers';
import { MoreHorizontal, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CustomerTableRowProps {
  customer: CustomerRow;
  onAction: (action: 'viewBookings' | 'merge', customer: CustomerRow) => void;
}

export function CustomerTableRow({ customer, onAction }: CustomerTableRowProps) {
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
      <TableCell className={`px-4 py-3.5 text-right ${customer.total_accidents_count > 0 ? 'text-orange-600' : 'text-slate-700'}`}>
        {customer.total_accidents_count}
      </TableCell>
      <TableCell className={`px-4 py-3.5 text-right ${customer.total_accidents_amount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>
        €{customer.total_accidents_amount.toLocaleString()}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-right w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction('viewBookings', customer)}>
              <Eye className="mr-2 h-4 w-4" />
              {t('action_viewBookings')}
            </DropdownMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem disabled>
                  {t('action_mergeCustomer')}
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>{t('action_mergeComingSoon')}</TooltipContent>
            </Tooltip>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
