# AI Chat — Components

## Component Tree

```
AIAssistant.tsx (page wrapper — AppLayout + height container)
└── AIAssistantLayout.tsx (layout — owns useAIChat hook + sidebar state)
    ├── ChatSidebar.tsx (left panel, w-64)
    │   ├── "New Chat" button → createNewChat()
    │   ├── Conversation list (ordered by updated_at desc)
    │   │   ├── Click → switchConversation(id)
    │   │   ├── Inline rename (pencil icon → input field → Enter/blur saves)
    │   │   └── Delete button (trash icon → deleteConversation(id))
    │   └── Usage meter bar ({used}/20 with gradient progress)
    │
    ├── ChatArea.tsx (main panel — conditional rendering)
    │   ├── [No messages] → EmptyStateView.tsx
    │   │   ├── AnimatedBackground.tsx (blue/white animated blobs, pointer-events-none)
    │   │   ├── StaticLogo.tsx (blue gradient circle, no animation)
    │   │   ├── Greeting: "Hey {firstName}, ready to assist you" (from profile)
    │   │   ├── ChatInput.tsx (centered, max-w-2xl)
    │   │   └── PresetActionButtons.tsx (2×2 grid of preset cards)
    │   │
    │   └── [Has messages] → Active chat view
    │       ├── MessageList.tsx (flex-1, overflow-y-auto, auto-scroll)
    │       │   ├── MessageBubble.tsx × N
    │       │   │   ├── User messages: right-aligned, blue gradient bg
    │       │   │   └── Assistant messages: left-aligned, white bg, react-markdown rendered
    │       │   └── ThinkingIndicator.tsx (3-dot pulse, shown while isLoading && no assistant content yet)
    │       └── ChatInput.tsx (bottom, sticky)
    │
    └── Mobile: hamburger button (fixed top-left) → toggles sidebar
        └── Overlay backdrop when sidebar open on mobile
```

## Component Responsibilities

### AIAssistant.tsx
- **Route handler** page component
- Wraps content in `AppLayout` with fixed height (`h-[calc(100vh-4rem)]`)

### AIAssistantLayout.tsx
- **State owner**: instantiates `useAIChat()` hook
- **Layout manager**: sidebar + chat area with responsive behavior
- **Mobile handling**: `useIsMobile()` controls sidebar visibility + overlay
- Passes all hook returns down as props

### ChatSidebar.tsx
- **Props**: conversations, activeConversation, usage, onNewChat, onSelectConversation, onDeleteConversation, onRenameConversation
- **Rename flow**: click pencil → inline input appears → Enter or blur triggers `onRenameConversation(id, newTitle)`
- **Usage meter**: gradient progress bar showing `{used}/{limit}` with percentage width

### ChatArea.tsx
- **Conditional rendering**: empty state vs active chat based on `messages.length`
- **Error display**: shows error banner if `error` is set
- **Empty state**: renders `EmptyStateView` with logo, greeting, input, presets
- **Active state**: renders `MessageList` + bottom `ChatInput`

### PresetActionButtons.tsx
- **4 preset buttons** in 2×2 grid layout:
  - Marketing & Growth (TrendingUp icon)
  - Expense Optimization (PiggyBank icon)
  - Financial Analysis (BarChart3 icon)
  - Pricing Optimizer (BadgeDollarSign icon)
- Each button fires `onSelect(presetType, translatedTitle)`
- Titles and descriptions are i18n-translated via `useTranslation('ai')`
- Disabled state when `disabled` prop is true

### MessageBubble.tsx
- **User messages**: right-aligned, gradient background
- **Assistant messages**: left-aligned, white background, rendered via `react-markdown` with prose styling
- Timestamp display below each message

### ThinkingIndicator.tsx
- Shows animated dots while waiting for first AI token
- Hidden once assistant message content starts arriving

### ChatInput.tsx
- Textarea with auto-resize
- Send button (disabled when empty or loading)
- Enter to send, Shift+Enter for newline

## Preset Actions — Detailed Documentation

### 1. Marketing & Growth (`marketing_growth`)

**Purpose**: Generate location-based, data-driven marketing strategies for the rental business.

**Data Used**: Full business context (`buildBusinessContext()`) — profile location, booking patterns, financial trends, vehicle fleet composition. Does NOT use `computeFinancialContext()`.

**Output Structure** (6 sections):
1. Location, Seasonality & Business Activity Insight
2. Social Media & Paid Ads
3. Organic Content Ideas
4. Pricing & Promotion Strategies
5. Local Collaborations
6. Follow-up Questions (2-3 conversation continuers)

**System Prompt** (appended to base prompt):

```
[PRESET: MARKETING & GROWTH SUGGESTIONS]

You are an AI business assistant specialized in car rental and fleet-based businesses.

Context & Data: Read the user's location (country and city) from their profile. Read and analyze
the user's internal business data, including: Calendar activity (bookings, busy vs low-demand
periods), Financial insights (income, expenses, utilization trends), Available graphs and analytics.

Task: Generate actionable marketing suggestions tailored to the user's location and actual
business performance.

Output Structure: 1. Location insight 2. Social Media Ads 3. Organic Content 4. Pricing Strategies
5. Local Collaborations 6. Follow-up Questions

Style: Bullet points, short paragraphs, actionable, professional tone.
Restrictions: No external websites, no budget assumptions, no guaranteed results.
```

