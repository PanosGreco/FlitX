-- Drop the existing vehicle_type check constraint and add a new one with all vehicle types
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;

ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check 
CHECK (vehicle_type IN ('car', 'van', 'truck', 'motorbike', 'atv', 'snowmobile', 'camper', 'bicycle', 'jet_ski'));

-- Also run the data migration to convert existing van/truck subcategories to standalone types
UPDATE vehicles
SET vehicle_type = 'van', type = CASE WHEN LOWER(type) = 'van' THEN '' ELSE type END
WHERE vehicle_type = 'car' AND LOWER(type) = 'van';

UPDATE vehicles
SET vehicle_type = 'truck', type = CASE WHEN LOWER(type) = 'truck' THEN '' ELSE type END
WHERE vehicle_type = 'car' AND LOWER(type) = 'truck';