import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared hook that fetches user-created collaboration entries from financial_records.
 * Collaboration entries are stored as income_source_type='collaboration' with
 * income_source_specification containing the partner name.
 */
export function useCollaborations() {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState<string[]>([]);

  const fetchCollaborations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('financial_records')
      .select('income_source_specification')
      .eq('income_source_type', 'collaboration')
      .eq('type', 'income')
      .not('income_source_specification', 'is', null);

    if (data) {
      const unique = [...new Set(
        data
          .map((r: any) => (r.income_source_specification || '').trim())
          .filter(Boolean)
      )] as string[];
      setCollaborations(unique.sort((a, b) => a.localeCompare(b)));
    }
  };

  useEffect(() => {
    fetchCollaborations();
  }, [user]);

  return { collaborations, refetchCollaborations: fetchCollaborations };
}
