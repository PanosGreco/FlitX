

# Plan: Data Management Documentation — 8-File Structure

## Overview

Create `/documentation/data-management/` with 8 markdown files covering security, GDPR compliance, data lifecycle, storage optimization, AI usage limits, user data control, and planned admin monitoring.

## Files to Create

### 1. `/documentation/data-management/README.md` (~100 lines)
- What Data Management means in FlitX
- Five data layers: User Data (profiles), Operational Data (bookings, tasks), Financial Data (financial_records, recurring_transactions), AI Data (conversations, usage), Stored Files (vehicle-documents, rental-contracts, damage-images)
- How each layer connects to Fleet, Reservations, Analytics, AI Chat, Daily Program
- Index linking to all 7 sub-documents

### 2. `/documentation/data-management/security.md` (~150 lines)
- **RLS enforcement**: every table has `auth.uid() = user_id` policies for SELECT/INSERT/UPDATE/DELETE — no cross-user access possible
- **Storage isolation**: `vehicle-documents` (private bucket, signed URLs with 1-hour TTL), `rental-contracts` and `damage-images` (public buckets but paths scoped by user_id)
- **Edge function security**: JWT validation via `getClaims()`, user_id derived server-side, never from client input
- **AI isolation**: all 7 data fetches in `ai-chat` are RLS-scoped, system prompts instruct no cross-tenant data leakage, sanitized error responses
- **Admin functions**: `cleanup-completed-tasks` requires admin role verified via `user_roles` table with service_role client
- **Input validation**: 4000 char message limit, 10MB file upload limit, path traversal sanitization
- **Principles**: least privilege, defense in depth, no secrets in codebase, no client-side role checks
- **NO secrets, keys, or internal URLs exposed in this document**

### 3. `/documentation/data-management/gdpr-compliance.md` (~150 lines)
- **Right to access**: users can view all their data through the app UI (vehicles, bookings, finances, documents, AI conversations)
- **Right to erasure**: `handleDeleteAccount()` in `UserProfile.tsx` — sequential deletion of: daily_tasks → damage_reports → financial_records → vehicle_maintenance → vehicle_reminders → vehicle_documents → maintenance_blocks → booking_contacts → rental_bookings → vehicles → user_roles → profiles → signOut. Note: currently missing deletion of ai_chat_messages, ai_chat_conversations, ai_chat_usage, user_notes, user_assets, user_asset_categories, recurring_transactions, booking_additional_costs, booking_additional_info, additional_cost_categories, additional_info_categories, insurance_types, user_reminders (flagged as gap to fix)
- **Right to rectify**: users can edit profile, vehicles, bookings, financial records, maintenance, reminders
- **Data minimization**: only business-relevant fields collected, no tracking pixels, no third-party analytics
- **Purpose limitation**: data used only for fleet management and AI analysis within the app
- **Data retention policy**: contract attachments auto-deleted 30 days after booking end_date via `cleanup-completed-tasks` edge function
- **Subscription expiry policy**: data automatically deleted 15 days after free trial expires (planned — document current status vs planned)
- **Consent**: user explicitly creates account, no pre-checked boxes

### 4. `/documentation/data-management/data-lifecycle.md` (~120 lines)
- **Create → Store → Use → Process → Archive → Delete** for each data type
- **Booking lifecycle**: UI creation → `rental_bookings` INSERT → `financial_records` INSERT (income) → `daily_tasks` INSERT ×2 → displayed in Home/Fleet/Analytics → contract attachment cleaned after 30 days → booking record persists until account deletion
- **Vehicle lifecycle**: creation → active operations → optional sale (is_sold=true, sale financial record) → sorted to bottom → excluded from new bookings → AI handles time-aware filtering → persists until account deletion
- **AI data lifecycle**: message sent → `ai_chat_usage` incremented → context fetched (not stored) → response streamed → conversation + messages persisted in `ai_chat_conversations`/`ai_chat_messages` → user can delete conversations → all deleted on account deletion
- **File lifecycle**: upload → size validation (10MB) → compression (if image >500KB) → storage bucket → signed URL on access → contract cleanup after 30 days → storage deletion on account deletion

