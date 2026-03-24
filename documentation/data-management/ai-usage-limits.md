# Data Management — AI Usage Limits

## Overview

AI Chat usage is controlled through daily message limits, input size restrictions, token optimization, and cost-aware model selection. These controls prevent excessive API costs while maintaining useful AI capabilities.

## Daily Message Limit

### Limit: 20 Messages Per Day Per User

**Tracking mechanism**:
- Table: `ai_chat_usage`
- Key: composite of `user_id` + `date` (date defaults to `CURRENT_DATE`)
- Column: `message_count` (integer, starts at 0)

**Enforcement**:
1. Before processing each message, the `ai-chat` edge function queries `ai_chat_usage` for the current user + today's date
2. If `message_count >= 20` → return error response: "Daily limit reached"
3. After successful processing → UPSERT: increment `message_count` by 1
4. Uses `ON CONFLICT (user_id, date)` to handle first-message-of-day creation

**Reset**: automatic at midnight (new date = new row with count 0)

**RLS**: users can only view and modify their own usage records

## Input Size Limits

### Message Length: 4000 Characters

- Enforced server-side in the `ai-chat` edge function
- Client-side textarea has no explicit maxLength — server is the authority
- Messages exceeding 4000 characters are rejected before AI processing

### Conversation History: Last 20 Messages

- When building the API request, only the most recent 20 messages from the conversation are included
- Older messages are not sent to the AI model
- This prevents token overflow on long conversations
- Full conversation history remains in the database for user viewing

## Token Optimization

### Standard Prompt Size

A full context prompt includes:
- System prompt with behavioral rules (~1,500 tokens)
- Business context from `buildBusinessContext()` (~8,000–12,000 tokens):
  - Vehicle fleet details (make, model, year, rate, type for each vehicle)
  - Financial summary (12-month income/expense by category)
  - Booking metrics (count, avg revenue, avg duration, utilization)
  - Maintenance costs (per vehicle)
  - Recurring transactions (active items)
  - Damage report summary
- Conversation history (variable, up to 20 messages)

**Total standard prompt**: ~12,000–18,000 tokens

### Slim Prompt for Financial Presets

`buildFinancialSystemPrompt()` creates a reduced context for financial preset actions:

**Excluded from slim prompt**:
- Full vehicle attribute lists
- Damage report details
- Recurring transaction itemization
- Non-essential behavioral instructions

**Included in slim prompt**:
- Pre-computed financial metrics (totals, averages, breakdowns)
- Booking summary statistics
- Focused behavioral rules for financial analysis

**Slim prompt size**: ~3,000–5,000 tokens (60–70% reduction)

### Pre-Computed vs AI-Computed

**Critical design decision**: the AI does NOT compute financial numbers.

All metrics are calculated server-side in `computeFinancialContext()`:
- Total revenue, total expenses, net profit
- Per-vehicle revenue and costs
- Average booking duration and revenue
- Fleet utilization percentage
- Category-wise breakdowns

The AI's role is to **interpret and recommend**, not calculate. This:
- Reduces token usage (no raw data needed, only summaries)
- Prevents AI calculation errors
- Makes results deterministic and auditable
- Allows model switching without accuracy impact

## Cost Control Strategy

### Model Selection

| Model | Cost Estimate | When Used |
|---|---|---|
| Gemini 3 Flash Preview | ~$0.50/user/month | **Default** — all chat and presets |
| Gemini 2.5 Pro | ~$2–3/user/month | Not used (available for future upgrade) |
| GPT-5 | ~$3–5/user/month | Not used (available for future upgrade) |

**Why Gemini 3 Flash Preview**:
- Sufficient for interpreting pre-computed metrics
- Low latency (~1–2s first token)
- Cost-effective for SaaS with many users
- Current inaccuracies stem from data contract design (prompt structure), not model limitations — switching to a more expensive model would not improve results without first fixing the data contract

### Insufficient Data Gates

Financial preset actions check minimum data thresholds before making API calls:

| Preset | Minimum Requirements |
|---|---|
| Financial Analysis | ≥ 3 vehicles, ≥ 10 bookings, ≥ 2 expense entries |
| Pricing Optimizer | ≥ 3 vehicles, ≥ 10 bookings, ≥ 2 expense entries |

If thresholds are not met:
- A client-side message is shown explaining insufficient data
- **No API call is made** — zero token cost
- User is guided on what data to add first

### Rate Limiting

Provider-side rate limiting (HTTP 429) is handled separately from daily quota:
- 429 responses → user sees "AI is busy, please try again"
- This is distinct from "Daily limit reached" (quota exhaustion)
- No client-side retry loop — user manually retries

## Cost Monitoring

### Current State

- `ai_chat_usage` tracks daily message counts per user
- No token-level tracking (cost is estimated, not measured)
- No per-request cost logging

### Future Enhancements

Planned (see [admin-monitoring.md](./admin-monitoring.md)):
- Token count tracking per request (input + output)
- Per-user daily/monthly cost calculation
- Admin dashboard showing cost trends
- Alert thresholds for high-usage users

## Context Freshness

- Business context is fetched **fresh on every message** — no caching
- This ensures the AI always has current data
- Trade-off: 7 database queries per message (all RLS-scoped, fast)
- Future optimization: cache context per session, invalidate on data changes
