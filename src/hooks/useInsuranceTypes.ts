import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeCategoryName, toTitleCase } from "@/hooks/useAdditionalCosts";

export interface InsuranceType {
  id: string;
  name_original: string;
  name_normalized: string;
}

// Simple string similarity (Dice coefficient)
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bi = s.substring(i, i + 2);
      set.set(bi, (set.get(bi) || 0) + 1);
    }
    return set;
  };
  const aBi = bigrams(a);
  const bBi = bigrams(b);
  let intersection = 0;
  aBi.forEach((count, bi) => {
    intersection += Math.min(count, bBi.get(bi) || 0);
  });
  return (2 * intersection) / (a.length - 1 + b.length - 1);
}

export function useInsuranceTypes() {
  const { user } = useAuth();
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsuranceTypes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('insurance_types')
      .select('id, name_original, name_normalized')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setInsuranceTypes((data as InsuranceType[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchInsuranceTypes();
  }, [fetchInsuranceTypes]);

  const findOrCreateInsuranceType = useCallback(async (name: string): Promise<InsuranceType | null> => {
    if (!user) return null;
    const normalized = normalizeCategoryName(name);
    if (!normalized) return null;

    // Exact match
    const exact = insuranceTypes.find(t => t.name_normalized === normalized);
    if (exact) return exact;

    // Fuzzy match (85%)
    const fuzzy = insuranceTypes.find(t => diceSimilarity(t.name_normalized, normalized) >= 0.85);
    if (fuzzy) return fuzzy;

    // Create new
    const displayName = toTitleCase(name);
    const { data, error } = await supabase
      .from('insurance_types')
      .insert({
        user_id: user.id,
        name_original: displayName,
        name_normalized: normalized,
      })
      .select('id, name_original, name_normalized')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('insurance_types')
          .select('id, name_original, name_normalized')
          .eq('user_id', user.id)
          .eq('name_normalized', normalized)
          .single();
        if (existing) {
          setInsuranceTypes(prev => [...prev, existing as InsuranceType]);
          return existing as InsuranceType;
        }
      }
      console.error('Error creating insurance type:', error);
      return null;
    }

    const newType = data as InsuranceType;
    setInsuranceTypes(prev => [...prev, newType]);
    return newType;
  }, [user, insuranceTypes]);

  return {
    insuranceTypes,
    loading,
    fetchInsuranceTypes,
    findOrCreateInsuranceType,
  };
}
