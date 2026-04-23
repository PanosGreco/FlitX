# AI Chat — Performance

## Data Fetch Overhead

Every message triggers 9 parallel Supabase queries (no caching):

| Query | Table | Filter | Est. Time |
|-------|-------|--------|-----------|
| Financial records | `financial_records` | `user_id` | ~50-100ms |
| Vehicles | `vehicles` | `user_id` | ~30-50ms |
| Bookings | `rental_bookings` | `user_id` (selected columns) | ~50-100ms |
| Profile | `profiles` | `user_id` (single) | ~20-30ms |
| Recurring | `recurring_transactions` | `user_id` | ~20-30ms |
| Maintenance | `vehicle_maintenance` | `user_id` (selected columns) | ~30-50ms |
| Damage | `damage_reports` | `user_id` (selected columns) | ~20-30ms |
| Customers | `customers` | `user_id` (selected columns) | ~20-50ms |
| Accidents | `accidents` | `user_id` (selected columns) | ~20-50ms |

**Total**: ~200-500ms (parallel execution, dominated by largest query).

All queries are RLS-scoped — only user's own data returned.

## Context Computation Complexity

### `buildBusinessContext()`
- Per-vehicle financials: O(vehicles × financial_records)
- Rankings: O(vehicles × log(vehicles)) for 3 sorts
- Expense breakdown: O(financial_records)
- Monthly aggregation: O(financial_records)
- Fleet distributions: O(vehicles + maintenance_records)
- **Total**: O(vehicles × records) — fine for <100 vehicles, <1000 records

### `computeFinancialContext()` (financial presets only)
- Booking filtering + validation: O(bookings)
- Per-vehicle breakdown: O(vehicles × bookings)
- Demand classification: O(vehicles)
- **Total**: O(vehicles × bookings) — fine for typical fleet sizes

## Prompt Size

| Prompt Type | Estimated Tokens | When Used |
|------------|-----------------|-----------|
| Full base prompt (no preset) | ~8-12K | General chat |
| Full base + marketing/expense preset | ~10-15K | Marketing & Growth, Expense Optimization |
| Slim financial prompt | ~4K | Financial Analysis, Pricing Optimizer |
| CRM context block | ~2-3K | Included in all conversations |

### Token Optimization
`buildFinancialSystemPrompt()` strips non-essential sections for financial presets:
- Removes: fleet distributions, collaboration partners, damage reports, expense subcategories
- Keeps: pre-computed financial context, critical rules, preset instructions
- **Savings**: ~10K tokens per financial preset message

## Streaming Latency

| Phase | Estimated Time |
|-------|---------------|
| Data fetch (9 parallel queries) | 200-500ms |
| Context computation | 50-100ms |
| AI Gateway overhead | 500-1000ms |
| First token (model thinking) | 1-3s |
| Full response streaming | 5-30s (depends on length) |
| **Total time to first token** | **~2-5s** |

## SSE Parsing Efficiency

- Line-by-line parsing with string buffer — O(1) per chunk
- No buffering of entire response — each delta immediately rendered
- Incomplete JSON gracefully handled (put back in buffer)
- `setMessages()` called on each delta token — triggers React re-render per token

## Usage Tracking

- Single `upsert` per message to `ai_chat_usage` (not batched)
- Uses `onConflict: "user_id,date"` for atomic increment
- Daily limit check: single `SELECT` before processing — efficient but not cached

## Conversation Persistence

- Save is **async** after stream completes — does not block UI
- If save fails, messages visible in current session but lost on refresh
- No retry mechanism for failed saves
- Conversation list refresh after save (`fetchConversations()`)

## Client-Side Performance

- `messages` state updates on every SSE delta → React re-renders per token
- `react-markdown` rendering on each update for assistant messages
- Auto-scroll to bottom on each update
- No virtualization on message list — could be slow with very long conversations

## AI Model Comparison Table

| Model | Strengths | Weaknesses | Est. Cost/User/Mo | First Token Latency | Best Use Case |
|-------|-----------|------------|-------|---------|---------------|
| **Gemini 3 Flash Preview** ✓ | Fast, good structured data, cost-effective | Less nuanced complex reasoning | ~$0.50 | ~1-2s | Default — fleet analytics, presets |
| Gemini 2.5 Pro | Superior reasoning, large context | Higher cost, slower | ~$2-3 | ~2-4s | Complex multi-step analysis |
| GPT-5 | Excellent reasoning, multimodal | Expensive, higher latency | ~$3-5 | ~3-5s | Maximum accuracy critical |
| GPT-5-mini | Good cost/performance balance | Less precise than full GPT-5 | ~$1-2 | ~2-3s | Budget alternative to GPT-5 |

**Current choice rationale**: Gemini 3 Flash Preview. Current inaccuracies are data-contract issues (prompt structure, metric definitions), not model limitations. Improving `computeFinancialContext()` and behavioral rules yields better ROI than upgrading to a more expensive model.

## Future Optimizations

1. **Cache business context per session**: invalidate on data change, avoid 7 queries per message
2. **Paginate conversation history**: only load last N messages initially, fetch more on scroll
3. **Response caching**: cache identical preset queries (same data hash → same response)
4. **Edge-side aggregation views**: Postgres views or functions for pre-aggregated fleet metrics
5. **Message list virtualization**: use `react-window` for conversations with 100+ messages
6. **Batch usage tracking**: update usage counter less frequently (e.g., on conversation save)
7. **Debounce state updates**: batch SSE delta updates (e.g., every 50ms instead of per-token)
8. **Streaming UI optimization**: only re-render the active assistant message bubble, not entire list
