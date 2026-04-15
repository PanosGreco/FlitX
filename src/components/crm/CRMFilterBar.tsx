import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerTypeTag } from './CustomerTypeTag';
import { cn } from '@/lib/utils';

export interface CRMFilters {
  searchQuery: string;
  amountRange: [number, number] | null;
  customerTypes: string[];
  countryCode: string | null;
  city: string | null;
  lastBookingFrom: Date | null;
  lastBookingTo: Date | null;
}

interface CRMFilterBarProps {
  filters: CRMFilters;
  onFiltersChange: (filters: CRMFilters) => void;
  totalCustomers: number;
  filteredCount: number;
  amountMax: number;
  availableCountries: { code: string; name: string }[];
  availableCities: string[];
}

const ALL_TYPES = ['Family', 'Couple', 'Friend Group', 'Business Trip', 'Solo Traveler', 'Tour/Agency', 'Unknown'];

export function CRMFilterBar({
  filters, onFiltersChange, totalCustomers, filteredCount, amountMax, availableCountries, availableCities,
}: CRMFilterBarProps) {
  const { t } = useTranslation('crm');
  const [amountMin, setAmountMin] = useState('');
  const [amountMaxInput, setAmountMaxInput] = useState('');

  const hasActiveFilters = filters.searchQuery.trim() !== ''
    || filters.amountRange !== null
    || filters.customerTypes.length > 0
    || filters.countryCode !== null
    || filters.city !== null
    || filters.lastBookingFrom !== null
    || filters.lastBookingTo !== null;

  const clearAll = () => {
    onFiltersChange({
      searchQuery: '', amountRange: null, customerTypes: [],
      countryCode: null, city: null, lastBookingFrom: null, lastBookingTo: null,
    });
    setAmountMin('');
    setAmountMaxInput('');
  };

  const pillClass = (active: boolean) => cn(
    'rounded-full px-4 py-2 text-xs font-medium border transition-colors flex items-center gap-1.5',
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
  );

  const toggleType = (type: string) => {
    const cur = filters.customerTypes;
    const next = cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type];
    onFiltersChange({ ...filters, customerTypes: next });
  };

  const applyAmountRange = () => {
    const min = amountMin ? Number(amountMin) : 0;
    const max = amountMaxInput ? Number(amountMaxInput) : amountMax;
    if (min === 0 && max >= amountMax) {
      onFiltersChange({ ...filters, amountRange: null });
    } else {
      onFiltersChange({ ...filters, amountRange: [min, max] });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-full max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('search_placeholder')}
            value={filters.searchQuery}
            onChange={e => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="pl-9 h-9 rounded-md"
          />
        </div>

        {/* Amount Range */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={pillClass(filters.amountRange !== null)}>
              {t('filter_amountRange')}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div>
                  <label className="text-xs text-slate-500">{t('filter_min')}</label>
                  <Input type="number" value={amountMin} onChange={e => setAmountMin(e.target.value)} className="h-8" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">{t('filter_max')}</label>
                  <Input type="number" value={amountMaxInput} onChange={e => setAmountMaxInput(e.target.value)} className="h-8" placeholder={String(amountMax)} />
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={applyAmountRange}>{t('filter_apply')}</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Customer Type */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={pillClass(filters.customerTypes.length > 0)}>
              {t('filter_customerType')}
              {filters.customerTypes.length > 0 && (
                <span className="bg-white/20 rounded-full px-1.5 text-[10px]">{filters.customerTypes.length}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              {ALL_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.customerTypes.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <CustomerTypeTag type={type} />
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Location */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={pillClass(filters.countryCode !== null || filters.city !== null)}>
              {t('filter_location')}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('filter_country')}</label>
                <Select
                  value={filters.countryCode || '__any__'}
                  onValueChange={v => onFiltersChange({ ...filters, countryCode: v === '__any__' ? null : v, city: null })}
                >
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">{t('filter_anyLocation')}</SelectItem>
                    {availableCountries.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filters.countryCode && availableCities.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t('filter_city')}</label>
                  <Select
                    value={filters.city || '__any__'}
                    onValueChange={v => onFiltersChange({ ...filters, city: v === '__any__' ? null : v })}
                  >
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">{t('filter_anyLocation')}</SelectItem>
                      {availableCities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onFiltersChange({ ...filters, countryCode: null, city: null })}>
                {t('filter_clear')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Last Booking */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={pillClass(filters.lastBookingFrom !== null || filters.lastBookingTo !== null)}>
              {t('filter_lastBookingRange')}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('filter_from')}</label>
                <Calendar
                  mode="single"
                  selected={filters.lastBookingFrom || undefined}
                  onSelect={d => onFiltersChange({ ...filters, lastBookingFrom: d || null })}
                  className="p-2 pointer-events-auto"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('filter_to')}</label>
                <Calendar
                  mode="single"
                  selected={filters.lastBookingTo || undefined}
                  onSelect={d => onFiltersChange({ ...filters, lastBookingTo: d || null })}
                  className="p-2 pointer-events-auto"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-primary hover:underline flex items-center gap-1">
            <X className="h-3 w-3" />
            {t('filter_clear')}
          </button>
        )}
      </div>

      {/* Count */}
      <div className="text-xs text-slate-500 text-right">
        {filteredCount} / {totalCustomers} {t('totalCustomers', { count: totalCustomers }).split(' ').slice(1).join(' ')}
      </div>
    </div>
  );
}
