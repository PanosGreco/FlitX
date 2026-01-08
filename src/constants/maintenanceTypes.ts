// System-level Vehicle Maintenance subcategories - used everywhere for data integrity
export const MAINTENANCE_TYPES = {
  oil_change: 'oil_change',
  tires: 'tires',
  brakes: 'brakes',
  general_service: 'general_service',
  battery: 'battery',
  suspension: 'suspension',
  engine: 'engine',
  transmission: 'transmission',
  other: 'other',
} as const;

export type MaintenanceType = keyof typeof MAINTENANCE_TYPES;

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, { en: string; el: string }> = {
  oil_change: { en: 'Oil Change', el: 'Αλλαγή Λαδιών' },
  tires: { en: 'Tires', el: 'Ελαστικά' },
  brakes: { en: 'Brakes', el: 'Φρένα' },
  general_service: { en: 'General Service', el: 'Γενικό Σέρβις' },
  battery: { en: 'Battery', el: 'Μπαταρία' },
  suspension: { en: 'Suspension', el: 'Ανάρτηση' },
  engine: { en: 'Engine', el: 'Κινητήρας' },
  transmission: { en: 'Transmission', el: 'Κιβώτιο Ταχυτήτων' },
  other: { en: 'Other', el: 'Άλλο' },
};

export const getMaintenanceTypeLabel = (type: string, language: string = 'en'): string => {
  const labels = MAINTENANCE_TYPE_LABELS[type as MaintenanceType];
  return labels?.[language === 'el' ? 'el' : 'en'] || type;
};

// Get all maintenance types as options for dropdowns
export const getMaintenanceTypeOptions = (language: string = 'en') => {
  return Object.keys(MAINTENANCE_TYPES).map(key => ({
    value: key,
    label: getMaintenanceTypeLabel(key, language),
  }));
};
