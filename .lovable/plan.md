

# Plan: Analytics Dashboard Visual Refinement Round 1

Styling-only changes across 2 files. No logic changes.

## File 1: `src/components/finances/FinanceDashboard.tsx`

**Root container (line 483):** `space-y-6` → `space-y-4` (already has `animate-fade-in`)

**Summary cards grid (line 568):** `gap-4` → `gap-3`

**Charts grid (line 602):** `gap-6` → `gap-4`

**Assets+Transactions grid (line 641):** `gap-6` → `gap-4`

**Chart card 1 (lines 603-610):**
- `<CardHeader>` → `<CardHeader className="pb-2">`
- `<CardTitle className="text-lg">` → `<CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">`
- `<CardContent className="pt-0">` → `<CardContent className="pt-0 pb-3">`

**Chart card 2 (lines 612-619):** Same changes as chart card 1.

**SummaryCard component (lines 749-796):**
- Line 773: `p-6` → `p-4`
- Line 776: `text-sm text-muted-foreground` → `text-xs font-medium text-muted-foreground uppercase tracking-wide`
- Line 777: `text-2xl font-semibold mt-1` → `text-2xl font-bold mt-0.5`
- Lines 782-785: Replace the trend `<div>` classes with `cn("flex items-center text-xs font-medium px-2 py-0.5 rounded-full", displayedTrend ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100")`

## File 2: `src/components/finances/charts.tsx`

- BarChart (line 194): `h-80` → `h-64`
- LineChart (line 242): `h-80` → `h-64`

No other changes in this file.

## Files Modified
1. `src/components/finances/FinanceDashboard.tsx` — spacing, card padding, typography, trend badge
2. `src/components/finances/charts.tsx` — chart heights only

