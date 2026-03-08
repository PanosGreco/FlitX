// Vehicle Type & Category Constants
// Top-level vehicle types
export const VEHICLE_TYPES = ['car', 'van', 'truck', 'motorbike', 'atv', 'snowmobile', 'camper', 'bicycle', 'jet_ski'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

// Vehicle category options based on vehicle type
export const VEHICLE_CATEGORIES: Record<VehicleType, { value: string; label: { en: string; el: string } }[]> = {
  car: [
    { value: 'sedan', label: { en: 'Sedan', el: 'Σεντάν' } },
    { value: 'suv', label: { en: 'SUV', el: 'SUV' } },
    { value: 'economy', label: { en: 'Economy', el: 'Οικονομικό' } },
    { value: 'luxury', label: { en: 'Luxury', el: 'Πολυτελές' } },
    { value: 'hatchback', label: { en: 'Hatchback', el: 'Χάτσμπακ' } },
    { value: 'coupe', label: { en: 'Coupe', el: 'Κουπέ' } },
    { value: 'convertible', label: { en: 'Convertible', el: 'Κάμπριο' } },
  ],
  van: [], // Custom subcategories only
  truck: [], // Custom subcategories only
  motorbike: [
    { value: '50cc', label: { en: '50cc', el: '50cc' } },
    { value: '125cc', label: { en: '125cc', el: '125cc' } },
    { value: 'scooter', label: { en: 'Scooter', el: 'Σκούτερ' } },
    { value: 'touring_sport', label: { en: 'Touring / Sport', el: 'Touring / Sport' } },
  ],
  atv: [], // ATV has no subcategories - the category is simply "ATV"
  snowmobile: [
    { value: 'touring', label: { en: 'Touring', el: 'Touring' } },
    { value: 'mountain', label: { en: 'Mountain', el: 'Ορεινό' } },
    { value: 'utility', label: { en: 'Utility', el: 'Utility' } },
  ],
  camper: [], // Custom subcategories only
  bicycle: [], // Custom subcategories only
  jet_ski: [
    { value: 'recreational', label: { en: 'Recreational', el: 'Ψυχαγωγικό' } },
    { value: 'performance', label: { en: 'Performance', el: 'Αγωνιστικό' } },
  ],
};

// Labels for vehicle types
export const VEHICLE_TYPE_LABELS: Record<VehicleType, { en: string; el: string }> = {
  car: { en: 'Car', el: 'Αυτοκίνητο' },
  van: { en: 'Van', el: 'Βαν' },
  truck: { en: 'Truck', el: 'Φορτηγό' },
  motorbike: { en: 'Motorbike', el: 'Μοτοσυκλέτα' },
  atv: { en: 'ATV', el: 'ATV' },
  snowmobile: { en: 'Snowmobile', el: 'Snowmobile' },
  camper: { en: 'Camper', el: 'Τροχόσπιτο' },
  bicycle: { en: 'Bicycle', el: 'Ποδήλατο' },
  jet_ski: { en: 'Jet Ski', el: 'Jet Ski' },
};

// Map category to its parent vehicle type
export const getCategoryVehicleType = (category: string): VehicleType | null => {
  const normalizedCategory = category.trim().toLowerCase();
  
  for (const vehicleType of VEHICLE_TYPES) {
    const found = VEHICLE_CATEGORIES[vehicleType].find(
      c => c.value.toLowerCase() === normalizedCategory
    );
    if (found) {
      return vehicleType;
    }
  }
  
  // Special case: ATV category maps to ATV type
  if (normalizedCategory === 'atv') {
    return 'atv';
  }
  
  return null; // Custom category - needs vehicle_type from vehicle data
};

// Get display label for vehicle type
export const getVehicleTypeLabel = (vehicleType: VehicleType | string, lang: string): string => {
  const type = vehicleType as VehicleType;
  return VEHICLE_TYPE_LABELS[type]?.[lang === 'el' ? 'el' : 'en'] || vehicleType;
};

// Get display label for vehicle category
export const getVehicleCategoryLabel = (category: string, lang: string): string => {
  // Check in all vehicle type categories
  for (const vehicleType of VEHICLE_TYPES) {
    const found = VEHICLE_CATEGORIES[vehicleType].find(c => c.value === category);
    if (found) {
      return found.label[lang === 'el' ? 'el' : 'en'];
    }
  }
  // Return the category as-is (for custom categories or ATV)
  return category.charAt(0).toUpperCase() + category.slice(1);
};

// Normalize custom category for storage (case-insensitive, trimmed)
export const normalizeCategory = (category: string): string => {
  return category.trim().toLowerCase().replace(/\s+/g, '_');
};

// Get display format for custom category
export const formatCustomCategory = (category: string): string => {
  return category.trim().toUpperCase();
};

// Check if a category is a standard category (not custom)
export const isStandardCategory = (category: string): boolean => {
  for (const vehicleType of VEHICLE_TYPES) {
    if (VEHICLE_CATEGORIES[vehicleType].some(c => c.value === category)) {
      return true;
    }
  }
  return category === 'atv';
};
