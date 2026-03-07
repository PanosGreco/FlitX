

## Implementation Plan — Asset Tracking Widget (Revised)

### Database — Two New Tables

**Table 1: `user_asset_categories`** — Explicit category storage

```sql
CREATE TABLE public.user_asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_vehicle_category boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- RLS: standard user-scoped SELECT, INSERT, UPDATE, DELETE
```

**Table 2: `user_assets`** — Individual asset entries

```sql
CREATE TABLE public.user_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.user_asset_categories(id) ON DELETE CASCADE,
  asset_name text NOT NULL,
  asset_value numeric NOT NULL DEFAULT 0,
  vehicle_id uuid DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: standard user-scoped SELECT, INSERT, UPDATE, DELETE
```

This ensures categories persist independently of assets, support ordering, and are future-proof for metadata.

---

### New Files

**`src/hooks/useUserAssets.ts`** — CRUD hook:
- `fetchCategories()` / `fetchAssets()` — load all for current user
- `upsertCategory(name)` — create or update category
- `upsertAsset(asset)` — insert or update asset row
- `deleteAsset(id)` — remove single asset
- `deleteCategory(id)` — removes category (cascade deletes its assets)

**`src/components/finances/AssetTrackingWidget.tsx`** — Main widget:
- Fetches `user_asset_categories` and `user_assets` for the user
- Fetches `vehicles` table to auto-populate vehicle sections
- Renders category sections as table groups with visual dividers

---

### Vehicle Auto-Population Logic

Vehicles are the **source of truth** for vehicle rows — NOT `user_assets`.

1. Query `vehicles` for the current user, group by `vehicle_type`
2. For each vehicle type group, find or auto-create a corresponding `user_asset_categories` row (with `is_vehicle_category = true`) on first widget load
3. Display every vehicle as a row: `{make} {model} {year}` | value input
4. Value comes from matching `user_assets` row (by `vehicle_id`); if none exists, show empty input
5. On value entry, upsert into `user_assets` with the `vehicle_id` link
6. Vehicle names are read-only (derived from fleet); only value is editable
7. Vehicles always appear even with no value entered

---

### Custom Categories & Assets

- "Add Category" button at widget bottom → text input for name → inserts into `user_asset_categories`
- "Add Asset" button per category → adds row with editable name + value inputs
- Delete buttons (trash icon, ghost variant) for individual assets and entire categories
- Edits persist via debounced upserts to `user_assets`

---

### Calculations (Client-Side)

- Category total = `SUM(asset_value)` for all assets in that category (including vehicle rows with values)
- Total Assets = sum of all category totals
- Totals update instantly on value change

---

### UI Design

```text
────────────────────────────────────
CARS
────────────────────────────────────
Asset Name              │  Value (€)
BMW X3 2020             │   €28,000
Audi A4 2019            │   €24,000
                Total Cars   €52,000

────────────────────────────────────
HELMETS
────────────────────────────────────
Shoei NXR               │      €400
Arai Profile-V          │      €500
              Total Helmets     €900
                    [+ Add Asset]

════════════════════════════════════
        TOTAL ASSETS      €52,900
════════════════════════════════════
                  [+ Add Category]
```

- Card-based layout matching existing widgets
- Category headers: bold text, `bg-muted/50` background, `Separator` dividers between sections
- Values: right-aligned, formatted with `€` symbol and thousand separators (e.g., `€28,000`)
- Category totals: bold row at section bottom
- Final total: emphasized summary row with larger/bolder font
- Delete: ghost trash button, visible on hover
- Categories display in `sort_order` (defaulting to creation order)

---

### Integration Point

**`src/components/finances/FinanceDashboard.tsx`** — line ~641, insert `<AssetTrackingWidget />` between `<ExpenseBreakdown />` and the Transactions `<Card>`.

---

### What Does NOT Change

- `financial_records` table and all financial logic
- Income/expense analytics, charts, cumulative graphs
- Transaction history
- Category/subcategory systems for expenses/income
- Currency formatting elsewhere in the app

