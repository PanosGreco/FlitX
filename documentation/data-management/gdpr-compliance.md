# Data Management — GDPR Compliance

## Overview

FlitX is designed with GDPR principles embedded in its architecture. This document defines how each GDPR right is implemented, identifies current gaps, and describes data retention policies.

## GDPR Rights Implementation

### 1. Right to Access (Article 15)

Users can view all their data through the application UI:

| Data Category | Access Point | Tables |
|---|---|---|
| Profile information | Profile page | `profiles` |
| Vehicles | Fleet section | `vehicles` |
| Bookings | Fleet → Vehicle → Reservations | `rental_bookings`, `booking_contacts`, `booking_additional_costs`, `booking_additional_info` |
| Financial records | Analytics section | `financial_records`, `recurring_transactions` |
| Maintenance history | Fleet → Vehicle → Maintenance | `vehicle_maintenance` |
| Documents | Fleet → Vehicle → Documents | `vehicle_documents` (+ Storage bucket files) |
| Damage reports | Fleet → Vehicle → Damage | `damage_reports` (+ Storage bucket images) |
| Reminders | Fleet → Vehicle → Reminders, Home | `vehicle_reminders`, `user_reminders` |
| Tasks | Daily Program, Home | `daily_tasks` |
| Notes | Home → Notebook | `user_notes` |
| AI conversations | AI Chat sidebar | `ai_chat_conversations`, `ai_chat_messages` |
| Assets | Analytics → Asset Tracking | `user_assets`, `user_asset_categories` |
| Custom categories | Booking creation flow | `additional_cost_categories`, `additional_info_categories`, `insurance_types` |

**No hidden data**: every piece of stored user data is accessible through the UI.

### 2. Right to Rectification (Article 16)

Users can edit all their data in-app:

| Data | Edit Location |
|---|---|
| Profile | Profile page → edit fields |
| Vehicles | Fleet → Vehicle → Edit Vehicle dialog |
| Bookings | Fleet → Vehicle → Reservations → Edit |
| Financial records | Analytics → Edit record |
| Maintenance | Fleet → Vehicle → Maintenance → Edit |
| Reminders | Fleet → Vehicle → Reminders → Edit |
| Tasks | Daily Program → Edit task |
| Notes | Home → Notebook → inline edit |
| AI conversations | Cannot edit (immutable by design — messages represent historical record) |

### 3. Right to Erasure (Article 17)

#### Individual Record Deletion

Users can delete individual records across all sections:
- Vehicles (cascades to related bookings, maintenance, documents, damage reports)
- Bookings (cascades to contacts, additional costs, additional info, generated tasks)
- Financial records, maintenance records, reminders, tasks, documents, damage reports
- AI conversations (cascades to all messages in conversation)
- Notes, assets, custom categories

#### Full Account Deletion

**Location**: Profile page → "Delete Account" button

**Current implementation** (`handleDeleteAccount()` in `UserProfile.tsx`):

Sequential deletion order:
1. `daily_tasks` (WHERE user_id = current user)
2. `damage_reports`
3. `financial_records`
4. `vehicle_maintenance`
5. `vehicle_reminders`
6. `vehicle_documents`
7. `maintenance_blocks`
8. `booking_contacts`
9. `rental_bookings`
10. `vehicles`
11. `user_roles`
12. `profiles`
13. Sign out (clears auth session)

#### ⚠️ KNOWN GAP — Tables Missing from Account Deletion

The following tables are **NOT currently deleted** during account deletion:

| Missing Table | Data Type | Risk Level |
|---|---|---|
| `ai_chat_messages` | AI conversation messages | **High** — contains user queries |
| `ai_chat_conversations` | Conversation metadata | **High** — contains titles |
| `ai_chat_usage` | Daily usage counts | **Medium** — contains usage patterns |
| `user_notes` | Personal notes | **High** — contains free-text user content |
| `user_assets` | Asset tracking records | **Medium** — contains financial data |
| `user_asset_categories` | Asset category definitions | **Low** — structural data |
| `recurring_transactions` | Recurring income/expenses | **High** — contains financial data |
| `booking_additional_costs` | Per-booking extra costs | **Medium** — linked to bookings (parent deleted) |
| `booking_additional_info` | Per-booking extra info | **Medium** — linked to bookings (parent deleted) |
| `additional_cost_categories` | Custom cost category names | **Low** — structural data |
| `additional_info_categories` | Custom info category names | **Low** — structural data |
| `insurance_types` | Custom insurance type names | **Low** — structural data |
| `user_reminders` | General reminders | **Medium** — contains user-created content |

**Note**: Tables with foreign keys to `rental_bookings` (booking_additional_costs, booking_additional_info) may fail silently since parent bookings ARE deleted — but orphaned records could remain if FK constraints don't cascade. Tables without FK dependencies (ai_chat_*, user_notes, recurring_transactions) will definitely persist as orphaned data.

**Required fix**: Add deletion of all 13 missing tables in the correct dependency order before the existing deletion sequence.

### 4. Data Minimization (Article 5(1)(c))

FlitX collects only business-relevant data:
- **No tracking pixels** or third-party analytics scripts
- **No behavioral tracking** beyond AI usage counts
- **No marketing data collection** — no newsletter signups, no lead scoring
- **Profile fields** are optional (company_name, phone, city, country can remain null)
- **Vehicle images** are optional — vehicles function without photos

### 5. Purpose Limitation (Article 5(1)(b))

All collected data serves one of three explicit purposes:
1. **Fleet management**: vehicles, bookings, maintenance, documents, tasks
2. **Financial analysis**: income/expense records, recurring transactions, assets
3. **AI-assisted insights**: conversations and usage tracking for the AI Chat feature

No data is:
- Sold to third parties
- Used for advertising
- Shared between tenants
- Processed for purposes beyond fleet management

### 6. Consent (Article 7)

- Users **explicitly create an account** with email and password
- No pre-checked consent boxes
- Email verification required before access (unless explicitly disabled)
- Account creation implies consent for fleet management data processing
- Users can withdraw consent by deleting their account

## Data Retention Policies

### Automatic Retention: Contract Attachments

- **Rule**: contract photo attachments in `rental-contracts` bucket are auto-deleted 30 days after the booking's `end_date`
- **Mechanism**: `cleanup-completed-tasks` edge function (admin-triggered)
- **Scope**: deletes storage files AND clears `contract_photo_path` in `rental_bookings` and `contract_path` in `daily_tasks`
- **Core booking data** (dates, amounts, customer name) is NOT deleted — only the attachment

### Planned Retention: Subscription Expiry

- **Rule**: if a user's free trial expires and they do not subscribe, all data is deleted after 15 days
- **Status**: ⚠️ PLANNED — not yet implemented
- **Implementation path**: scheduled edge function checking subscription status against trial end date

### No Automatic Deletion of Active Data

For active (subscribed) users:
- No data is automatically deleted except contract attachments (30-day policy)
- All other data persists until the user explicitly deletes it
- Account deletion removes everything (subject to the gap noted above)

## Data Processing Records (Article 30)

| Processing Activity | Legal Basis | Data Categories | Retention |
|---|---|---|---|
| Fleet management | Legitimate interest / Contract | Vehicles, bookings, maintenance | Until user deletes |
| Financial tracking | Legitimate interest / Contract | Income, expenses, assets | Until user deletes |
| AI analysis | Legitimate interest | Aggregated fleet/financial data | Context not stored; conversations until deleted |
| Document storage | Contract | PDFs, images | Contracts: 30 days post-booking; Documents: until deleted |
| Usage monitoring | Legitimate interest | AI message counts | Until account deletion |
