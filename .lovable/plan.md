

# Plan: AI Chat Section Documentation — Multi-File Structure

## Overview

Create `/documentation/ai-chat/` with 8 markdown files documenting the AI Chat as the intelligence and decision-making layer of FlitX.

## Files to Create

### 1. `/documentation/ai-chat/README.md` (~150 lines)
**System-level context and role definitions.**
- AI Chat as the intelligence layer (route `/ai`, rendered by `AIAssistant.tsx`)
- System role clarity:
  - AI Chat = intelligence layer (interprets, recommends)
  - Analytics = data layer (stores, aggregates)
  - Fleet = asset layer (manages vehicles)
  - Reservations = transaction layer (books vehicles)
  - Daily Program = execution layer (manages tasks)
- Architecture layers: Data Layer → Processing Layer → AI Layer → Output Layer
- Four-layer pipeline: `Supabase tables → computeFinancialContext() + buildBusinessContext() → Lovable AI Gateway (Gemini) → SSE stream → React UI`
- Source of truth: AI computes NOTHING — all metrics are pre-calculated server-side and injected into the prompt
- Two edge functions: `ai-chat` (main inference pipeline) and `ai-chat-save` (persistence layer)
- Database tables: `ai_chat_conversations`, `ai_chat_messages`, `ai_chat_usage`
- Connections: Analytics (reads `financial_records`), Fleet (reads `vehicles`, `vehicle_maintenance`, `damage_reports`), Reservations (reads `rental_bookings`), Recurring (reads `recurring_transactions`), Profile (reads `profiles`)
- AI Model Selection & Comparison table (Gemini 3 Flash Preview vs GPT-5 vs others — why Gemini chosen: cost ~$0.50/user/month, strong structured data handling, sufficient for pre-computed metric interpretation)

### 2. `/documentation/ai-chat/data-flow.md` (~250 lines)
**Full end-to-end pipeline documentation.**
- **General chat flow**: User types → `useAIChat.sendMessage()` → builds `apiMessages` from conversation history → `fetch(CHAT_URL)` with auth token → edge function authenticates via `getUser()` → input validation (4000 chars, 20 messages max) → daily usage check (20/day limit) → usage increment → 7 parallel data fetches (`financial_records`, `vehicles`, `rental_bookings`, `profiles`, `recurring_transactions`, `vehicle_maintenance`, `damage_reports`) → `buildBusinessContext()` → `buildSystemPrompt()` → Lovable AI Gateway call (streaming) → SSE response piped back to client → client parses SSE line-by-line → assistant message built token-by-token → `setMessages()` update → after stream complete → `fetch(SAVE_URL)` to persist conversation
- **Preset action flow**: Same as above but `presetType` is included → if `financial_analysis` or `pricing_optimizer`: additional `computeFinancialContext()` call with 12-month window filtering → financial context string appended to system prompt → preset-specific prompt instructions appended
- **Conversation save flow**: `ai-chat-save` edge function → if no `conversationId`: create new `ai_chat_conversations` row (title from preset name or first 50 chars) → insert user message → insert assistant message → update conversation `updated_at` → return `conversationId` to client
- **Conversation switch flow**: `switchConversation(id)` → fetch `ai_chat_messages` by `conversation_id` ordered by `created_at` → replace `messages` state
- **CALC_DESIRED follow-up flow**: User sends "CALC_DESIRED: 5000" → treated as normal message → AI detects pattern in prompt instructions → computes `ceil((total_costs + desired_income) / weighted_avg_price)` → returns targeted response

