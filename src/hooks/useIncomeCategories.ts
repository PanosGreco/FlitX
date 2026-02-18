import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared hook that fetches user-created income categories from financial_records.
 * Used across Finance page, UnifiedBookingDialog, and RentalBookingDialog
 * to maintain a single source of truth for non-recurring income categories.
 */
export function useIncomeCategories() {
  const { user } = useAuth();
  const [userIncomeCategories, setUserIncomeCategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('financial_records')
      .select('income_source_specification')
      .eq('income_source_type', 'other')
      .eq('type', 'income')
      .not('income_source_specification', 'is', null);

    if (data) {
      const unique = [...new Set(
        data
          .map((r: any) => (r.income_source_specification || '').trim())
          .filter(Boolean)
      )] as string[];
      setUserIncomeCategories(unique);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return { userIncomeCategories, refetchCategories: fetchCategories };
}