*(Full prompt: ~150 lines in edge function, see `presetPrompts.marketing_growth`)*

### 2. Expense Optimization (`expense_optimization`)

**Purpose**: Analyze expenses by category/subcategory and suggest practical cost reduction strategies.

**Data Used**: Full business context — expense categories, subcategories, recurring transactions. Does NOT use `computeFinancialContext()`.

**Output Structure** (6 steps):
1. Data Sufficiency Check (≥7 days of expense data required)
2. Expense Analysis (top categories by cost, percentages)
3. Optimization Suggestions (per high-cost category)
4. Recurring Expense Review
5. Summary Table
6. Follow-up Questions

**Key Logic**:
- Always distinguishes `maintenance` from `vehicle_parts` (separate categories)
- Suggests bulk parts purchasing + supplying parts to mechanics
- Car wash: compares outsourcing vs in-house staff costs
- Recurring: flags high-frequency low-value transactions

**System Prompt**: ~170 lines covering step-by-step analysis process with category-specific optimization strategies.

### 3. Financial Analysis (`financial_analysis`)

**Purpose**: Comprehensive fleet economics analysis with break-even calculation and per-vehicle profitability.

**Data Used**: `computeFinancialContext()` pre-computed metrics (slim prompt via `buildFinancialSystemPrompt()`).

**Data Sufficiency Gate**: ≥3 vehicles, ≥10 bookings, ≥2 cost entries. If not met → refusal message, no partial analysis.

**Output Structure** (7 sections):
1. Executive Summary (max 3 lines, confidence level)
2. Key Metrics (weighted avg revenue, contribution, break-even, utilization)
3. Per-Vehicle Analysis (table: revenue/booking, contribution, utilization, demand, status)
4. Top Performers (🏆 most profitable, ⚠️ underperforming)
5. Recommendations (revenue increase + cost reduction)
6. Monthly Insights (strongest/weakest month)
7. Next Step → CALC_DESIRED handler

**CALC_DESIRED Handler**: User sends `CALC_DESIRED: 5000` → AI calculates `ceil((total_costs + 5000) / weighted_avg_contribution)` → returns required bookings.

**System Prompt** (slim version via `getFinancialAnalysisInstructions()`):

```
STEP 0: DATA SUFFICIENCY GATE
If Data Sufficiency shows ❌ INSUFFICIENT → respond ONLY with insufficiency message and STOP.
Thresholds: ≥3 active vehicles, ≥10 bookings, ≥2 cost entries.

STRICT RULES:
- Status MUST match profitability data — use pre-computed Status field exactly
- NEVER compare Daily Rate with per-booking metrics directly
- Sold vehicles EXCLUDED from per-vehicle table
- Demand Level is pre-computed — use as-is

OUTPUT: Executive Summary → Key Metrics → Per-Vehicle Table → Top Performers →
Recommendations → Monthly Insights → CALC_DESIRED handler
```

### 4. Pricing Optimizer (`pricing_optimizer`)

**Purpose**: Per-vehicle pricing recommendations with demand-based adjustments and hard pricing rules.

**Data Used**: `computeFinancialContext()` pre-computed metrics (slim prompt via `buildFinancialSystemPrompt()`).

**Data Sufficiency Gate**: Same as Financial Analysis (≥3 vehicles, ≥10 bookings, ≥2 cost entries).

**Output Structure** (6 sections):
1. Summary (max 3 lines, confidence level)
2. Per-Vehicle Pricing Table (Current Rate | Daily Cost Floor | Target Rate | Suggested Rate | Change % | Status | Demand | Action | Reason)
3. Top Highlights (🏆 best, ⚠️ critical)
4. Global Pricing Strategy
5. Monthly Pricing Recommendations
6. Next Step → CALC_DESIRED handler

**Vehicle Classification** (from pre-computed status):
- 🔴 Loss → contribution ≤ 0
- 🟠 Below Fixed Cost Share → covers variable but not fixed
- 🟡 Underutilized → profitable per booking but utilization < 15%
- 🟢 Profitable → covers all costs with margin
- ⚠️ Insufficient Data → 0 bookings

**Hard Pricing Rules**:
1. Suggested price ≥ variable cost per booking (absolute floor)
2. Loss vehicles: increase to at least Target Daily Rate
3. Below fixed cost share: increase 10-25% toward Target
4. Underutilized: moderate decrease (5-10%) to boost volume, never below cost floor
5. Profitable: max change ±50% (HARD CAP)
6. Insufficient data: hold current price

**System Prompt** (slim version via `getPricingOptimizerInstructions()`):

```
UNIT AWARENESS (CRITICAL):
- "Current Price" = Daily Rate (PER DAY)
- "Variable Cost/Booking" = cost PER BOOKING (multi-day)
- Daily Cost Floor = variable_cost_per_booking / avg_booking_duration
- "Target Daily Rate" = pre-computed price covering var + fixed + 15% margin

VEHICLE CLASSIFICATION: Use pre-computed Status — do NOT override.
DEMAND LEVEL: Pre-computed from utilization — use as-is.

HARD PRICING RULES: [5 mandatory constraints]

OUTPUT: Summary → Per-Vehicle Pricing Table → Highlights → Strategy → Monthly → CALC_DESIRED
```
