# Data Management — User Data Control

## Overview

FlitX users have full control over their data at all times. Every piece of data a user creates can be viewed, edited, and deleted through the application. Data isolation is enforced at the database level — no user can access another user's data under any circumstance.

## Data Isolation

### RLS-Based Isolation

Every table enforces `auth.uid() = user_id` on all operations. This means:

- A user querying the API directly (bypassing the UI) still cannot access other users' data
- Malformed or manipulated requests cannot cross tenant boundaries
- The Supabase client automatically injects the authenticated user's JWT, and RLS policies validate against it

### AI Data Isolation

When the AI Chat fetches business context:
- All 7 data queries use the authenticated user's client (not service_role)
- RLS applies identically to AI context fetches as to normal UI queries
- The AI model receives only the requesting user's data
- System prompts explicitly instruct against referencing other tenants

## View Capabilities

Users can view all their data through the application:

| Data | View Location |
|---|---|
| Profile | Profile page |
| Vehicles | Fleet grid → Vehicle detail page |
| Bookings | Fleet → Vehicle → Reservations tab |
| Financial records | Analytics → Income/Expense breakdowns |
| Maintenance | Fleet → Vehicle → Maintenance tab |
| Vehicle reminders | Fleet → Vehicle → Reminders tab |
| General reminders | Home → Reminders widget |
| Documents | Fleet → Vehicle → Documents tab |
| Damage reports | Fleet → Vehicle (via Damage section) |
| Tasks | Daily Program, Home → Timeline |
| Notes | Home → Notebook widget |
| AI conversations | AI Chat → Sidebar conversation list |
| Assets | Analytics → Asset Tracking widget |
| Custom categories | Visible during booking creation (cost categories, info categories, insurance types) |

## Edit Capabilities

| Data | Edit Method |
|---|---|
| Profile | Profile page → inline field editing |
| Vehicles | Fleet → Vehicle → Edit Vehicle dialog |
| Bookings | Fleet → Vehicle → Reservations → Edit booking |
| Financial records | Analytics → Edit individual record |
| Maintenance | Fleet → Vehicle → Maintenance → Edit record |
| Vehicle reminders | Fleet → Vehicle → Reminders → Edit |
| General reminders | Home → Reminders → Edit |
| Tasks | Daily Program → Edit Task dialog |
| Notes | Home → Notebook → inline text editing (debounced auto-save) |
| AI conversations | **Cannot edit** — messages are immutable historical records |
| Assets | Analytics → Asset Tracking → inline value editing |

## Delete Capabilities

### Individual Record Deletion

| Data | Delete Method | Cascade Behavior |
|---|---|---|
| Vehicle | Fleet → Vehicle → Delete | Cascades: maintenance, reminders, documents, damage reports, bookings |
| Booking | Fleet → Reservations → Delete | Cascades: contacts, additional costs, additional info, generated tasks |
| Financial record | Analytics → Delete record | No cascade |
| Maintenance record | Fleet → Maintenance → Delete | No cascade |
| Reminder | Fleet → Reminders → Delete / Home → Delete | No cascade |
| Document | Fleet → Documents → Delete | Storage file + DB reference deleted |
| Damage report | Fleet → Damage → Delete | Storage images + DB reference deleted |
| Task | Daily Program → Delete | Contract attachment deleted from storage if exists |
| Note | Notes persist (no individual delete UI) | — |
| AI conversation | AI Chat → Sidebar → Delete | Cascades: all messages in conversation |
| Asset | Analytics → Asset Tracking → Delete | No cascade |

### Full Account Deletion

**Location**: Profile page → "Delete Account" button

**Confirmation**: user must confirm the destructive action

**Process**: sequential deletion of all user data across 12+ tables, followed by session sign-out

**See**: [gdpr-compliance.md](./gdpr-compliance.md) for the complete deletion sequence and known gaps

## Data Export / Portability

### Current State

**Not implemented.** Users cannot currently export their data in a portable format (CSV, JSON, etc.).

### Future Feature

Planned data export capabilities:
- Export vehicles as CSV
- Export financial records as CSV (compatible with accounting software)
- Export bookings as CSV
- Export all data as JSON archive (full account export)
- Accessible from Profile page

This would fulfill GDPR Article 20 (Right to Data Portability).

## User Rights Summary

| Right | Status | Implementation |
|---|---|---|
| View all data | ✅ Implemented | All data accessible through UI sections |
| Edit all data | ✅ Implemented | Edit dialogs/inline editing across all sections |
| Delete individual records | ✅ Implemented | Delete buttons per record type |
| Delete entire account | ⚠️ Partial | 12 tables deleted; 13 tables missing (see GDPR doc) |
| Export data | ❌ Not implemented | Planned future feature |
| Restrict processing | ⚠️ Implicit | Users can delete data to stop processing; no explicit "restrict" toggle |
