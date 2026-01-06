-- Add income source tracking columns
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS income_source_type text,
ADD COLUMN IF NOT EXISTS income_source_specification text,
ADD COLUMN IF NOT EXISTS expense_subcategory text,
ADD COLUMN IF NOT EXISTS source_section text DEFAULT 'manual';

-- Add comment for documentation
COMMENT ON COLUMN public.financial_records.income_source_type IS 'Income source: walk_in, internet, phone, collaboration, other';
COMMENT ON COLUMN public.financial_records.income_source_specification IS 'Specification for collaboration or other income sources';
COMMENT ON COLUMN public.financial_records.expense_subcategory IS 'Subcategory/specification for expenses like maintenance type';
COMMENT ON COLUMN public.financial_records.source_section IS 'Origin section: calendar, vehicle_maintenance, manual';