// Transmission Type Constants

export const TRANSMISSION_TYPES = ['manual', 'automatic'] as const;
export type TransmissionType = typeof TRANSMISSION_TYPES[number];

// Labels for transmission types (bilingual)
export const TRANSMISSION_TYPE_LABELS: Record<TransmissionType, { en: string; el: string }> = {
  manual: { en: 'Manual', el: 'Χειροκίνητο' },
  automatic: { en: 'Automatic', el: 'Αυτόματο' },
};

// Get display label for transmission type
export const getTransmissionTypeLabel = (transmissionType: TransmissionType | string, lang: string): string => {
  const type = transmissionType as TransmissionType;
  return TRANSMISSION_TYPE_LABELS[type]?.[lang === 'el' ? 'el' : 'en'] || transmissionType;
};
