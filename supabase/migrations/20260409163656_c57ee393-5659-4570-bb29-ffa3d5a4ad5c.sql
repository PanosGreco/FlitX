-- SECURITY NOTE (Phase 2 roadmap):
-- The customer_email, customer_phone, customer_birth_date, customer_city, and 
-- customer_country columns in booking_contacts contain Personally Identifiable 
-- Information (PII). They are currently protected by:
--   1. AES-256 encryption at rest (Supabase default)
--   2. TLS encryption in transit (Supabase default)
--   3. Strict Row-Level Security policies (user_id = auth.uid())
-- 
-- Phase 2 of the FlitX migration plan will add:
--   - Column-level encryption via pgcrypto for customer_email and customer_phone
--   - Cloudflare WAF for network-level protection
--   - Audit logging for PII access
--   - GDPR-compliant data retention policies
-- See: migration-plan.html (Phase 5: Security Hardening)

ALTER TABLE public.booking_contacts
  ADD COLUMN IF NOT EXISTS customer_birth_date DATE,
  ADD COLUMN IF NOT EXISTS customer_city TEXT,
  ADD COLUMN IF NOT EXISTS customer_country TEXT,
  ADD COLUMN IF NOT EXISTS customer_country_code TEXT;

COMMENT ON TABLE public.booking_contacts IS 'Sensitive customer contact and profile information. Linked 1-to-1 with rental_bookings. Structured for future CRM/customer-profile migration: each column represents a candidate field for a future customers table.';

COMMENT ON COLUMN public.booking_contacts.customer_birth_date IS 'Customer date of birth. Used for analytics correlation with insurance/damage patterns. Age is computed on demand, never stored.';
COMMENT ON COLUMN public.booking_contacts.customer_city IS 'City name in English (standardized via country-state-city dataset on input).';
COMMENT ON COLUMN public.booking_contacts.customer_country IS 'Country name in English.';
COMMENT ON COLUMN public.booking_contacts.customer_country_code IS 'ISO 3166-1 alpha-2 country code (e.g., GR, DE, FR) for standardized analytics and future integrations.';