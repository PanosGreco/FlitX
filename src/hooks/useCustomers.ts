import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInYears } from 'date-fns';

export interface CustomerRow {
  id: string;
  customer_number: string;
  name: string;
  age: number | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  total_lifetime_value: number;
  total_bookings_count: number;
  customer_types: string[];
  last_booking_date: string | null;
  total_accidents_count: number;
  total_accidents_amount: number;
  email: string | null;
}

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('id, customer_number, name, email, birth_date, city, country, country_code, total_lifetime_value, total_bookings_count, last_booking_date, total_accidents_count, total_accidents_amount')
        .eq('user_id', user.id);

      if (custError) {
        console.error('[useCustomers] Customer fetch failed:', custError);
        setCustomers([]);
        return;
      }

      const customerIds = (customersData || []).map(c => c.id);

      let typesByCustomer: Map<string, Set<string>> = new Map();
      if (customerIds.length > 0) {
        const { data: bookingsData, error: bookError } = await supabase
          .from('rental_bookings')
          .select('customer_id, customer_type')
          .in('customer_id', customerIds)
          .not('customer_type', 'is', null);

        if (bookError) {
          console.error('[useCustomers] Bookings fetch for types failed:', bookError);
        } else {
          for (const b of bookingsData || []) {
            if (!b.customer_id || !b.customer_type) continue;
            if (!typesByCustomer.has(b.customer_id)) {
              typesByCustomer.set(b.customer_id, new Set());
            }
            typesByCustomer.get(b.customer_id)!.add(b.customer_type);
          }
        }
      }

      const today = new Date();
      const rows: CustomerRow[] = (customersData || []).map(c => {
        const age = c.birth_date ? differenceInYears(today, new Date(c.birth_date)) : null;
        const types = Array.from(typesByCustomer.get(c.id) || []);
        return {
          id: c.id,
          customer_number: c.customer_number,
          name: c.name,
          age,
          city: c.city,
          country: c.country,
          country_code: c.country_code,
          total_lifetime_value: Number(c.total_lifetime_value || 0),
          total_bookings_count: c.total_bookings_count || 0,
          customer_types: types,
          last_booking_date: c.last_booking_date,
          total_accidents_count: c.total_accidents_count || 0,
          total_accidents_amount: Number(c.total_accidents_amount || 0),
          email: c.email,
        };
      });

      setCustomers(rows);
    } catch (err) {
      console.error('[useCustomers] Unexpected error:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers, refreshKey]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return { customers, loading, refresh };
}
