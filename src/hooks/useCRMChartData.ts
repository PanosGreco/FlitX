import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInYears } from 'date-fns';

export interface AgeGroupData {
  ageGroup: string;
  totalDamageCost: number;
  accidentCount: number;
}

export interface LocationData {
  name: string;
  value: number;
  count: number;
}

export interface InsuranceProfitData {
  insuranceType: string;
  revenue: number;
  businessPaidCost: number;
  netProfit: number;
}

export interface CRMChartData {
  ageGroups: AgeGroupData[];
  countries: LocationData[];
  cities: LocationData[];
  customerTypeDistribution: LocationData[];
  insuranceProfitability: InsuranceProfitData[];
  loading: boolean;
  hasAccidentData: boolean;
  hasLocationData: boolean;
  hasInsuranceData: boolean;
}

const AGE_RANGES = [
  { label: '18-22', min: 18, max: 22 },
  { label: '23-30', min: 23, max: 30 },
  { label: '31-45', min: 31, max: 45 },
  { label: '46-60', min: 46, max: 60 },
  { label: '61+', min: 61, max: 200 },
];

export function useCRMChartData(): CRMChartData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accidents, setAccidents] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [insuranceCosts, setInsuranceCosts] = useState<any[]>([]);
  const [bookingsWithTypes, setBookingsWithTypes] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [accidentsRes, customersRes, insuranceCostsRes, bookingsRes] = await Promise.all([
        supabase
          .from('accidents')
          .select('id, total_damage_cost, amount_paid_by_business, customer_id, booking_id, rental_bookings(insurance_type_id, insurance_types(name_original))')
          .eq('user_id', user.id),
        supabase
          .from('customers')
          .select('id, birth_date, city, country, country_code')
          .eq('user_id', user.id),
        supabase
          .from('booking_additional_costs')
          .select('amount, insurance_type, booking_id')
          .eq('user_id', user.id)
          .eq('name', 'Insurance'),
        supabase
          .from('rental_bookings')
          .select('customer_type, vehicle_id, vehicles(type)')
          .eq('user_id', user.id),
      ]);

      if (!accidentsRes.error) setAccidents(accidentsRes.data || []);
      if (!customersRes.error) setCustomers(customersRes.data || []);
      if (!insuranceCostsRes.error) setInsuranceCosts(insuranceCostsRes.data || []);
      if (!bookingsRes.error) setBookingsWithTypes(bookingsRes.data || []);
    } catch (err) {
      console.error('[useCRMChartData] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ageGroups = useMemo((): AgeGroupData[] => {
    if (accidents.length === 0 || customers.length === 0) {
      return AGE_RANGES.map(r => ({ ageGroup: r.label, totalDamageCost: 0, accidentCount: 0 }));
    }
    const customerMap = new Map(customers.map((c: any) => [c.id, c]));
    const today = new Date();
    const groups: Record<string, { totalDamageCost: number; count: number }> = {};
    AGE_RANGES.forEach(r => { groups[r.label] = { totalDamageCost: 0, count: 0 }; });

    for (const accident of accidents) {
      const customer = customerMap.get(accident.customer_id);
      if (!customer?.birth_date) continue;
      const age = differenceInYears(today, new Date(customer.birth_date));
      const range = AGE_RANGES.find(r => age >= r.min && age <= r.max);
      if (range) {
        groups[range.label].totalDamageCost += Number(accident.total_damage_cost);
        groups[range.label].count += 1;
      }
    }

    return AGE_RANGES.map(r => ({
      ageGroup: r.label,
      totalDamageCost: groups[r.label].totalDamageCost,
      accidentCount: groups[r.label].count,
    }));
  }, [accidents, customers]);

  const toLocationData = (map: Record<string, number>, total: number): LocationData[] => {
    if (total === 0) return [];
    const entries = Object.entries(map)
      .map(([name, count]) => ({ name, count, value: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const mainEntries: LocationData[] = [];
    let otherCount = 0;
    let otherPct = 0;

    for (const e of entries) {
      if (e.value >= 5) mainEntries.push(e);
      else { otherCount += e.count; otherPct += e.value; }
    }

    if (otherCount > 0) {
      mainEntries.push({ name: 'Other', count: otherCount, value: otherPct || 1 });
    }
    return mainEntries;
  };

  const { countries, cities } = useMemo(() => {
    const countryMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};
    let totalWithCountry = 0;
    let totalWithCity = 0;

    for (const c of customers) {
      if (c.country) {
        countryMap[c.country] = (countryMap[c.country] || 0) + 1;
        totalWithCountry++;
      }
      if (c.city) {
        cityMap[c.city] = (cityMap[c.city] || 0) + 1;
        totalWithCity++;
      }
    }

    return {
      countries: toLocationData(countryMap, totalWithCountry),
      cities: toLocationData(cityMap, totalWithCity),
    };
  }, [customers]);

  const customerTypeDistribution = useMemo((): LocationData[] => {
    const map: Record<string, number> = {};
    let total = 0;
    for (const b of bookingsWithTypes) {
      if (b.customer_type) {
        map[b.customer_type] = (map[b.customer_type] || 0) + 1;
        total++;
      }
    }
    return toLocationData(map, total);
  }, [bookingsWithTypes]);

  const { customerTypeVsVehicle, allVehicleTypes } = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const vehicleSet = new Set<string>();

    for (const b of bookingsWithTypes) {
      if (!b.customer_type) continue;
      const vt = (b.vehicles as any)?.type;
      if (!vt) continue;
      vehicleSet.add(vt);
      if (!matrix[b.customer_type]) matrix[b.customer_type] = {};
      matrix[b.customer_type][vt] = (matrix[b.customer_type][vt] || 0) + 1;
    }

    const data: CustomerTypeVsVehicleData[] = Object.entries(matrix).map(([customerType, breakdown]) => ({
      customerType,
      vehicleBreakdown: breakdown,
      total: Object.values(breakdown).reduce((s, n) => s + n, 0),
    })).sort((a, b) => b.total - a.total);

    return { customerTypeVsVehicle: data, allVehicleTypes: Array.from(vehicleSet).sort() };
  }, [bookingsWithTypes]);

  const insuranceProfitability = useMemo((): InsuranceProfitData[] => {
    const revenueByType: Record<string, number> = {};
    for (const cost of insuranceCosts) {
      const typeName = cost.insurance_type || 'Unknown';
      revenueByType[typeName] = (revenueByType[typeName] || 0) + Number(cost.amount);
    }

    const costByType: Record<string, number> = {};
    for (const accident of accidents) {
      const insuranceTypeName = accident.rental_bookings?.insurance_types?.name_original || null;
      if (!insuranceTypeName) continue;
      costByType[insuranceTypeName] = (costByType[insuranceTypeName] || 0) + Number(accident.amount_paid_by_business);
    }

    const allTypes = new Set([...Object.keys(revenueByType), ...Object.keys(costByType)]);
    const result: InsuranceProfitData[] = [];

    for (const typeName of allTypes) {
      const revenue = revenueByType[typeName] || 0;
      const cost = costByType[typeName] || 0;
      result.push({
        insuranceType: typeName,
        revenue,
        businessPaidCost: cost,
        netProfit: revenue - cost,
      });
    }

    return result.sort((a, b) => b.revenue - a.revenue);
  }, [accidents, insuranceCosts]);

  return {
    ageGroups,
    countries,
    cities,
    customerTypeDistribution,
    customerTypeVsVehicle,
    allVehicleTypes,
    insuranceProfitability,
    loading,
    hasAccidentData: accidents.length > 0,
    hasLocationData: customers.some((c: any) => c.country || c.city) || customerTypeDistribution.length > 0,
    hasInsuranceData: insuranceCosts.length > 0 || accidents.some((a: any) => a.rental_bookings?.insurance_types?.name_original),
    hasTypeVsVehicleData: customerTypeVsVehicle.length > 0,
  };
}
