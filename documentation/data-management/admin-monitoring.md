# Data Management — Admin Monitoring

> ## ⚠️ STATUS: PLANNED — NOT YET IMPLEMENTED
>
> This document describes a **planned feature** that has not been built yet.
> All content below represents the intended design and is subject to change.
> Do not reference this as existing functionality.

## Purpose

Admin Monitoring will provide a SaaS-level dashboard for system administrators to track:
- **AI usage costs** per user (daily and cumulative)
- **Storage consumption** per user (total bytes, file counts)
- **System health metrics** (active users, data growth trends)

This enables:
- Cost control and budgeting for AI API expenses
- Storage optimization decisions
- Identifying high-usage users for plan upgrades
- Capacity planning for system scaling

## Planned Dashboard

### Per-User Metrics Table

| User ID | Daily AI Messages | Daily AI Cost (est.) | Total AI Cost (est.) | Storage Used | Files Count | Last Active |
|---|---|---|---|---|---|---|
| `abc-123` | 12 | $0.04 | $14.20 | 48 MB | 23 | 2026-03-24 |
| `def-456` | 3 | $0.01 | $8.50 | 120 MB | 67 | 2026-03-23 |
| `ghi-789` | 0 | $0.00 | $2.10 | 5 MB | 4 | 2026-03-20 |

### Metrics Definitions

| Metric | Source | Calculation |
|---|---|---|
| Daily AI Messages | `ai_chat_usage.message_count` | Direct read for current date |
| Daily AI Cost | `ai_chat_usage.message_count` × estimated cost per message | ~$0.003/message for Gemini 3 Flash |
| Total AI Cost | Sum of all `ai_chat_usage` records × cost per message | Cumulative since account creation |
| Storage Used | Storage bucket metadata API | Sum of file sizes across all 3 buckets for user |
| Files Count | `vehicle_documents` count + storage bucket file listing | DB count + bucket enumeration |
| Last Active | Max of `ai_chat_usage.date`, `profiles.updated_at` | Most recent activity timestamp |

### Aggregate Dashboard Metrics

| Metric | Description |
|---|---|
| Total Monthly AI Cost | Sum of all users' AI costs for current month |
| Average AI Cost Per User | Total monthly cost / active user count |
| Total Storage Used | Sum across all users and buckets |
| Active Users (30 days) | Users with any activity in last 30 days |
| Highest AI User | User with most messages this month |
| Highest Storage User | User with most storage consumption |

## Existing Infrastructure

The following components are already in place and can be leveraged:

### 1. User Roles System
- `user_roles` table with `user_role` enum (`admin`, `manager`, `user`)
- `has_role(_user_id, _role)` SECURITY DEFINER function
- Admin-only access pattern already used in `cleanup-completed-tasks`

### 2. AI Usage Tracking
- `ai_chat_usage` table already tracks `message_count` per `user_id` per `date`
- Data accumulates automatically from AI Chat usage
- RLS policies in place (users see only their own; admin function would use service_role)

### 3. Storage Buckets
- Three buckets already configured: `vehicle-documents`, `rental-contracts`, `damage-images`
- Supabase Storage API provides `list()` and file metadata endpoints

## Implementation Path

### Phase 1: Edge Function for Data Aggregation

Create `admin-monitoring` edge function:
1. Verify admin role via `has_role(auth.uid(), 'admin')`
2. Use `service_role` client to query across all users:
   - `ai_chat_usage`: aggregate message counts and estimated costs
   - `vehicle_documents`: count and sum file sizes per user
   - Storage bucket metadata: enumerate files per user path
3. Return aggregated JSON (no PII — only user_id, metrics)

### Phase 2: Admin UI

Create admin-only page accessible via `/admin` route:
- Protected by role check (not just authentication)
- Display metrics table with sorting and filtering
- Date range selector for cost analysis
- Export to CSV capability

### Phase 3: Alerts and Automation

- Threshold alerts: notify when a user exceeds cost limits
- Automated reports: daily/weekly email summaries
- Cost projections: trend-based forecasting

## Security Requirements

> ⚠️ **Critical Security Constraints**

1. **Admin-only access**: dashboard must verify `has_role(user_id, 'admin')` server-side — never client-side
2. **No PII exposure**: monitoring shows user_id (UUID) only — no names, emails, or personal data in the monitoring view
3. **Service role isolation**: admin queries use `service_role` client but only for aggregation — never for data modification
4. **Audit trail**: admin access to monitoring should be logged (future requirement)
5. **Rate limiting**: monitoring endpoint should be rate-limited to prevent abuse

## Cost Estimation Model

### Current Model Pricing (Estimated)

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Est. Cost Per Message |
|---|---|---|---|
| Gemini 3 Flash Preview | ~$0.10 | ~$0.40 | ~$0.003 |
| Gemini 2.5 Pro | ~$1.25 | ~$5.00 | ~$0.015 |
| GPT-5 | ~$2.50 | ~$10.00 | ~$0.025 |

### Assumptions
- Average input: ~5,000 tokens (context + history + message)
- Average output: ~500 tokens (AI response)
- 20 messages/day limit → max ~$0.06/user/day with Gemini 3 Flash
- Typical usage: ~8 messages/day → ~$0.024/user/day → ~$0.72/user/month
