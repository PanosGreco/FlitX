import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared hook that fetches user-created Vehicle Parts subcategories.
 * Looks at financial_records where category='vehicle_parts' and expense_subcategory is set.
 */
export function useVehiclePartsCategories() {
  const { user } = useAuth();
  const [vehiclePartsSubcategories, setVehiclePartsSubcategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('financial_records')
      .select('expense_subcategory')
      .eq('category', 'vehicle_parts')
      .eq('type', 'expense')
      .not('expense_subcategory', 'is', null);

    if (data) {
      const unique = [...new Set(
        data
          .map((r: any) => (r.expense_subcategory || '').trim())
          .filter(Boolean)
      )] as string[];
      setVehiclePartsSubcategories(unique.sort((a, b) => a.localeCompare(b)));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return { vehiclePartsSubcategories, refetchVehiclePartsCategories: fetchCategories };
}
