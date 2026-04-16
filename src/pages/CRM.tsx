import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTranslation } from 'react-i18next';
import { useCustomers } from '@/hooks/useCustomers';
import { CustomerTable } from '@/components/crm/CustomerTable';
import { CRMFilterBar, type CRMFilters } from '@/components/crm/CRMFilterBar';
import { AddAccidentDialog } from '@/components/crm/AddAccidentDialog';
import { AccidentHistory } from '@/components/crm/AccidentHistory';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CRM() {
  const { t } = useTranslation(['crm', 'common']);
  const { customers, loading, refresh } = useCustomers();

  const [filters, setFilters] = useState<CRMFilters>({
    searchQuery: '',
    amountRange: null,
    customerTypes: [],
    countryCode: null,
    city: null,
    lastBookingFrom: null,
    lastBookingTo: null,
  });

  const [isAccidentDialogOpen, setIsAccidentDialogOpen] = useState(false);
  const [accidentRefreshKey, setAccidentRefreshKey] = useState(0);

  const handleAccidentSuccess = () => {
    refresh();
    setAccidentRefreshKey(prev => prev + 1);
  };

  const amountMax = useMemo(() => {
    if (customers.length === 0) return 1000;
    return Math.ceil(Math.max(...customers.map(c => c.total_lifetime_value)) / 100) * 100;
  }, [customers]);

  const availableCountries = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) {
      if (c.country_code && c.country) map.set(c.country_code, c.country);
    }
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      if (!c.city) continue;
      if (filters.countryCode && c.country_code !== filters.countryCode) continue;
      set.add(c.city);
    }
    return Array.from(set).sort() as string[];
  }, [customers, filters.countryCode]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        if (!c.customer_number.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
      }
      if (filters.amountRange) {
        const [min, max] = filters.amountRange;
        if (c.total_lifetime_value < min || c.total_lifetime_value > max) return false;
      }
      if (filters.customerTypes.length > 0) {
        if (!c.customer_types.some(ct => filters.customerTypes.includes(ct))) return false;
      }
      if (filters.countryCode && c.country_code !== filters.countryCode) return false;
      if (filters.city && c.city !== filters.city) return false;
      if (filters.lastBookingFrom || filters.lastBookingTo) {
        if (!c.last_booking_date) return false;
        const lbd = new Date(c.last_booking_date);
        if (filters.lastBookingFrom && lbd < filters.lastBookingFrom) return false;
        if (filters.lastBookingTo && lbd > filters.lastBookingTo) return false;
      }
      return true;
    });
  }, [customers, filters]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('crm:title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('crm:subtitle')}</p>
          </div>
          <Button onClick={() => setIsAccidentDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            {t('crm:addAccidentRecord')}
          </Button>
        </div>

        <CRMFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          totalCustomers={customers.length}
          filteredCount={filteredCustomers.length}
          amountMax={amountMax}
          availableCountries={availableCountries}
          availableCities={availableCities}
        />

        <CustomerTable
          customers={filteredCustomers}
          loading={loading}
          totalCustomers={customers.length}
        />

        <AccidentHistory refreshKey={accidentRefreshKey} />

        <AddAccidentDialog
          isOpen={isAccidentDialogOpen}
          onClose={() => setIsAccidentDialogOpen(false)}
          onSuccess={handleAccidentSuccess}
        />
      </div>
    </AppLayout>
  );
}
