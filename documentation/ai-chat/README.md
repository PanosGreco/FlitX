# AI Chat — System Documentation

## Overview

The AI Chat is the **intelligence layer** of the FlitX system. It provides financial analysis, pricing optimization, marketing strategy, and expense reduction recommendations by interpreting pre-computed business data through a large language model.

- **Route**: `/ai` (rendered by `AIAssistant.tsx`)
- **Edge Functions**: `ai-chat` (inference pipeline), `ai-chat-save` (persistence)
- **Database Tables**: `ai_chat_conversations`, `ai_chat_messages`, `ai_chat_usage`
- **Model**: `google/gemini-3-flash-preview` via Lovable AI Gateway

## System Role Clarity

| Layer | Section | Role |
|-------|---------|------|
| **Intelligence** | AI Chat | Interprets data, recommends actions |
| **Data** | Analytics | Stores and aggregates financial records |
| **Asset** | Fleet | Manages vehicle lifecycle |
| **Transaction** | Reservations | Books vehicles, generates financial records |
| **Execution** | Daily Program | Converts bookings to actionable tasks |

The AI Chat sits on top of all other layers — it reads from them but never writes to them.

## Architecture: Four-Layer Pipeline

```
Data Layer              → Processing Layer              → AI Layer                    → Output Layer
─────────────────────    ─────────────────────────────    ──────────────────────────    ─────────────
Supabase Tables:         buildBusinessContext()           Lovable AI Gateway            SSE Stream →
• financial_records      computeFinancialContext()        google/gemini-3-flash-preview React UI →
• vehicles               computeCRMContext()              Streaming response            Token-by-token
• rental_bookings        buildSystemPrompt()                                            message render
• vehicle_maintenance    buildFinancialSystemPrompt()
• damage_reports
• recurring_transactions
• profiles
• customers
• accidents
```

## Core Design Principle

**AI computes NOTHING.** All financial metrics are pre-calculated server-side in `computeFinancialContext()` and `buildBusinessContext()`. The AI model receives these as formatted text and is instructed to use values "EXACTLY as given." This prevents arithmetic errors and hallucinated numbers.

## Data Connections

| Source Section | Table Read | Data Used |
|---------------|------------|-----------|
| Analytics | `financial_records` | Income, expenses, categories, subcategories, monthly breakdown |
| Fleet | `vehicles` | Make, model, year, type, daily_rate, is_sold, sale_date, purchase_date |
| Fleet | `vehicle_maintenance` | Cost, type, date, next_date (excludes images for privacy) |
| Fleet | `damage_reports` | Severity, location, repair_cost, description (excludes images) |
| Reservations | `rental_bookings` | start_date, end_date, total_amount, status, customer_name, times, locations |
| Finance | `recurring_transactions` | Fixed costs, frequency, amount, category |
| Profile | `profiles` | Name, company_name, city, country |
| CRM | `customers` | Demographics, locations, birth dates, lifetime value, accident totals |
| CRM | `accidents` | Accident dates, descriptions, damage costs, payer breakdown, vehicle/customer links |

## Preset Actions

Five preset actions provide structured, domain-specific analysis:

1. **Marketing & Growth** (`marketing_growth`) — Location-based marketing strategies
2. **Expense Optimization** (`expense_optimization`) — Cost reduction recommendations
3. **Financial Analysis** (`financial_analysis`) — Fleet economics with break-even analysis
4. **Pricing Optimizer** (`pricing_optimizer`) — Per-vehicle pricing recommendations
5. **Customer & Risk Insights** (`customer_risk_insights`) — Customer demographics, accident risk analysis, insurance effectiveness

Financial presets (`financial_analysis`, `pricing_optimizer`) use a slim prompt via `buildFinancialSystemPrompt()` with pre-computed metrics from `computeFinancialContext()`. Non-financial presets use the full `buildSystemPrompt()`.

## AI Model Selection & Comparison

| Model | Strengths | Weaknesses | Est. Cost/User/Mo | Latency (First Token) | Best Use Case |
|-------|-----------|------------|-------|---------|---------------|
| **Gemini 3 Flash Preview** ✓ | Fast, strong structured data handling, cost-effective | Less nuanced on complex multi-step reasoning | ~$0.50 | ~1-2s | Default — fleet analytics, preset actions |
| Gemini 2.5 Pro | Superior reasoning, large context window | Higher cost, slower | ~$2-3 | ~2-4s | Complex multi-step financial analysis |
| GPT-5 | Excellent reasoning, multimodal | Expensive, higher latency | ~$3-5 | ~3-5s | When maximum accuracy is critical |
| GPT-5-mini | Good cost/performance balance | Less precise than full GPT-5 | ~$1-2 | ~2-3s | Budget alternative to GPT-5 |

**Why Gemini 3 Flash Preview**: Current inaccuracies stem from data contract design (prompt structure, metric definitions), not model limitations. Improving `computeFinancialContext()` and behavioral rules yields better ROI than upgrading the model.

## Usage Limits

- **Daily limit**: 20 messages per user per day (tracked in `ai_chat_usage`)
- **Message length**: Max 4,000 characters per message
- **Conversation history**: Trimmed to last 20 messages per request

## Sub-Documents

| File | Contents |
|------|----------|
| [data-flow.md](./data-flow.md) | End-to-end pipeline, preset flows, save flow |
| [components.md](./components.md) | Component tree, preset action details with exact prompts |
| [formulas.md](./formulas.md) | All pre-computed metrics and formulas |
| [state-management.md](./state-management.md) | `useAIChat` hook, state ownership |
| [edge-cases.md](./edge-cases.md) | Error handling, safety layers, hallucination prevention |
| [ai-integration.md](./ai-integration.md) | Full AI system architecture, context design, prompt strategy |
| [performance.md](./performance.md) | Token optimization, latency, scaling |
