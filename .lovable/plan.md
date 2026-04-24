# Fix: Seasonal Mode button does nothing on click

## Root cause
In `src/components/finances/FinanceDashboard.tsx`, the Seasonal Mode feature is fully wired:
- `SeasonalModeDialog` is imported (line 45)
- `isSeasonalDialogOpen` state exists (line 193)
- The button calls `setIsSeasonalDialogOpen(true)` (line 695)

…but the `<SeasonalModeDialog />` component is **never rendered** in the JSX. So clicking the button flips state, yet no dialog mounts — nothing visible happens.

## Fix
Add the dialog render at the bottom of the FinanceDashboard JSX (alongside other modals/overlays):

```tsx
<SeasonalModeDialog
  open={isSeasonalDialogOpen}
  onOpenChange={setIsSeasonalDialogOpen}
/>
```

## Files changed
- `src/components/finances/FinanceDashboard.tsx` — single addition: mount `<SeasonalModeDialog>` bound to existing `isSeasonalDialogOpen` state.

## Out of scope
No changes to the dialog component, hook, DB, translations, or filtering logic — those are already in place and correct.