### 3. `/documentation/ai-chat/components.md` (~200 lines)
**Component tree and preset action documentation.**
```text
AIAssistant.tsx (page wrapper)
└── AIAssistantLayout.tsx (layout — owns sidebar + chat area)
    ├── ChatSidebar.tsx (left panel, 256px)
    │   ├── "New Chat" button → createNewChat()
    │   ├── Conversation list (ordered by updated_at desc)
    │   │   ├── Inline rename (pencil icon → input field)
    │   │   └── Delete button (trash icon)
    │   └── Usage meter (used/20 with gradient progress bar)
    ├── ChatArea.tsx (main panel — conditional rendering)
    │   ├── [Empty state] EmptyStateView.tsx
    │   │   ├── AnimatedBackground (blue/white liquid-glass)
    │   │   ├── StaticLogo (blue gradient, no animation)
    │   │   ├── Greeting ("Hey {firstName}, ready to assist you")
    │   │   ├── ChatInput (centered, max-w-2xl)
    │   │   └── PresetActionButtons (2×2 grid)
    │   └── [Active chat] MessageList + ChatInput (bottom)
    │       ├── MessageList.tsx (scrollable, auto-scroll to bottom)
    │       │   ├── MessageBubble.tsx × N (user/assistant styling)
    │       │   └── ThinkingIndicator.tsx (shown while waiting for first token)
    │       └── ChatInput.tsx (textarea with send button)
    └── Mobile: hamburger menu for sidebar toggle
```

**Preset Actions (with exact system prompts):**

1. **Marketing & Growth** (`marketing_growth`): 6-section output (Location insight → Social Media Ads → Organic Content → Pricing Strategies → Local Collaborations → Follow-up Questions). Uses full business context. No pre-computed financial metrics.

2. **Expense Optimization** (`expense_optimization`): 6-step process (Data Sufficiency → Expense Analysis → Optimization Suggestions → Recurring Review → Summary → Follow-up). Requires ≥7 days of data. Category-specific advice (maintenance parts bulk buying, carwash in-house vs outsource).

3. **Financial Analysis** (`financial_analysis`): 7-section strict output (Executive Summary → Key Metrics → Per-Vehicle Table → Top Performers → Recommendations → Monthly Insights → CALC_DESIRED handler). Data sufficiency gate: ≥3 vehicles, ≥10 bookings, ≥2 cost entries. Uses `computeFinancialContext()` pre-computed metrics.

4. **Pricing Optimizer** (`pricing_optimizer`): 7-step pipeline (Data Sufficiency → Edge Cases → Per-Vehicle Profitability → Classification [🔴🟡🟢] → Demand Detection → Seasonality → Pricing Table). Hard pricing rules: never below variable cost, ±50% cap for profitable vehicles, 15-30% margin target. Uses `computeFinancialContext()`.

Each preset's FULL default system prompt is included verbatim in the documentation.

### 4. `/documentation/ai-chat/formulas.md` (~200 lines)
**All pre-computed metrics (NOT computed by AI).**

**Global metrics (from `computeFinancialContext()`):**
- `weightedAvgRentalPrice = totalActiveBookingRevenue / totalActiveBookings`
- `globalVariableCostPerBooking = totalActiveMaintenanceCost / totalActiveBookings`
- `weightedAvgContribution = (totalActiveBookingRevenue - totalActiveMaintenanceCost) / totalActiveBookings`
- `breakEvenBookings = ceil(totalFixedCostsAnnual / weightedAvgContribution)`
- `fixedCostSharePerBooking = totalFixedCostsAnnual / totalActiveBookings`
- `avgFleetUtilization = avg(all vehicle utilizations)`

**Fixed cost annualization:**
- `day → amount * (365 / freq_value)`
- `week → amount * (52 / freq_value)`
- `month → amount * (12 / freq_value)`
- `year → amount * (1 / freq_value)`

**Per-vehicle metrics:**
- `avgRevenuePerBooking = vBookingRevenue / vValidCount`
- `variableCostPerBooking = vMaintenanceCost / vValidCount`
- `contributionPerBooking = avgRevenuePerBooking - variableCostPerBooking`
- `utilization = totalDaysRented / availableDays` (available = max(1, days since purchase or 12 months ago))
- `targetDailyRate = (variableCostPerBooking + fixedCostSharePerBooking + 15% * avgRevenuePerBooking) / avgBookingDuration`
- `demandLevel`: high if utilization > fleet avg × 1.2, medium if > 0.8×, low otherwise, none if 0 bookings

**Status classification:** `insufficient_data` (0 bookings) → `loss` (contribution ≤ 0) → `below_fixed_cost_share` → `underutilized` (util < 15%) → `profitable`

