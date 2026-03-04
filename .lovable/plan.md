

## Plan: Fix SOLD UI Rendering in Vehicle Finance

### Root Cause (Confirmed)
`VehicleDetail.tsx` does not include `is_sold`, `sale_price`, or `sale_date` in its Vehicle interface or data transformation. The component always passes `false` for `isSold`, so the SOLD card never renders.

### Changes

**1. `src/pages/VehicleDetail.tsx` — Add missing sold fields**

- **Interface (lines 39-41)**: Add before closing brace:
  ```typescript
  is_sold?: boolean;
  sale_price?: number | null;
  sale_date?: string | null;
  ```

- **Data mapping (after line 159)**: Add:
  ```typescript
  is_sold: data.is_sold ?? false,
  sale_price: data.sale_price ?? null,
  sale_date: data.sale_date ?? null,
  ```

**2. `src/components/fleet/VehicleFinanceTab.tsx` — Hide "Value Loss Over Time" when sold**

- Wrap the card at lines 439-479 in `{!isSold && (...)}` so it does not render for sold vehicles.

### What does NOT change
- Sale calculation logic
- Transaction history
- Analytics aggregation
- Depreciation engine for active vehicles