### 5. `/documentation/data-management/storage-optimization.md` (~100 lines)
- **Upload limits**: 10MB max per file (`validateFileSize()` in `imageUtils.ts`)
- **Image compression**: JPG/PNG/WebP ≥500KB → canvas resize to max 2000px width at 85% quality; HEIC/HEIF always converted to JPEG for browser compatibility; PDF/GIF/SVG never compressed
- **Storage buckets**: `vehicle-documents` (private), `rental-contracts` (public), `damage-images` (public)
- **Vehicle images**: stored as base64 data URLs in `vehicles.image` column — simple but increases row size; future optimization: move to Storage bucket
- **Signed URLs**: generated on-demand with 1-hour TTL, not pre-fetched
- **Contract cleanup**: `cleanup-completed-tasks` removes files >30 days old, clears DB references
- **Database efficiency**: all queries RLS-filtered server-side, `useMemo` for client-side aggregation, debounced writes (600ms for assets, 1000ms for notes)

### 6. `/documentation/data-management/ai-usage-limits.md` (~100 lines)
- **Daily message limit**: 20 messages/day per user, tracked in `ai_chat_usage` table (date + user_id), enforced server-side in `ai-chat` edge function
- **Input limits**: max 4000 characters per message, conversation history trimmed to last 20 messages
- **Token optimization**: `buildFinancialSystemPrompt()` reduces context from ~15K to ~4K tokens for financial presets by excluding non-essential data
- **Cost control**: pre-computed metrics (not AI-computed) reduce prompt-response cycles; context fetched fresh per message but not cached (future optimization)
- **Model selection**: Gemini 3 Flash Preview chosen for cost (~$0.50/user/month) over GPT-5 (~$3-5/user/month)
- **Rate limiting**: provider-side 429s handled with user-friendly "AI is busy" message, distinct from daily quota
- **Insufficient data gates**: financial presets require ≥3 vehicles, ≥10 bookings, ≥2 cost entries — prevents wasteful API calls on empty datasets

### 7. `/documentation/data-management/user-data-control.md` (~80 lines)
- **View**: users see all their data through app sections (Fleet, Analytics, Daily Program, AI Chat)
- **Edit**: vehicles, bookings, financial records, maintenance, reminders, profile, notes — all editable in-app
- **Delete**: individual records deletable per section; full account deletion via Profile → Delete Account
- **AI conversations**: users can delete individual conversations or all via sidebar
- **Data portability / export**: not currently implemented — document as future feature
- **Data isolation**: RLS ensures no user can access another user's data, even via API manipulation

### 8. `/documentation/data-management/admin-monitoring.md` (~80 lines)
- **Status: PLANNED — NOT YET IMPLEMENTED** (prominent banner)
- **Purpose**: SaaS cost monitoring and system optimization
- **Planned admin dashboard** showing per-user metrics:
  - Daily AI output cost (tokens × model rate)
  - Total AI usage cost (cumulative)
  - Storage used (total bytes across all buckets)
  - Number of files stored
  - Message count per day
- **Example table format** with mock data
- **Security**: admin-only access via `has_role(user_id, 'admin')`, no user PII exposed in monitoring view
- **Current infrastructure**: `user_roles` table + `has_role()` function already exist; `ai_chat_usage` already tracks daily message counts — foundation is in place
- **Implementation path**: new `admin_monitoring` view or edge function, aggregating `ai_chat_usage`, storage bucket metadata, `financial_records` counts

## Important Discovery

The GDPR compliance document will flag a **real gap**: `handleDeleteAccount()` currently deletes 12 tables but misses 9 tables (ai_chat_messages, ai_chat_conversations, ai_chat_usage, user_notes, user_assets, user_asset_categories, recurring_transactions, booking_additional_costs, booking_additional_info, additional_cost_categories, additional_info_categories, insurance_types, user_reminders). This will be documented as a required fix.

## Files Modified
1-8: All new files in `/documentation/data-management/`

