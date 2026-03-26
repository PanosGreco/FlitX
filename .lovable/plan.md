

# Plan: Analytics Dashboard Visual Refinement Round 2

Styling-only changes across 4 files. Zero logic changes.

## File 1: `src/components/finances/IncomeBreakdown.tsx`

- **Lines 262-267** (empty state): Smaller icon `h-4 w-4`, header to `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
- **Line 274**: Add `shadow-sm` to Card
- **Lines 276-278** (section header): Same icon/header changes as empty state, `mb-4` → `mb-3`
- **Line 290**: Table header `bg-primary hover:bg-primary` → `bg-slate-800 hover:bg-slate-800`
- **Line 338**: Vehicle category header `bg-emerald-600 hover:bg-emerald-600` → `bg-slate-700 hover:bg-slate-700`
- **Line 414**: Remove `mx-[70px]` from Most Profitable card
- **Line 424**: Vehicle rows get `py-1.5 px-2.5 bg-green-50/70 rounded-md border border-green-100`

## File 2: `src/components/finances/ExpenseBreakdown.tsx`

- **Lines 313-317** (empty state): Same icon/header changes
- **Line 325**: Add `shadow-sm` to Card
- **Lines 327-329** (section header): Same changes
- **Line 341**: Table header → `bg-slate-800 hover:bg-slate-800`
- **Line 389**: Vehicle category header → `bg-slate-700 hover:bg-slate-700`
- **Line 465**: Remove `mx-[70px]` from Least Profitable card
- **Line 475**: Vehicle rows get `py-1.5 px-2.5 bg-red-50/70 rounded-md border border-red-100`

## File 3: `src/components/finances/AssetTrackingWidget.tsx`

- **Lines 257-258**: CardTitle to `text-sm font-semibold uppercase tracking-wide text-muted-foreground`, icon `h-4 w-4`
- **Lines 121, 174**: Category section `mb-3` → `mb-2`
- **Lines 122, 175**: Separator add `opacity-50`
- **Lines 124, 177**: Category header text to `font-semibold text-xs tracking-wider text-foreground/80`
- **Line 131**: Vehicle rows add `hover:bg-muted/30 rounded-sm transition-colors`, `py-1.5` → `py-1`
- **Line 132**: Vehicle name `text-sm` → `text-xs`
- **Line 136**: Euro `text-sm` → `text-xs`
- **Lines 139, 203**: Number inputs `h-8 w-24 text-sm` → `h-7 w-20 text-xs border-muted`
- **Line 187**: Name inputs `h-8 text-sm` → `h-7 text-xs border-muted`
- **Line 200**: Euro in custom cats `text-sm` → `text-xs`
- **Lines 159, 243**: Category total `text-sm` → `text-xs`
- **Line 274**: Grand total bg to `bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700`
- **Line 275**: Grand total text `text-base` → `text-sm`

## File 4: `src/components/finances/FinanceDashboard.tsx`

- **Lines 647-648**: Transaction header add `pb-2`, title to `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
- **Line 811**: Transaction item padding `p-3` → `p-2.5`
- **Line 814**: Icon circle `w-8 h-8` → `w-7 h-7`
- **Lines 818, 820**: Icons `h-4 w-4` → `h-3.5 w-3.5`
- **Line 825**: Title add `text-sm`

## Files Modified
1. `src/components/finances/IncomeBreakdown.tsx`
2. `src/components/finances/ExpenseBreakdown.tsx`
3. `src/components/finances/AssetTrackingWidget.tsx`
4. `src/components/finances/FinanceDashboard.tsx`

