
# Depreciation Progress Circle - Logic & Visual Fix

## Problem Analysis

After reviewing the current implementation, I've identified the following issues:

### Current Issues

| Issue | Description |
|-------|-------------|
| **Progress Logic** | The component is working correctly for percentage calculation, but the visual rendering shows the blue segment filling from bottom-right instead of matching the reference |
| **Color Semantics** | The colors are semantically correct (blue = depreciated, secondary = remaining), but the visual gap and styling don't match the 21st.dev reference |
| **Visual Styling** | The current component lacks the distinct gap between segments that the reference shows |
| **Missing Tooltip** | No hover interaction showing the depreciated amount |

### Reference Analysis (from screenshot)

The 21st.dev component shows:
- A clear gap between the blue (progress) and gray (remaining) segments
- Rounded stroke endings on both segments
- The blue segment represents the filled/completed portion
- The gray segment represents the remaining portion
- Value displayed centered inside the circle

---

## Implementation Plan

### Step 1: Fix AnimatedCircularProgressBar Component

**File:** `src/components/ui/animated-circular-progress-bar.tsx`

**Changes:**
1. Add `onHover` callback prop for tooltip functionality
2. Ensure the primary color circle (blue) represents the **depreciated amount**
3. Ensure the secondary color circle (white/light gray) represents the **remaining amount**
4. The visual rendering already has gaps between segments via the `--gap-percent` CSS variable
5. Add a wrapper element for the primary circle to enable hover detection

**Updated Props Interface:**
```typescript
interface Props {
  max: number
  value: number
  min: number
  gaugePrimaryColor: string
  gaugeSecondaryColor: string
  className?: string
  displayValue?: React.ReactNode
  onPrimaryHover?: (isHovering: boolean) => void  // NEW: for tooltip
  primaryHoverContent?: React.ReactNode  // NEW: tooltip content
}
```

### Step 2: Update VehicleFinanceTab Usage

**File:** `src/components/fleet/VehicleFinanceTab.tsx`

**Changes:**

1. **Verify Correct Values Are Passed:**
   - `value` = `depreciationPercentage` (this is correct)
   - Blue (primary) shows depreciated amount
   - White/gray (secondary) shows remaining

2. **Add Hover Tooltip State:**
```typescript
const [showDepreciatedTooltip, setShowDepreciatedTooltip] = useState(false);
```

3. **Add Tooltip Component:**
   - Show on hover over the blue section
   - Display: "€X depreciated" where X = Net Income (the depreciated amount)

4. **Pass Depreciated Amount for Tooltip:**
```typescript
const depreciatedAmount = netIncome; // This equals the blue portion
```

---

## Technical Details

### Progress Logic Verification

The current formula is correct:
```typescript
// Depreciation Progress (%) = (Net Income / Purchase Value) * 100
const depreciationPercentage = Math.min(100, (netIncome / purchasePrice) * 100);

// Remaining = Purchase Value - Net Income
const remainingForDepreciation = Math.max(0, purchasePrice - netIncome);
```

### Color Semantics (Correct Mapping)

| Color | Represents | Value |
|-------|-----------|-------|
| Blue (Primary) | Depreciated Amount | Net Income |
| Light Gray (Secondary) | Remaining for Depreciation | Purchase Value - Net Income |

### Visual Improvements

1. Keep the indigo blue color: `rgb(79 70 229)`
2. Use a lighter gray for better contrast: `rgba(0, 0, 0, 0.1)` 
3. The gap between segments is controlled by `--gap-percent: "5"`
4. Both segments already have `strokeLinecap="round"` for curved edges

---

## Files to Modify

1. **`src/components/ui/animated-circular-progress-bar.tsx`**
   - Add hover state detection for the primary (blue) circle
   - Add optional tooltip/hover content props
   - Maintain exact visual structure from 21st.dev

2. **`src/components/fleet/VehicleFinanceTab.tsx`**
   - Add tooltip state management
   - Wrap the progress bar with a tooltip-enabled container
   - Show "€X depreciated" on hover over the blue section
   - Display the depreciated amount (Net Income) in the tooltip

---

## Expected Results

After implementation:

| State | Blue Section | White Section | Center Display | Tooltip on Hover |
|-------|-------------|---------------|----------------|------------------|
| 0% depreciated | Empty | 100% | €10,000 remaining | "€0 depreciated" |
| 25% depreciated | 25% | 75% | €7,500 remaining | "€2,500 depreciated" |
| 50% depreciated | 50% | 50% | €5,000 remaining | "€5,000 depreciated" |
| 100% depreciated | Replaced by Net Profit Card | N/A | N/A | N/A |

---

## Implementation Checklist

- [ ] Update AnimatedCircularProgressBar with hover detection
- [ ] Add tooltip state in VehicleFinanceTab
- [ ] Implement Tooltip component showing depreciated amount
- [ ] Verify visual matches 21st.dev reference (gap between segments, rounded ends)
- [ ] Test with various depreciation percentages
- [ ] Ensure existing metrics (Total Revenue, Total Expenses, Net Income) are unchanged
