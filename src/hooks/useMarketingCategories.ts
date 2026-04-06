import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared hook that fetches user-created Marketing subcategories.
 * Looks at financial_records where category='marketing' and expense_subcategory is set.
 */
export function useMarketingCategories() {
  const { user } = useAuth();
  const [marketingSubcategories, setMarketingSubcategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('financial_records')
      .select('expense_subcategory')
      .eq('category', 'marketing')
      .eq('type', 'expense')
      .not('expense_subcategory', 'is', null);

    if (data) {
      const unique = [...new Set(
        data
          .map((r: any) => (r.expense_subcategory || '').trim())
          .filter(Boolean)
      )] as string[];
      setMarketingSubcategories(unique.sort((a, b) => a.localeCompare(b)));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return { marketingSubcategories, refetchMarketingCategories: fetchCategories };
}
