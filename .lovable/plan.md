

## Plan — Assets Widget UI Improvements

### 1. Remove Max-Width Constraint
**File:** `src/pages/Finance.tsx` line 478
- Change `className="container py-6"` to `className="w-full max-w-none px-4 lg:px-6 py-6"` — the `container` class applies `max-width` and `mx-auto`, which is the source of the horizontal whitespace.

### 2. Side-by-Side Layout (Assets + Transactions)
**File:** `src/components/finances/FinanceDashboard.tsx` lines 644-691
- Wrap `<AssetTrackingWidget />` and the Transactions `<Card>` in:
  ```
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
  ```

### 3. Fix Table Column Spacing
**File:** `src/components/finances/AssetTrackingWidget.tsx`
- Change the value column wrapper from `w-32` to `w-auto` and use `shrink-0` so the value input only takes the space it needs
- Change asset rows from `flex items-center gap-2` to `gap-1` to tighten spacing
- This applies to both vehicle rows (line 137/141) and custom asset rows (line 190/204)

### 4. Currency Formatting — €30.000
**File:** `src/components/finances/AssetTrackingWidget.tsx` line 30-32
- Change locale from `en-US` to `de-DE` and keep `€` prefix:
  ```typescript
  function formatCurrency(value: number): string {
    return `€${value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  ```

### 5. Fix Vehicle Category Duplication
**File:** `src/components/finances/AssetTrackingWidget.tsx`
- Replace the `vehicleCategoriesReady` state with a `useRef(false)` flag
- Remove `categories` from the `useEffect` dependency array to prevent re-triggering

### 6. Rename Button
- Change "Add Category" → "Add Asset Category" (and Greek equivalent)

### 7. Remove Number Input Arrows
**File:** `src/index.css`
- Add CSS to hide spinners:
  ```css
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type="number"] { -moz-appearance: textfield; }
  ```

### Files Modified
- `src/pages/Finance.tsx` — remove container max-width
- `src/components/finances/FinanceDashboard.tsx` — grid wrapper
- `src/components/finances/AssetTrackingWidget.tsx` — column spacing, currency format, duplication fix, button rename
- `src/index.css` — hide number spinners

