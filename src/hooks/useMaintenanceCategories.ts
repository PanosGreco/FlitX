import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MAINTENANCE_TYPES } from "@/constants/maintenanceTypes";

const STANDARD_TYPES = new Set(Object.keys(MAINTENANCE_TYPES));

/**
 * Shared hook that fetches user-created maintenance subcategories.
 * Looks at both vehicle_maintenance.type and financial_records.expense_subcategory
 * for maintenance category, to maintain a single source of truth across both entry points.
 */
export function useMaintenanceCategories() {
  const { user } = useAuth();
  const [userMaintenanceCategories, setUserMaintenanceCategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    if (!user) return;

    // Fetch from vehicle_maintenance (custom types not in standard list)
    const { data: maintenanceData } = await supabase
      .from('vehicle_maintenance')
      .select('type')
      .not('type', 'is', null);

    // Fetch from financial_records (maintenance expenses with custom subcategories)
    const { data: financeData } = await supabase
      .from('financial_records')
      .select('expense_subcategory')
      .eq('category', 'maintenance')
      .eq('type', 'expense')
      .not('expense_subcategory', 'is', null);

    const allTypes = new Set<string>();

    if (maintenanceData) {
      maintenanceData.forEach((r: any) => {
        const t = (r.type || '').trim();
        if (t && !STANDARD_TYPES.has(t)) {
          allTypes.add(t);
        }
      });
    }

    if (financeData) {
      financeData.forEach((r: any) => {
        const t = (r.expense_subcategory || '').trim();
        if (t && !STANDARD_TYPES.has(t)) {
          allTypes.add(t);
        }
      });
    }

    setUserMaintenanceCategories([...allTypes].sort((a, b) => a.localeCompare(b)));
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return { userMaintenanceCategories, refetchMaintenanceCategories: fetchCategories };
}
