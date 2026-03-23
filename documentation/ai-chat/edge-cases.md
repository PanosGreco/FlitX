# AI Chat — Edge Cases

## Data Insufficiency

### Financial Preset Data Gate
Financial presets (`financial_analysis`, `pricing_optimizer`) check minimum thresholds:
- ≥ 3 active vehicles
- ≥ 10 total bookings (active fleet)
- ≥ 2 cost entries (maintenance records + active fixed recurring transactions)

**If ANY threshold fails**: AI receives `Data Sufficiency: ❌ INSUFFICIENT` in context → prompt instructs AI to return refusal message and STOP. No partial analysis performed.

### Expense Optimization Data Gate
Requires ≥ 7 days of expense data. If insufficient: AI explains why patterns need time, but still provides general best-practice tips.

### Marketing & Growth
No hard data gate — provides location-based suggestions even with limited data. Explicitly acknowledges when historical data is insufficient for deep analysis.

## Rate Limiting

### Daily Message Limit (20/day)
- Server checks `ai_chat_usage` table for current date
- If `message_count >= 20` → returns 429 with `{ error: "Daily limit reached", used, limit }`
- Client shows error message: "You have reached your daily message limit. Try again tomorrow!"
- Usage meter in sidebar updates to show full
- User's optimistic message is removed from state

### AI Provider Rate Limit
- Lovable AI Gateway returns 429 for its own rate limits
- Distinguished from daily limit by error message content
- Client shows: "The AI is currently busy. Please wait a few seconds and try again."
- User can retry — this is temporary

### Payment Required (402)
- Gateway returns 402 if account billing issue
- Client shows: "Service temporarily unavailable."
- User message removed from state

## Input Validation

### Message Length
- Server enforces 4,000 character maximum
- Messages exceeding this → 400 error
- No client-side enforcement (server-only validation)

### Conversation History Overflow
- Messages array trimmed to last 20 (`messages.slice(-MAX_MESSAGES_PER_REQUEST)`) before sending to AI
- Prevents token overflow in AI context window
- Earlier messages silently dropped — AI loses context of early conversation

## AI Hallucination Prevention

14 behavioral rules enforced via system prompt:

1. **Data-Only Responses**: ONLY use numbers from provided data. NEVER invent or estimate.
2. **Missing Data Rule**: If data marked ❌ → say ONE limitation sentence → STOP. No "however..." or workarounds.
3. **No Inference Rule**: Never assume recurring rentals, vehicle condition, booking status, document existence, or maintenance needs.
4. **Category Distinction**: `maintenance` ≠ `vehicle_parts`. Never merge.
5. **Aggregation Rules**: Only calculate totals when ALL required fields exist. Use pre-computed rankings.
6. **Currency & Format**: Euro (€), 2 decimal places, cite source data section.
7. **Comparison Questions**: Show exact numbers, use pre-computed rankings.
8. **Monthly Filtering**: Use monthly breakdown sections, not global totals.
9. **Vehicle Type Filtering**: Use Fleet By Vehicle Type section for broad types.
10. **Collaboration & YTD**: Use pre-computed YTD values, don't manually calculate.
11. **Monthly Vehicle Profitability**: Use per-month data, not overall rankings.
12. **Vehicle Category Filtering**: SUV is a category, not a type. Use Fleet By Category.
13. **Fuel Type Filtering**: Use Fleet By Fuel Type section. Data IS available.
14. **Transmission Type Filtering**: Use Fleet By Transmission Type section.

## Data Anomaly Filtering

In `computeFinancialContext()`:
- **Booking duration > 90 days**: Excluded from all calculations, logged as anomaly
- **Booking amount ≤ 0**: Excluded from revenue calculations, logged as anomaly
- Anomalies are listed in the context string under "DATA ANOMALIES" section
- AI is informed of exclusions and can reference them

## Sold Vehicle Handling

Time-aware filtering in `computeFinancialContext()`:
- Active vs sold vehicles separated using `is_sold` flag
- Sold vehicle bookings **before** sale_date: **included** in global revenue totals
- Sold vehicle bookings **after** sale_date: **excluded**
- Sold vehicle maintenance follows same date logic
- Sold vehicles **excluded** from per-vehicle breakdown table
- Sold vehicles listed separately in context: "SOLD VEHICLES (excluded from per-vehicle analysis)"

## Zero-Division Protection

All denominators checked before division:
- `totalActiveBookings > 0` → weighted averages
- `vValidCount > 0` → per-vehicle averages
- `weightedAvgContribution > 0` → break-even bookings
- `totalIncome > 0` → profit margin
- `availableDays` → floored at `Math.max(1, ...)` → utilization never divides by zero

## SSE Parse Failure

- Incomplete JSON chunks are put back into the buffer and retried on next read
- `try/catch` around `JSON.parse` — failures don't crash the stream
- Buffer accumulates until a complete JSON line is available

## Authentication Failure

- `getUser()` returns null or error → 401 Unauthorized
- No data fetched, no context assembled, no AI call made
- Client-side: error thrown, user message removed

## Sanitized Errors

- Internal errors (gateway failures, DB errors) logged server-side
- Client receives only: `"An error occurred. Please try again."`
- Stack traces, table names, and internal details never exposed

## Empty Fleet

- `buildBusinessContext()` returns empty arrays for all fleet data
- Vehicle rankings section shows "No vehicles registered yet"
- Financial presets fail data sufficiency gate → clean refusal
- General chat still works with whatever non-fleet data exists

## Conversation Edge Cases

- **Delete active conversation**: triggers `createNewChat()` (clears messages, resets to empty state)
- **Rename to empty string**: technically allowed (no validation), but empty title persists
- **Save failure after stream**: conversation not persisted, but messages visible in current session. Lost on page refresh.
- **Switch during loading**: no guard — can cause race condition between streaming response and new conversation's messages
