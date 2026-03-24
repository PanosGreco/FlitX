# Data Management — Security

> ⚠️ **Security Notice**: This document describes security architecture and principles. No secrets, API keys, internal URLs, or exploitable details are included.

## Security Architecture Overview

FlitX implements defense-in-depth security across four layers:

1. **Database layer**: Row Level Security (RLS) on every table
2. **Storage layer**: private buckets with signed URLs, path-scoped public buckets
3. **Edge function layer**: JWT validation, server-side user derivation
4. **Client layer**: input validation, path traversal sanitization, file size limits

## Row Level Security (RLS)

### Enforcement Model

Every table in the system has RLS enabled with policies following the pattern:

```sql
-- SELECT, INSERT, UPDATE, DELETE all enforce:
auth.uid() = user_id
```

This means:
- A user can **only** read their own records
- A user can **only** insert records with their own `user_id`
- A user can **only** update/delete records they own
- **No cross-user data access is possible**, even via direct API calls

### Complete RLS Coverage

All 21 tables have full CRUD RLS policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `vehicles` | ✅ | ✅ | ✅ | ✅ |
| `rental_bookings` | ✅ | ✅ | ✅ | ✅ |
| `financial_records` | ✅ | ✅ | ✅ | ✅ |
| `daily_tasks` | ✅ | ✅ | ✅ | ✅ |
| `vehicle_maintenance` | ✅ | ✅ | ✅ | ✅ |
| `vehicle_reminders` | ✅ | ✅ | ✅ | ✅ |
| `vehicle_documents` | ✅ | ✅ | ✅ | ✅ |
| `damage_reports` | ✅ | ✅ | ✅ | ✅ |
| `maintenance_blocks` | ✅ | ✅ | ✅ | ✅ |
| `booking_contacts` | ✅ | ✅ | ✅ | ✅ |
| `booking_additional_costs` | ✅ | ✅ | ✅ | ✅ |
| `booking_additional_info` | ✅ | ✅ | ✅ | ✅ |
| `additional_cost_categories` | ✅ | ✅ | ✅ | ✅ |
| `additional_info_categories` | ✅ | ✅ | ✅ | ✅ |
| `insurance_types` | ✅ | ✅ | ✅ | ✅ |
| `recurring_transactions` | ✅ | ✅ | ✅ | ✅ |
| `user_notes` | ✅ | ✅ | ✅ | ✅ |
| `user_reminders` | ✅ | ✅ | ✅ | ✅ |
| `user_assets` | ✅ | ✅ | ✅ | ✅ |
| `user_asset_categories` | ✅ | ✅ | ✅ | ✅ |
| `profiles` | ✅ | ✅ | ✅ | ❌ (no DELETE policy) |

### Restricted Tables

| Table | Restriction | Reason |
|---|---|---|
| `profiles` | No DELETE policy | Profile deletion handled via account deletion flow |
| `user_roles` | SELECT only | Roles managed server-side; users cannot self-assign roles |
| `ai_chat_usage` | No DELETE | Usage records are system-managed for quota enforcement |
| `ai_chat_messages` | No UPDATE | Messages are immutable once created |

## Storage Security

### Bucket Configuration

| Bucket | Visibility | Access Method | Path Isolation |
|---|---|---|---|
| `vehicle-documents` | **Private** | Signed URLs (1-hour TTL) | `{user_id}/{vehicle_id}/{filename}` |
| `rental-contracts` | Public | Direct URL | `{user_id}/{booking_id}/{filename}` |
| `damage-images` | Public | Direct URL | `{user_id}/{vehicle_id}/{filename}` |

### Signed URL Security

- Generated on-demand when user requests document access
- 1-hour time-to-live — URLs expire automatically
- Not pre-fetched or cached — each access generates a fresh URL
- Only the owning user can request signed URLs (RLS on `vehicle_documents` table gates access)

### Path Traversal Prevention

All file uploads pass through `sanitizeFilename()` (`src/utils/fileUtils.ts`):
- Removes `../` sequences
- Strips path separators (`/`, `\`)
- Replaces special characters with underscores
- Limits filename to 100 characters
- Validates extension against allowlists (`ALLOWED_IMAGE_EXTENSIONS`, `ALLOWED_DOCUMENT_EXTENSIONS`)

## Edge Function Security

### JWT Validation

All edge functions validate the incoming JWT token:
1. Extract `Authorization` header from request
2. Validate token via `getClaims()` — derives `user_id` server-side
3. **User ID is NEVER accepted from client input** — always derived from auth claims

### AI Chat Isolation

The `ai-chat` edge function fetches business context from 7 tables:
- `vehicles`, `rental_bookings`, `financial_records`, `vehicle_maintenance`, `recurring_transactions`, `damage_reports`, `profiles`

All queries use the **authenticated user's client** (not service_role), so RLS policies enforce data isolation. Even if the AI system prompt were manipulated, the database layer prevents cross-tenant data access.

Additional AI safeguards:
- System prompts instruct the model to never reference other users or tenants
- Error responses are sanitized — no internal system details exposed to client
- Input limited to 4000 characters per message
- Conversation history trimmed to last 20 messages

### Admin Function Protection

The `cleanup-completed-tasks` edge function:
- Requires valid Bearer token
- Verifies `admin` role via `has_role()` function (SECURITY DEFINER)
- Uses `service_role` client only after admin verification
- Standard users cannot trigger cleanup operations

## Input Validation

| Input Type | Validation | Location |
|---|---|---|
| AI messages | Max 4000 characters | `ai-chat` edge function |
| File uploads | Max 10MB | `validateFileSize()` in `imageUtils.ts` |
| Filenames | Path traversal sanitization | `sanitizeFilename()` in `fileUtils.ts` |
| Image extensions | Allowlist: jpg, jpeg, png, gif, webp, heic | `ALLOWED_IMAGE_EXTENSIONS` |
| Document extensions | Allowlist: pdf, doc, docx, jpg, jpeg, png, gif, webp | `ALLOWED_DOCUMENT_EXTENSIONS` |

## Security Principles

1. **Least Privilege**: users access only their own data; admin role required for system operations
2. **Defense in Depth**: RLS at database, JWT at edge functions, validation at client
3. **No Secrets in Codebase**: all API keys stored as environment variables or edge function secrets
4. **No Client-Side Role Checks**: admin status verified server-side via `has_role()` SECURITY DEFINER function
5. **Immutable Audit Data**: AI usage records and messages cannot be modified by users
6. **Server-Side User Derivation**: `user_id` always comes from `auth.uid()`, never from request body
