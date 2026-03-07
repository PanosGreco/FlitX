import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AssetCategory {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  is_vehicle_category: boolean;
  created_at: string;
}

export interface UserAsset {
  id: string;
  user_id: string;
  category_id: string;
  asset_name: string;
  asset_value: number;
  vehicle_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useUserAssets() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [catRes, assetRes] = await Promise.all([
      supabase
        .from("user_asset_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("user_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
    ]);
    if (catRes.data) setCategories(catRes.data as unknown as AssetCategory[]);
    if (assetRes.data) setAssets(assetRes.data as unknown as UserAsset[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addCategory = async (name: string, isVehicle = false) => {
    if (!user) return null;
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), -1);
    const { data, error } = await supabase
      .from("user_asset_categories")
      .insert({ user_id: user.id, name, sort_order: maxOrder + 1, is_vehicle_category: isVehicle } as any)
      .select()
      .single();
    if (error) return null;
    const cat = data as unknown as AssetCategory;
    setCategories((prev) => [...prev, cat]);
    return cat;
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("user_asset_categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setAssets((prev) => prev.filter((a) => a.category_id !== id));
  };

  const upsertAsset = async (asset: {
    id?: string;
    category_id: string;
    asset_name: string;
    asset_value: number;
    vehicle_id?: string | null;
  }) => {
    if (!user) return;
    if (asset.id) {
      const { data } = await supabase
        .from("user_assets")
        .update({
          asset_name: asset.asset_name,
          asset_value: asset.asset_value,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", asset.id)
        .select()
        .single();
      if (data) {
        const updated = data as unknown as UserAsset;
        setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      }
    } else {
      const maxOrder = assets
        .filter((a) => a.category_id === asset.category_id)
        .reduce((m, a) => Math.max(m, a.sort_order), -1);
      const { data } = await supabase
        .from("user_assets")
        .insert({
          user_id: user.id,
          category_id: asset.category_id,
          asset_name: asset.asset_name,
          asset_value: asset.asset_value,
          vehicle_id: asset.vehicle_id ?? null,
          sort_order: maxOrder + 1,
        } as any)
        .select()
        .single();
      if (data) {
        const created = data as unknown as UserAsset;
        setAssets((prev) => [...prev, created]);
      }
    }
  };

  const deleteAsset = async (id: string) => {
    await supabase.from("user_assets").delete().eq("id", id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return { categories, assets, loading, addCategory, deleteCategory, upsertAsset, deleteAsset, refetch: fetchAll };
}