**From `buildBusinessContext()`:**
- Per-vehicle financials (income, expenses, net profit, margin, days rented, avg revenue/booking)
- Pre-computed rankings: by profit, by bookings, by revenue
- Expense category + subcategory breakdown (global and monthly)
- Collaboration partner YTD income
- Monthly vehicle profitability
- Fleet distributions: by vehicle type, category, fuel type, transmission type
- Maintenance + damage summaries per vehicle

**CALC_DESIRED formula:** `required_bookings = ceil((total_costs + desired_income) / weighted_avg_price)`

### 5. `/documentation/ai-chat/state-management.md` (~120 lines)
**State ownership and propagation.**
- `useAIChat()` hook owns ALL chat state: `messages`, `isLoading`, `error`, `usage`, `conversations`, `activeConversation`
- On mount: `fetchConversations()` + `fetchUsage()` (from `ai_chat_usage` table)
- `sendMessage()` flow: add user message optimistically → build apiMessages from current messages → stream response → update assistant message token-by-token → save via `SAVE_URL` → update `activeConversation` if new → increment usage counter
- Error recovery: on 429/402/error → remove optimistic user message from state → set error string → reset loading
- `createNewChat()`: clears messages + activeConversation + error (no DB call)
- `switchConversation()`: fetches messages from `ai_chat_messages` → replaces entire messages array
- `deleteConversation()`: DB delete → remove from conversations array → if active, trigger createNewChat
- `renameConversation()`: DB update → update conversations array in-place
- SSE streaming state: `buffer` string accumulates chunks → parsed line-by-line → `assistantContent` string grows → `setMessages` called on each delta token
- No Supabase Realtime — all state is local + manual fetch

### 6. `/documentation/ai-chat/edge-cases.md` (~120 lines)
**Error handling and safeguards.**
- **Insufficient data**: Financial presets check ≥3 vehicles, ≥10 bookings, ≥2 cost entries → returns localized refusal message, no partial analysis
- **Daily limit**: 20 messages/day per user → 429 with "Daily limit reached" → UI shows limit error + updates usage meter
- **Provider rate limit**: 429 from AI gateway (different from daily limit) → "AI is busy" message → removes failed user message
- **Payment required**: 402 → "Service temporarily unavailable" → removes failed user message
- **Message too long**: >4000 chars → 400 error server-side
- **Conversation history overflow**: trimmed to last 20 messages before sending to AI
- **AI hallucination prevention**: 14 behavioral rules in system prompt (Missing Data Rule, No Inference Rule, Category Distinction, etc.)
- **Data anomaly filtering**: bookings >90 days or amount ≤0 excluded from `computeFinancialContext()` with logged anomaly warnings
- **Sold vehicle handling**: time-aware filtering — pre-sale bookings included, post-sale excluded, vehicle excluded from per-vehicle table
- **Zero-division protection**: all denominators checked before division in `computeFinancialContext()`
- **SSE parse failure**: incomplete JSON put back into buffer and retried on next chunk
- **Auth failure**: 401 returned, no data exposed
- **Sanitized errors**: internal errors never exposed to client — generic "An error occurred" message returned

### 7. `/documentation/ai-chat/ai-integration.md` (~250 lines)
**THE core document — full AI system architecture.**

**1. `computeFinancialContext()` — step by step:**
- Calculates 12-month window cutoff
- Separates active vs sold vehicles
- Filters bookings/maintenance by cutoff + sold vehicle sale dates
- Validates booking integrity (excludes >90 day duration, ≤0 amount)
- Computes global metrics (weighted avg, contribution, break-even)
- Computes per-vehicle breakdown (17 metrics each)
- Classifies demand level relative to fleet average
- Generates monthly booking breakdown
- Outputs formatted text string with unit definitions and sanity warnings

