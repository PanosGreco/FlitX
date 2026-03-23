# AI Chat — Data Flow

## Full Pipeline Overview

```
User types message / clicks preset
        ↓
useAIChat.sendMessage(content, presetType?)
        ↓
Optimistic: add user message to local state
        ↓
Build apiMessages from conversation history (last 20)
        ↓
fetch(CHAT_URL) with Bearer token
        ↓
Edge Function: ai-chat
├── Authenticate user via getUser()
├── Validate input (4000 chars max)
├── Check daily usage (20/day limit)
├── Increment usage counter
├── 7 parallel Supabase fetches:
│   ├── financial_records
│   ├── vehicles
│   ├── rental_bookings (selected columns only)
│   ├── profiles (single)
│   ├── recurring_transactions
│   ├── vehicle_maintenance (excludes sensitive fields)
│   └── damage_reports (excludes images)
├── buildBusinessContext(all data)
├── IF financial preset → computeFinancialContext(vehicles, bookings, maintenance, recurring)
├── buildSystemPrompt(context, presetType, language, financialContext?)
│   └── IF financial preset → buildFinancialSystemPrompt() [slim version]
├── Call Lovable AI Gateway (streaming):
│   POST https://ai.gateway.lovable.dev/v1/chat/completions
│   model: google/gemini-3-flash-preview
│   messages: [system prompt, ...trimmed user messages]
│   stream: true
└── Pipe SSE response body back to client
        ↓
Client parses SSE stream line-by-line
        ↓
Each "data: {...}" line → JSON.parse → extract delta.content
        ↓
assistantContent string grows token-by-token
        ↓
setMessages() updates assistant message on each delta
        ↓
Stream ends ([DONE] or reader.done)
        ↓
Async: fetch(SAVE_URL) to persist conversation
        ↓
Usage counter incremented locally
```

## General Chat Flow (No Preset)

1. User types a message in `ChatInput`
2. `sendMessage(content)` called — no `presetType`
3. User message added optimistically to `messages` state
4. `apiMessages` built from full conversation history (capped at 20)
5. Edge function builds full `buildSystemPrompt()` (includes all context sections: vehicle rankings, expense breakdowns, fleet distributions, maintenance, damage, data availability flags, 14 behavioral rules)
6. `computeFinancialContext()` is NOT called (only for financial presets)
7. Response streamed back via SSE

## Preset Action Flow

1. User clicks preset button (e.g., "Financial Analysis")
2. `PresetActionButtons.onSelect(presetType, displayMessage)` fired
3. `ChatArea` calls `onSendMessage(displayMessage, presetType)`
4. `sendMessage(displayMessage, presetType)` called with preset type
5. Edge function detects `presetType`:
   - **`financial_analysis`** or **`pricing_optimizer`**: calls `computeFinancialContext()` → uses `buildFinancialSystemPrompt()` (slim prompt with pre-computed metrics)
   - **`marketing_growth`** or **`expense_optimization`**: uses full `buildSystemPrompt()` with preset-specific instructions appended
6. Preset-specific prompt appended to system prompt (additive, not replacement)
7. Response streamed identically

## Financial Preset Pipeline (Detailed)

```
presetType = 'financial_analysis' | 'pricing_optimizer'
        ↓
computeFinancialContext(vehicles, bookings, maintenance, recurring)
├── Calculate 12-month window cutoff
├── Separate active vs sold vehicles
├── Filter bookings: exclude pre-cutoff + post-sale bookings
├── Filter maintenance: same logic
├── Validate booking integrity:
│   ├── Duration > 90 days → EXCLUDE (anomaly logged)
│   └── Amount ≤ 0 → EXCLUDE (anomaly logged)
├── Compute global metrics (active fleet only):
│   ├── weightedAvgRentalPrice
│   ├── globalVariableCostPerBooking
│   ├── weightedAvgContribution
│   ├── breakEvenBookings
│   └── fixedCostSharePerBooking
├── Per-vehicle breakdown (17 metrics each):
│   ├── bookingCount, bookingRevenue, maintenanceCost
│   ├── avgRevenuePerBooking, variableCostPerBooking
│   ├── contributionPerBooking, netProfitPerBooking
│   ├── utilization, availableDays, totalDaysRented
│   ├── avgBookingDuration, targetDailyRate
│   └── status classification (5 levels)
├── Demand level classification (relative to fleet avg)
├── Monthly booking breakdown
├── Sanity warnings + anomaly report
└── Returns formatted text string
        ↓
buildFinancialSystemPrompt(context, presetType, languageInstruction, financialContext)
├── Language instruction (FIRST)
├── Business overview (company, location, fleet size)
├── Pre-computed financial context string (verbatim)
├── Critical rules (4 rules)
└── Preset-specific instructions:
    ├── financial_analysis → getFinancialAnalysisInstructions()
    └── pricing_optimizer → getPricingOptimizerInstructions()
```

## Conversation Save Flow

```
After stream completes (client-side):
        ↓
fetch(SAVE_URL) with:
├── conversationId (null if new)
├── userMessage (content string)
├── assistantMessage (full accumulated content)
└── title (from presetType mapping or first 50 chars)
        ↓
ai-chat-save edge function:
├── Authenticate user
├── IF no conversationId:
│   └── INSERT ai_chat_conversations (title, user_id)
├── INSERT ai_chat_messages (role=user, content, conversation_id)
├── INSERT ai_chat_messages (role=assistant, content, conversation_id)
├── UPDATE ai_chat_conversations.updated_at
└── Return { conversationId }
        ↓
Client receives conversationId:
├── IF new conversation: setActiveConversation(id)
└── fetchConversations() to refresh sidebar
```

## Conversation Title Mapping

| Preset Type | Auto-Generated Title |
|------------|---------------------|
| `marketing_growth` | "Marketing & Growth Suggestions" |
| `expense_optimization` | "Expense Optimization" |
| `financial_analysis` | "Financial Analysis" |
| `pricing_optimizer` | "Pricing Optimizer" |
| *(none — manual chat)* | First 50 chars of user message + "..." |

## Conversation Switch Flow

```
User clicks conversation in sidebar
        ↓
switchConversation(id)
├── setActiveConversation(id)
├── setError(null)
├── Fetch ai_chat_messages WHERE conversation_id = id
│   ORDER BY created_at ASC
└── Replace entire messages array
```

## CALC_DESIRED Follow-Up Flow

1. User sends `CALC_DESIRED: 5000`
2. Treated as normal message — no special client-side handling
3. AI detects pattern via prompt instructions
4. AI uses pre-computed values to calculate:
   - `required_bookings = ceil((total_costs + desired_income) / weighted_avg_contribution)`
5. Returns structured response with required bookings and insight

## Error Flow

```
Response not OK:
├── 429 + "Daily limit reached" → show limit error, update usage meter, remove user message
├── 429 (other) → "AI is busy" message, remove user message
├── 402 → "Service temporarily unavailable", remove user message
├── Other → throw Error → catch block → generic error message, remove user message
```
