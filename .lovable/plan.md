# Seasonal Mode for Analytics

A view-only filter layer that lets seasonal rental businesses (e.g. May–Sept) exclude off-season months from all analytics — charts, summaries, KPIs, growth, and averages — without touching any underlying data.

## Architecture
Seasonal Mode is a **smart upstream filter**, not a rewrite. Existing date utilities, chart aggregations, and breakdowns stay intact. We pre-filter records and pre-trim time buckets, and everything downstream just works.

---

## 1. Database — new `seasonal_settings` table

Migration creates one row per user:
- `is_seasonal` (bool), `season_months` (int[] 1–12), `is_paused` (bool), `paused_at` (timestamptz)
- `UNIQUE(user_id)` so each user has at most one config
- RLS: select/insert/update gated by `auth.uid() = user_id` (no delete needed)
- Array of months supports simple (`{5,6,7,8,9}`), cross-year (`{11,12,1,2}`), and discontinuous (`{4,5,6,9,10}`) seasons

## 2. New hook — `src/hooks/useSeasonalMode.ts`
Fetches the row via `maybeSingle()`, exposes:
- `settings`, `loading`
- `updateSettings(partial)` — upserts (insert if missing, update otherwise)
- Derived: `isSeasonalActive`, `isPaused`, `isMonthInSeason(m)`, `isDateInSeason(date)`

## 3. `src/utils/dateRangeUtils.ts` — add 3 helpers
- `filterBySeason(records, isActive, seasonMonths, isPaused, pausedAt)` — drops off-season records and (if paused) records after `pausedAt`
- `getSeasonalTimeframeLabel(timeframe, isActive, t)` — swaps "This Year" → "This Season", "All Time" → "All Seasons"
- `getSeasonLabel(year, seasonMonths)` — outputs "Season 2025" or "Season 2025-2026" for cross-year ranges

## 4. `src/components/finances/charts.tsx` — bucket trimming
- `getTimeBuckets()` gains optional `seasonMonths?: number[]` param. After generating buckets, filter out buckets whose month is off-season. All downstream aggregation logic untouched.
- For `yearly` granularity in "All Time" mode with seasonal active: replace year labels with `getSeasonLabel()`.
- `BarChart` and `LineChart` accept and forward `seasonMonths` to `getTimeBuckets`.

## 5. New dialog — `src/components/finances/SeasonalModeDialog.tsx`
Two sections inside a Dialog:
1. **Season Configuration** — toggle "My business operates seasonally" + 6×2 month grid. Selected months in primary color, unselected muted. Min 1 month required.
2. **Season Status** — "End Season" button (sets `is_paused=true`, `paused_at=now()`) with confirmation, or "Resume Season" when paused.

Save handler calls `updateSettings({ is_seasonal, season_months })`.

## 6. `src/components/finances/FinanceDashboard.tsx` — integration
- Add **Seasonal Mode** button near the timeframe selector (Sun icon, primary outline when active).
- Wire in `useSeasonalMode()`.
- New `seasonFilteredRecords` useMemo wraps the existing `filteredRecords` with `filterBySeason()`. Pass it to all downstream consumers (summary cards, charts, breakdowns, KPIs, transactions table).
- Pass `seasonMonths` prop to `BarChart` / `LineChart`.
- When paused, render a banner with a Resume button at the top.
- Swap "This Year" / "All Time" labels via `getSeasonalTimeframeLabel()`.

## 7. `IncomeBreakdown.tsx` + `ExpenseBreakdown.tsx`
- Add optional `seasonMonths?: number[]` prop.
- In growth-comparison code (previous-period filter) and `calcAvgMonthlyGrowth()` monthly grouping, also drop off-season months when `seasonMonths` is provided.

## 8. Translations
~20 keys merged into existing `src/i18n/locales/{en,el,de,fr,it,es}/finance.json` (the analytics page uses the `finance` namespace, not a separate `analytics.json`). Keys: `seasonalMode`, `seasonalModeActive`, `seasonalModeTitle`, `seasonalModeDescription`, `seasonalModeToggle`, `seasonalMonthsLabel`, `seasonalMonthsHint`, `seasonMinMonths`, `seasonStatus`, `seasonStatusActive`, `seasonStatusPaused`, `seasonEndButton`, `seasonEndConfirm`, `seasonResumeButton`, `resumeSeason`, `seasonPausedBanner`, `timeframe_season`, `timeframe_allSeasons`, `seasonLabel`. No existing keys overwritten.

---

## Safety guarantees
- **No data is mutated.** Toggling is a pure view filter; switching modes is instant and reversible.
- **Off-season writes still allowed.** Recording an insurance/maintenance expense in February while running a May–Sept season works fine — it's just hidden from analytics until the user switches back to full-year view.
- **AI edge function untouched.** `supabase/functions/ai-chat/index.ts` keeps its rolling 12-month window separate from the frontend view.
- **CRM, Fleet, and Finance record-creation pages untouched.**

## Files NOT touched
`supabase/functions/ai-chat/index.ts`, `src/pages/Finance.tsx`, any CRM file, any Fleet file.
