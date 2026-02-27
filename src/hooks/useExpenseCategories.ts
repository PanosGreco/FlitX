import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared hook that fetches user-created expense categories (via "Other").
 * Looks at financial_records where category='other' and expense_subcategory is set.
 */
export function useExpenseCategories() {
  const { user } = useAuth();
  const [userExpenseCategories, setUserExpenseCategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('financial_records')
      .select('expense_subcategory')
      .eq('category', 'other')
      .eq('type', 'expense')
      .not('expense_subcategory', 'is', null);

    if (data) {
      const unique = [...new Set(
        data
          .map((r: any) => (r.expense_subcategory || '').trim())
          .filter(Boolean)
      )] as string[];
      setUserExpenseCategories(unique.sort((a, b) => a.localeCompare(b)));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return { userExpenseCategories, refetchExpenseCategories: fetchCategories };
}
