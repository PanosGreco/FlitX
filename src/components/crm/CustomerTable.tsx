import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Users, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CustomerTableRow } from './CustomerTableRow';
import type { CustomerRow } from '@/hooks/useCustomers';

type SortKey = keyof CustomerRow;

interface CustomerTableProps {
  customers: CustomerRow[];
  loading: boolean;
  totalCustomers: number;
}

const SORTABLE_COLUMNS: SortKey[] = [
  'customer_number', 'name', 'age', 'total_lifetime_value',
  'total_bookings_count', 'last_booking_date', 'total_accidents_count', 'total_accidents_amount',
];

export function CustomerTable({ customers, loading, totalCustomers }: CustomerTableProps) {
  const { t } = useTranslation('crm');
  const [sortColumn, setSortColumn] = useState<SortKey>('total_bookings_count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSort = (col: SortKey) => {
    if (!SORTABLE_COLUMNS.includes(col)) return;
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const sorted = useMemo(() => {
    const arr = [...customers];
    arr.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp: number;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [customers, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const columns: { key: SortKey | 'location' | 'customer_types' | 'contact'; label: string; align?: string }[] = [
    { key: 'customer_number', label: t('col_id') },
    { key: 'name', label: t('col_name') },
    { key: 'contact', label: t('col_contact') },
    { key: 'age', label: t('col_age'), align: 'text-right' },
    { key: 'location', label: t('col_location') },
    { key: 'total_lifetime_value', label: t('col_totalAmount'), align: 'text-right' },
    { key: 'total_bookings_count', label: t('col_bookings'), align: 'text-right' },
    { key: 'customer_types', label: t('col_customerType') },
    { key: 'last_booking_date', label: t('col_lastBooking') },
    { key: 'total_accidents_count', label: t('col_accidents'), align: 'text-right' },
    { key: 'total_accidents_amount', label: t('col_accidentAmount'), align: 'text-right' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200">
              {columns.map(c => (
                <TableHead key={c.key} className="px-4 py-3 text-slate-500 text-xs font-medium uppercase tracking-wide">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-b border-slate-100">
                {columns.map(c => (
                  <TableCell key={c.key} className="px-4 py-3.5">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (customers.length === 0) {
    const isFiltered = totalCustomers > 0;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-16 px-4">
        <Users className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-700">
          {isFiltered ? t('noResults_title') : t('noCustomers_title')}
        </h3>
        <p className="text-sm text-slate-500 mt-1 text-center max-w-md">
          {isFiltered ? t('noResults_subtitle') : t('noCustomers_subtitle')}
        </p>
      </div>
    );
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return null;
    return sortDirection === 'asc'
      ? <ChevronUp className="inline h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="inline h-3.5 w-3.5 ml-1" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200">
            {columns.map(c => {
              const isSortable = SORTABLE_COLUMNS.includes(c.key as SortKey);
              const isAccidentAmount = c.key === 'total_accidents_amount';
              return (
                <TableHead
                  key={c.key}
                  className={`px-4 py-3 text-slate-500 text-xs font-medium uppercase tracking-wide whitespace-nowrap ${isAccidentAmount ? 'min-w-[120px]' : ''} ${c.align || ''} ${isSortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                  onClick={() => isSortable && handleSort(c.key as SortKey)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {isSortable && <SortIcon col={c.key} />}
                    {isAccidentAmount && (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                              aria-label="info"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px] text-xs normal-case font-normal tracking-normal leading-relaxed">
                            {t('accidentAmountExplanation')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map(customer => (
            <CustomerTableRow key={customer.id} customer={customer} />
          ))}
        </TableBody>
      </Table>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-600">
        <span>{t('total')}: {sorted.length}</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs">{t('rowsPerPage')}</span>
            <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs min-w-[60px] text-center">{currentPage} {t('page_of')} {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
