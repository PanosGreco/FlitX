import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Package } from "lucide-react";
import { useUserAssets, type AssetCategory, type UserAsset } from "@/hooks/useUserAssets";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
}

const VEHICLE_TYPE_LABELS: Record<string, { en: string; el: string }> = {
  car: { en: "Cars", el: "Αυτοκίνητα" },
  motorbike: { en: "Motorbikes", el: "Μοτοσυκλέτες" },
  atv: { en: "ATVs", el: "ATVs" },
  boat: { en: "Boats", el: "Σκάφη" },
  bicycle: { en: "Bicycles", el: "Ποδήλατα" },
  scooter: { en: "Scooters", el: "Σκούτερ" },
  other: { en: "Other Vehicles", el: "Άλλα Οχήματα" },
};

function formatCurrency(value: number): string {
  return `€${value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function AssetTrackingWidget() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { categories, assets, loading, addCategory, deleteCategory, upsertAsset, deleteAsset } = useUserAssets();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const initRef = useRef(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fetch vehicles
  useEffect(() => {
    if (!user) return;
    supabase
      .from("vehicles")
      .select("id, make, model, year, vehicle_type")
      .eq("user_id", user.id)
      .eq("is_sold", false)
      .then(({ data }) => {
        if (data) setVehicles(data);
      });
  }, [user]);

  // Auto-create vehicle categories (once)
  useEffect(() => {
    if (loading || initRef.current || vehicles.length === 0) return;
    initRef.current = true;

    const vehicleTypes = [...new Set(vehicles.map((v) => v.vehicle_type))];
    const existingVehicleCats = categories.filter((c) => c.is_vehicle_category);

    const missing = vehicleTypes.filter(
      (vt) => !existingVehicleCats.some((c) => c.name === (VEHICLE_TYPE_LABELS[vt]?.en || vt))
    );

    if (missing.length > 0) {
      Promise.all(missing.map((vt) => addCategory(VEHICLE_TYPE_LABELS[vt]?.en || vt, true)));
    }
  }, [loading, vehicles]);

  const handleDebouncedUpsert = useCallback(
    (key: string, data: Parameters<typeof upsertAsset>[0]) => {
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(() => upsertAsset(data), 600);
    },
    [upsertAsset]
  );

  // Group vehicles by type
  const vehiclesByType: Record<string, Vehicle[]> = {};
  vehicles.forEach((v) => {
    if (!vehiclesByType[v.vehicle_type]) vehiclesByType[v.vehicle_type] = [];
    vehiclesByType[v.vehicle_type].push(v);
  });

  const vehicleCategories = categories.filter((c) => c.is_vehicle_category);
  const customCategories = categories.filter((c) => !c.is_vehicle_category);

  // Calculate totals
  let grandTotal = 0;

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName("");
    setShowNewCategory(false);
  };

  const lang = language as "en" | "el";

  const renderVehicleCategory = (cat: AssetCategory) => {
    const vType = Object.keys(VEHICLE_TYPE_LABELS).find(
      (k) => VEHICLE_TYPE_LABELS[k].en === cat.name
    );
    const vehs = vType ? vehiclesByType[vType] || [] : [];
    const catAssets = assets.filter((a) => a.category_id === cat.id);
    const catLabel = vType ? VEHICLE_TYPE_LABELS[vType][lang] : cat.name;

    let categoryTotal = 0;
    catAssets.forEach((a) => (categoryTotal += Number(a.asset_value) || 0));
    grandTotal += categoryTotal;

    return (
      <div key={cat.id} className="mb-6">
        <Separator className="mb-3" />
        <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 mb-2">
          <span className="font-bold text-sm uppercase tracking-wide">{catLabel}</span>
        </div>
        <div className="space-y-1">
          {vehs.map((v) => {
            const existing = catAssets.find((a) => a.vehicle_id === v.id);
            const value = existing ? Number(existing.asset_value) : 0;
            return (
              <div key={v.id} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-sm truncate mr-2">
                  {v.make} {v.model} {v.year}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    className="h-8 w-24 text-right text-sm"
                    defaultValue={value || ""}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      handleDebouncedUpsert(`vehicle-${v.id}`, {
                        id: existing?.id,
                        category_id: cat.id,
                        asset_name: `${v.make} ${v.model} ${v.year}`,
                        asset_value: val,
                        vehicle_id: v.id,
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end px-3 py-2 border-t border-border/50 mt-1">
          <span className="text-sm font-bold">
            {lang === "el" ? `Σύνολο ${catLabel}` : `Total ${catLabel}`}: {formatCurrency(categoryTotal)}
          </span>
        </div>
      </div>
    );
  };

  const renderCustomCategory = (cat: AssetCategory) => {
    const catAssets = assets.filter((a) => a.category_id === cat.id);
    let categoryTotal = 0;
    catAssets.forEach((a) => (categoryTotal += Number(a.asset_value) || 0));
    grandTotal += categoryTotal;

    return (
      <div key={cat.id} className="mb-6">
        <Separator className="mb-3" />
        <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 mb-2">
          <span className="font-bold text-sm uppercase tracking-wide">{cat.name}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory(cat.id)}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
        <div className="space-y-1">
          {catAssets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between px-3 py-1.5 group">
              <Input
                type="text"
                className="h-8 text-sm mr-2 min-w-0"
                defaultValue={asset.asset_name}
                onChange={(e) => {
                  handleDebouncedUpsert(`name-${asset.id}`, {
                    id: asset.id,
                    category_id: cat.id,
                    asset_name: e.target.value,
                    asset_value: Number(asset.asset_value),
                  });
                }}
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  className="h-8 w-24 text-right text-sm"
                  defaultValue={Number(asset.asset_value) || ""}
                  placeholder="0"
                  onChange={(e) => {
                    handleDebouncedUpsert(`value-${asset.id}`, {
                      id: asset.id,
                      category_id: cat.id,
                      asset_name: asset.asset_name,
                      asset_value: Number(e.target.value) || 0,
                    });
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                onClick={() => deleteAsset(asset.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 mt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() =>
              upsertAsset({
                category_id: cat.id,
                asset_name: lang === "el" ? "Νέο στοιχείο" : "New asset",
                asset_value: 0,
              })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {lang === "el" ? "Προσθήκη" : "Add Asset"}
          </Button>
          <span className="text-sm font-bold">
            {lang === "el" ? `Σύνολο ${cat.name}` : `Total ${cat.name}`}: {formatCurrency(categoryTotal)}
          </span>
        </div>
      </div>
    );
  };

  // Reset grand total before render
  grandTotal = 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          {lang === "el" ? "Περιουσιακά Στοιχεία" : "Assets"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">
            {lang === "el" ? "Φόρτωση..." : "Loading..."}
          </p>
        ) : (
          <>
            {vehicleCategories.map(renderVehicleCategory)}
            {customCategories.map(renderCustomCategory)}

            {/* Grand Total */}
            <Separator className="my-4" />
            <div className="flex justify-end px-3 py-3 bg-primary/5 rounded-lg">
              <span className="text-base font-bold">
                {lang === "el" ? "Συνολικά Περιουσιακά Στοιχεία" : "Total Assets"}: {formatCurrency(grandTotal)}
              </span>
            </div>

            {/* Add Category */}
            <div className="mt-4">
              {showNewCategory ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={lang === "el" ? "Όνομα κατηγορίας" : "Category name"}
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddCategory}>
                    {lang === "el" ? "Προσθήκη" : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewCategory(false)}>
                    {lang === "el" ? "Ακύρωση" : "Cancel"}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowNewCategory(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {lang === "el" ? "Προσθήκη Κατηγορίας Στοιχείων" : "Add Asset Category"}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
