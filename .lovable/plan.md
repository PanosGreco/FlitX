

# Plan: AI Chat — CRM Data Integration + Customer & Risk Insights Preset

## Summary
Add CRM data (customers + accidents) to the AI Chat's pre-computed knowledge base, and add a 5th preset button "Customer & Risk Insights". Following the existing architecture: the AI computes nothing — all metrics are pre-computed in a new `computeCRMContext()` function and injected into the system prompt.

---

## Backend changes — `supabase/functions/ai-chat/index.ts`

### 1. Add 2 new parallel queries
Extend the existing `Promise.all` (line 77) with:
- `customers`: id, name, email, birth_date, city, country, country_code, lifetime value + booking/accident totals
- `accidents`: id, accident_date, description, damage cost breakdown, payer_type, notes, customer_id, vehicle_id, booking_id

### 2. Extend bookings query
Add `customer_type`, `customer_id`, `insurance_type_id` to the bookings select (needed for customer-type vs vehicle-type analysis).

### 3. New function `computeCRMContext(customers, accidents, bookings, vehicles)`
Pre-computes a formatted text block containing:
- Customer overview totals
- Country distribution (top 10 with %)
- City distribution (top 10)
- Age distribution (5 buckets: 18–22, 23–30, 31–45, 46–60, 61+) with revenue per bucket
- Customer type distribution from bookings
- Customer type → vehicle type relationship matrix
- Top 5 customers by revenue
- Top 5 customers by accident cost
- Accident summary (total damage, % covered by insurance/customer/business)
- Accident cost by age group
- Payer type distribution
- Per-vehicle accident ranking (highest damage first)
- Last 15 accident descriptions for pattern analysis

Empty-state guard: if `customers.length === 0`, returns a short "no CRM data yet" notice.

### 4. Inject CRM context into system prompt
- Add 5th param `crmContext?: string` to `buildSystemPrompt()`.
- Compute it unconditionally after `buildBusinessContext` and pass it through.
- Append the CRM block in BOTH the standard prompt builder and the financial-preset slim prompt (`buildFinancialSystemPrompt`) so the AI can reference customers in any conversation.

### 5. Customer & Risk Insights preset prompt
Add a new branch in the preset-prompt section (alongside the existing 4) that activates when `presetType === 'customer_risk_insights'`. The branch instructs the model to deliver a 6-section structured report:
1. Customer demographics overview
2. Customer type vs vehicle preference patterns
3. Accident risk analysis by age + vehicle
4. Insurance effectiveness (coverage ratio)
5. High-value vs high-risk customers (overlap check)
6. 3–5 actionable recommendations + 2–3 follow-up questions

Strict rule: "Use pre-computed CRM data EXACTLY — do not recalculate."

Note: There is no server-side `presetTitleMap` — preset titles are handled client-side, so no edit needed there.

---

## Frontend changes

### `src/components/ai-assistant/PresetActionButtons.tsx`
- Add `'customer_risk_insights'` to the `presetType` union.
- Import `Users` from `lucide-react`.
- Append 5th entry to `PRESET_BUTTONS` array using `presets.customerRiskInsights.*` translation keys.
- Layout stays `grid-cols-1 sm:grid-cols-2`; the 5th button takes the bottom-left and the bottom-right is intentionally empty (room for future 6th preset).

### Translations — `src/i18n/locales/{en,el,de,fr,it,es}/ai.json`
Merge into the existing `presets` object a new `customerRiskInsights` key with `title` and `description` for all 6 languages (English, Greek, German, French, Italian, Spanish). Existing keys untouched.

---

## Architecture notes

- AI computes nothing — the same "pre-computed text, use exactly" pattern as `computeFinancialContext`.
- CRM context is included for ALL conversations (not gated by preset), so the AI can answer customer/accident questions in general chat.
- RLS-scoped: both new queries are filtered by `user_id = user.id`, preserving multi-tenant isolation per `mem://security/ai-assistant-isolation-hardening`.
- No DB schema changes, no new tables, no edits to `ai-chat-save`, CRM page, or hooks.

## Files NOT touched
`src/pages/CRM.tsx`, `src/hooks/useCRMChartData.ts`, any CRM component, `supabase/functions/ai-chat-save/index.ts`, any migration.

