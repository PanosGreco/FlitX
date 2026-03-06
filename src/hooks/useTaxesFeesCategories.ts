import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Default built-in subcategory for Taxes & Fees
const DEFAULT_TAX_SUBCATEGORY = "Income Tax";

/**
 * Shared hook that fetches user-created Taxes & Fees subcategories.
 * Looks at financial_records where category='tax' and expense_subcategory is set.
 * Includes a default "Income Tax" subcategory that is initialized on first use.
 */
export function useTaxesFeesCategories() {
  const { user } = useAuth();
  const [taxSubcategories, setTaxSubcategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('financial_records')
      .select('expense_subcategory')
      .eq('category', 'tax')
      .eq('type', 'expense')
      .not('expense_subcategory', 'is', null);

    const existing = new Set<string>();
    if (data) {
      data.forEach((r: any) => {
        const t = (r.expense_subcategory || '').trim();
        if (t) existing.add(t);
      });
    }

    // Also check recurring_transactions for tax subcategories
    const { data: recurringData } = await supabase
      .from('recurring_transactions')
      .select('expense_subcategory')
      .eq('category', 'tax')
      .eq('type', 'expense')
      .not('expense_subcategory', 'is', null);

    if (recurringData) {
      recurringData.forEach((r: any) => {
        const t = (r.expense_subcategory || '').trim();
        if (t) existing.add(t);
      });
    }

    // Ensure default subcategory is always present
    existing.add(DEFAULT_TAX_SUBCATEGORY);

    setTaxSubcategories([...existing].sort((a, b) => a.localeCompare(b)));
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return { taxSubcategories, refetchTaxCategories: fetchCategories };
}