**2. `buildBusinessContext()` — data aggregation:**
- 7 parallel fetches from Supabase (all RLS-scoped)
- Per-vehicle financial breakdown from `financial_records`
- Pre-computed rankings (by profit, bookings, revenue)
- Expense category + subcategory breakdown (global + monthly)
- Income source breakdown + collaboration partner YTD
- Monthly vehicle profitability with most-profitable-per-month
- Fleet distributions (by type, category, fuel, transmission)
- Maintenance + damage summaries
- Data availability status flags

**3. Context Design — why pre-computed:**
- AI models are unreliable at arithmetic → all numbers pre-calculated
- Prompt instructs AI to use values "EXACTLY as given"
- Sanity warnings flag inconsistencies for AI to acknowledge
- Unit definitions prevent metric confusion (daily rate vs per-booking)

**4. Prompt Design Strategy:**
- Language instruction placed FIRST (ensures correct output language)
- Semantic dictionary maps user synonyms to data fields ("profit" → totalIncome - totalExpenses)
- Category definitions prevent merging (maintenance ≠ vehicle_parts)
- 14 behavioral rules enforce strict data-only responses
- Data availability section with ✅/❌/⚠️ flags for each data type
- Preset prompts appended after base prompt (additive, not replacement)

**5. AI Safety Layer:**
- AI cannot override computed values (prompt: "use EXACTLY as given")
- AI cannot create new numbers (No Inference Rule)
- AI must follow structured output (strict section order enforced)
- Missing data → single limitation sentence → STOP (no workarounds)
- ±50% price cap for profitable vehicles (Pricing Optimizer)
- Price floor at variable cost (never suggest below cost)

**6. Slim prompt optimization:**
- For financial presets: `buildFinancialSystemPrompt()` excludes non-essential context (damage reports, partner lists) → reduces ~15k to ~4k tokens
- Prevents token overflow and truncation errors

### 8. `/documentation/ai-chat/performance.md` (~120 lines)
**Scaling, latency, and optimization.**
- **Data fetch**: 7 parallel Supabase queries on every message (no caching) — ~200-500ms
- **Context computation**: O(vehicles × bookings) for per-vehicle breakdown — fine for <100 vehicles, <1000 bookings
- **Prompt size**: Base prompt ~8-12K tokens; with financial context ~15K tokens; slim financial prompt ~4K tokens
- **Token optimization**: `buildFinancialSystemPrompt()` strips non-essential sections for financial presets
- **Streaming latency**: first token ~1-3s (model dependent), then continuous stream
- **SSE parsing**: line-by-line with buffer — O(1) per chunk, no buffering of entire response
- **Usage tracking**: single upsert per message (not batched)
- **Conversation persistence**: async save after stream complete — doesn't block UI
- **Daily limit check**: single DB read per message — efficient but not cached
- **Model selection rationale**: Gemini 3 Flash Preview chosen for cost-effectiveness (~$0.50/user/month) and strong structured data handling. Current inaccuracies stem from data contract design, not model limitations. Switching to GPT-5 not recommended without first improving prompt/data architecture.
- **Future optimizations**: cache business context per session (invalidate on data change), paginate conversation history, add response caching for identical preset queries, consider edge-side aggregation views

**AI Model Comparison Table:**

| Model | Strengths | Weaknesses | Cost | Latency | Best Use Case |
|-------|-----------|------------|------|---------|---------------|
| Gemini 3 Flash Preview | Fast, good structured data, cost-effective | Less nuanced on complex reasoning | ~$0.50/user/mo | Low (~1-2s first token) | Default — fleet analytics, preset actions |
| Gemini 2.5 Pro | Superior reasoning, large context | Higher cost, slower | ~$2-3/user/mo | Medium (~2-4s) | Complex multi-step analysis |
| GPT-5 | Excellent reasoning, multimodal | Expensive, higher latency | ~$3-5/user/mo | High (~3-5s) | When accuracy is critical |
| GPT-5-mini | Good balance of cost/performance | Less precise than full GPT-5 | ~$1-2/user/mo | Medium | Budget alternative to GPT-5 |

Why Gemini currently: inaccuracies are data-contract issues, not model issues. Improving `computeFinancialContext()` and behavioral rules yields better ROI than model upgrades.

## Files Modified
1-8: All new files in `/documentation/ai-chat/`

