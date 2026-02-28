import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdditionalCostCategory {
  id: string;
  name: string;
  normalized_name: string;
  is_system: boolean;
}

export interface BookingAdditionalCost {
  id: string;
  name: string;
  amount: number;
  insurance_type?: string;
  category_id?: string;
  isNew?: boolean; // local-only flag for unsaved items
}

// Normalize a category name for dedup: lowercase, trim, remove special chars, collapse spaces
export function normalizeCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9\s\u0370-\u03FF\u1F00-\u1FFF]/g, '') // keep latin, greek, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Title-case for display
export function toTitleCase(str: string): string {
  return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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

export function useAdditionalCosts() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<AdditionalCostCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('additional_cost_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setCategories((data as AdditionalCostCategory[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Find or create a category, with fuzzy dedup
  const findOrCreateCategory = useCallback(async (name: string): Promise<AdditionalCostCategory | null> => {
    if (!user) return null;
    const normalized = normalizeCategoryName(name);
    if (!normalized) return null;

    // Check exact match first
    const exact = categories.find(c => c.normalized_name === normalized);
    if (exact) return exact;

    // Fuzzy match (85% threshold)
    const fuzzy = categories.find(c => diceSimilarity(c.normalized_name, normalized) >= 0.85);
    if (fuzzy) return fuzzy;

    // Create new
    const displayName = toTitleCase(name);
    const { data, error } = await supabase
      .from('additional_cost_categories')
      .insert({
        user_id: user.id,
        name: displayName,
        normalized_name: normalized,
        is_system: false
      })
      .select()
      .single();

    if (error) {
      // Might be a unique constraint violation (race condition) - fetch existing
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('additional_cost_categories')
          .select('*')
          .eq('user_id', user.id)
          .eq('normalized_name', normalized)
          .single();
        if (existing) {
          setCategories(prev => [...prev, existing as AdditionalCostCategory]);
          return existing as AdditionalCostCategory;
        }
      }
      console.error('Error creating category:', error);
      return null;
    }

    const newCat = data as AdditionalCostCategory;
    setCategories(prev => [...prev, newCat]);
    return newCat;
  }, [user, categories]);

  // Save booking additional costs to DB
  const saveBookingCosts = useCallback(async (
    bookingId: string,
    costs: BookingAdditionalCost[]
  ) => {
    if (!user) return;

    for (const cost of costs) {
      if (cost.amount <= 0) continue;

      // Find or create category for non-insurance items
      let categoryId = cost.category_id;
      if (!categoryId && cost.name && cost.name.toLowerCase() !== 'insurance') {
        const cat = await findOrCreateCategory(cost.name);
        categoryId = cat?.id || undefined;
      }

      await supabase.from('booking_additional_costs').insert({
        booking_id: bookingId,
        user_id: user.id,
        category_id: categoryId || null,
        name: cost.name,
        amount: cost.amount,
        insurance_type: cost.insurance_type || null
      });
    }
  }, [user, findOrCreateCategory]);

  // Get saved categories excluding "Insurance" (it's always shown as fixed)
  const savedCategories = categories.filter(c => c.normalized_name !== 'insurance');

  return {
    categories,
    savedCategories,
    loading,
    fetchCategories,
    findOrCreateCategory,
    saveBookingCosts,
    normalizeCategoryName
  };
}
