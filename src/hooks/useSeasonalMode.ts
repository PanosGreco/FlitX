import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SeasonalSettings {
  id: string;
  is_seasonal: boolean;
  season_months: number[]; // 1-12
  is_paused: boolean;
  paused_at: string | null;
}

const DEFAULTS = {
  is_seasonal: false,
  season_months: [] as number[],
  is_paused: false,
  paused_at: null as string | null,
};

export function useSeasonalMode() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SeasonalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('seasonal_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[useSeasonalMode] Fetch error:', error);
    }
    setSettings((data as SeasonalSettings | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<Omit<SeasonalSettings, 'id'>>) => {
      if (!user) return;

      if (settings) {
        const { error } = await supabase
          .from('seasonal_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (error) {
          console.error('[useSeasonalMode] Update error:', error);
          return;
        }
      } else {
        const { error } = await supabase
          .from('seasonal_settings')
          .insert({ user_id: user.id, ...DEFAULTS, ...updates });
        if (error) {
          console.error('[useSeasonalMode] Insert error:', error);
          return;
        }
      }
      await fetchSettings();
    },
    [user, settings, fetchSettings]
  );

  const isSeasonalActive =
    settings?.is_seasonal === true && (settings?.season_months?.length ?? 0) > 0;
  const isPaused = settings?.is_paused === true;
  const seasonMonths = settings?.season_months ?? [];

  const isMonthInSeason = useCallback(
    (month: number): boolean => {
      if (!isSeasonalActive) return true;
      return seasonMonths.includes(month);
    },
    [isSeasonalActive, seasonMonths]
  );

  const isDateInSeason = useCallback(
    (date: Date): boolean => {
      if (!isSeasonalActive) return true;
      if (isPaused && settings?.paused_at) {
        const pauseDate = new Date(settings.paused_at);
        if (date > pauseDate) return false;
      }
      return seasonMonths.includes(date.getMonth() + 1);
    },
    [isSeasonalActive, isPaused, settings, seasonMonths]
  );

  return {
    settings,
    loading,
    updateSettings,
    isSeasonalActive,
    isPaused,
    seasonMonths,
    isMonthInSeason,
    isDateInSeason,
    refetch: fetchSettings,
  };
}
