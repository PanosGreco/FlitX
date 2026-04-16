import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AccidentRecord {
  id: string;
  accident_date: string;
  description: string | null;
  total_damage_cost: number;
  amount_paid_by_insurance: number;
  amount_paid_by_user: number;
  payer_type: string;
  notes: string | null;
  booking_number: string;
  customer_name: string;
  customer_number: string;
  vehicle_label: string;
}

interface AccidentHistoryProps {
  refreshKey: number;
}

export function AccidentHistory({ refreshKey }: AccidentHistoryProps) {
  const { t } = useTranslation('crm');
  const { user } = useAuth();
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('accidents')
        .select('id, accident_date, description, total_damage_cost, amount_paid_by_insurance, amount_paid_by_user, payer_type, notes, booking_id, customer_id, vehicle_id, rental_bookings(booking_number, customer_name), customers(customer_number, name), vehicles(make, model)')
        .eq('user_id', user.id)
        .order('accident_date', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[AccidentHistory] Fetch failed:', error);
        return;
      }
      setAccidents(
        (data || []).map((a: any) => ({
          id: a.id,
          accident_date: a.accident_date,
          description: a.description,
          total_damage_cost: Number(a.total_damage_cost),
          amount_paid_by_insurance: Number(a.amount_paid_by_insurance),
          amount_paid_by_user: Number(a.amount_paid_by_user),
          payer_type: a.payer_type,
          notes: a.notes,
          booking_number: a.rental_bookings?.booking_number || '—',
          customer_name: a.rental_bookings?.customer_name || a.customers?.name || '—',
          customer_number: a.customers?.customer_number || '',
          vehicle_label: a.vehicles ? `${a.vehicles.make} ${a.vehicles.model}` : '—',
        }))
      );
    })();
  }, [user, refreshKey]);

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const payerBadge = (type: string) => {
    switch (type) {
      case 'insurance':
        return <Badge variant="outline" className="text-teal-600 border-teal-300 bg-teal-50 text-xs">{t('accidentHistory_payer_insurance')}</Badge>;
      case 'user':
        return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">{t('accidentHistory_payer_user')}</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 border-slate-300 bg-slate-50 text-xs">{t('accidentHistory_payer_split')}</Badge>;
    }
  };

  const visibleAccidents = showAll ? accidents : accidents.slice(0, 10);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm text-foreground">{t('accidentHistory')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {t('accidentHistory_records', { count: accidents.length })}
              </Badge>
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {accidents.length === 0 ? (
            <div className="px-4 pb-4 text-center">
              <p className="text-sm text-muted-foreground py-6">{t('noAccidents')}</p>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-0">
              {visibleAccidents.map((a, i) => (
                <div key={a.id} className={`py-3 ${i < visibleAccidents.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{formatDate(a.accident_date)}</span>
                        {payerBadge(a.payer_type)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.booking_number} — {a.customer_name} — {a.vehicle_label}
                      </p>
                      {a.description && (
                        <p className="text-sm text-foreground line-clamp-2">{a.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">€{a.total_damage_cost.toLocaleString()}</p>
                      <p className="text-xs text-teal-600">{t('accidentHistory_insurancePaid')}: €{a.amount_paid_by_insurance.toLocaleString()}</p>
                      <p className="text-xs text-orange-600">{t('accidentHistory_userPaid')}: €{a.amount_paid_by_user.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!showAll && accidents.length > 10 && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                    {t('accidentHistory_showAll')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
