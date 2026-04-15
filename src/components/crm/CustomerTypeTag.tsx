import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface CustomerTypeTagProps {
  type: string;
  className?: string;
}

const TYPE_STYLES: Record<string, string> = {
  'Family':         'bg-blue-100 text-blue-700 border-blue-200',
  'Couple':         'bg-pink-100 text-pink-700 border-pink-200',
  'Friend Group':   'bg-amber-100 text-amber-700 border-amber-200',
  'Business Trip':  'bg-slate-200 text-slate-700 border-slate-300',
  'Solo Traveler':  'bg-purple-100 text-purple-700 border-purple-200',
  'Tour/Agency':    'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Unknown':        'bg-slate-100 text-slate-500 border-slate-200',
};

const TYPE_TRANSLATION_KEYS: Record<string, string> = {
  'Family':         'type_family',
  'Couple':         'type_couple',
  'Friend Group':   'type_friendGroup',
  'Business Trip':  'type_businessTrip',
  'Solo Traveler':  'type_soloTraveler',
  'Tour/Agency':    'type_tourAgency',
  'Unknown':        'type_unknown',
};

export function CustomerTypeTag({ type, className }: CustomerTypeTagProps) {
  const { t } = useTranslation('crm');
  const style = TYPE_STYLES[type] || TYPE_STYLES['Unknown'];
  const labelKey = TYPE_TRANSLATION_KEYS[type] || 'type_unknown';
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md border',
      style,
      className
    )}>
      {t(labelKey)}
    </span>
  );
}
