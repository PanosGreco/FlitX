# Data Management — Data Lifecycle

## Overview

Every piece of data in FlitX follows a lifecycle: **Create → Store → Use → Process → (Archive) → Delete**. This document traces each data type through its complete lifecycle.

## Booking Lifecycle

```
1. CREATE
   User fills UnifiedBookingDialog → submits
   
2. STORE
   rental_bookings INSERT (core booking)
   financial_records INSERT (income record, type=income)
   booking_contacts INSERT (customer phone/email)
   booking_additional_costs INSERT ×N (extra charges)
   booking_additional_info INSERT ×N (metadata)
   daily_tasks INSERT ×2 (delivery task on start_date, return task on end_date)
   Contract photo → rental-contracts storage bucket
   
3. USE
   Fleet → Vehicle → Reservations tab (booking list)
   Fleet → Vehicle → Calendar (date blocking)
   Home → Timeline Calendar (delivery/return tasks)
   Daily Program → task columns (pickup/return)
   
4. PROCESS
   Analytics → financial_records aggregated into income totals
   AI Chat → computeFinancialContext() reads booking count, avg revenue, duration
   Vehicle status → auto-computed from active bookings
   
5. ARCHIVE (partial)
   Contract attachment auto-deleted after 30 days (cleanup-completed-tasks)
   Core booking record persists
   
6. DELETE
   User deletes booking → cascades to contacts, additional_costs, additional_info, tasks
   User deletes account → all bookings deleted in sequence
```

## Vehicle Lifecycle

```
1. CREATE
   User fills Add Vehicle dialog → vehicles INSERT
   Status defaults to 'available'
   
2. STORE
   vehicles table (make, model, year, daily_rate, image as base64, etc.)
   Optional: vehicle_documents in storage bucket
   
3. USE
   Fleet grid (card display)
   Fleet detail page (all sub-tabs)
   Booking selectors (available vehicles dropdown)
   Home timeline (vehicle name on tasks)
   
4. PROCESS
   Analytics → per-vehicle profitability
   AI Chat → vehicle context (type, rate, fuel, transmission)
   Status computation → derived from active bookings/maintenance blocks
   
5. SALE (optional lifecycle branch)
   User marks vehicle as sold → is_sold = true, sale_price, sale_date set
   financial_records INSERT (sale profit/loss)
   Vehicle sorted to bottom of fleet grid
   Excluded from new booking selectors
   AI handles time-aware filtering (pre-sale bookings included, post-sale excluded)
   
6. DELETE
   User deletes vehicle → cascades to maintenance, reminders, documents, damage reports, bookings
   User deletes account → all vehicles deleted
```

## Financial Record Lifecycle

```
1. CREATE
   Source A: Booking creation → auto-generated income record
   Source B: Analytics → manual income/expense entry
   Source C: Recurring transaction processing → auto-generated on schedule
   Source D: Maintenance entry → auto-generated expense record
   Source E: Vehicle sale → auto-generated profit/loss record
   
2. STORE
   financial_records table
   Fields: type (income/expense), amount, category, date, vehicle_id, booking_id, source_section
   
3. USE
   Analytics → income/expense charts, totals, breakdowns
   Fleet → Vehicle → Finance tab (per-vehicle view)
   
4. PROCESS
   AI Chat → computeFinancialContext() aggregates by category, vehicle, time period
   Analytics → client-side aggregation via useMemo for charts
   
5. DELETE
   User deletes individual record from Analytics
   User deletes parent booking → financial record remains (not cascaded)
   User deletes account → all records deleted
```

## AI Data Lifecycle

```
1. CREATE
   User sends message or clicks preset → ai_chat_usage UPSERT (increment count)
   Edge function processes → response streamed
   
2. STORE
   ai_chat_conversations INSERT/UPDATE (conversation metadata + title)
   ai_chat_messages INSERT ×2 (user message + assistant response)
   ai_chat_usage UPSERT (daily count per user)
   
3. USE
   AI Chat sidebar → conversation list
   AI Chat main area → message history
   Daily limit check → usage count comparison
   
4. PROCESS
   Business context is fetched FRESH per message (not stored)
   Context is assembled, injected into prompt, sent to AI model
   Context is discarded after response — only the message text is persisted
   
5. DELETE
   User deletes conversation → cascades to all messages in conversation
   User deletes account → ⚠️ CURRENTLY NOT DELETED (gap — see gdpr-compliance.md)
```

## File Lifecycle

```
1. CREATE
   User selects file → validateFileSize() (max 10MB)
   If image ≥500KB → compressImage() (resize to 2000px, 85% quality)
   If HEIC → convert to JPEG
   sanitizeFilename() → remove path traversal, validate extension
   
2. STORE
   Upload to appropriate bucket:
   - vehicle-documents (private) → vehicle PDFs, insurance docs
   - rental-contracts (public, path-scoped) → booking contract photos
   - damage-images (public, path-scoped) → damage report photos
   Database reference: file_path stored in vehicle_documents, rental_bookings, or damage_reports
   
3. USE
   vehicle-documents → signed URL generated on-demand (1-hour TTL) → FilePreviewModal
   rental-contracts → direct URL → contract preview in booking/task
   damage-images → direct URL → damage report gallery
   
4. ARCHIVE
   Contract attachments: auto-deleted 30 days after booking end_date
   Vehicle documents: persist until manually deleted
   Damage images: persist until manually deleted
   
5. DELETE
   User deletes document → storage file removed + DB reference deleted
   User deletes vehicle → all associated documents/images deleted
   User deletes account → all storage files should be deleted (currently partial — vehicle_documents deleted, but bucket files for contracts/damage may persist as orphans)
```

## Task Lifecycle

```
1. CREATE
   Auto-generated: booking creation → delivery task (start_date) + return task (end_date)
   Manual: user creates "other" task via AddTaskDialog
   
2. STORE
   daily_tasks table
   Fields: task_type (delivery/return/other), due_date, due_time, vehicle_id, booking_id, status
   
3. USE
   Daily Program → three-column view (Drop-Offs, Pick-Ups, Other)
   Home → Timeline Calendar (all task types)
   Home → Monthly Calendar (task indicators)
   
4. PROCESS
   Status updates: pending → in_progress → completed/cancelled
   Contract attachment: can be added/removed from task
   
5. DELETE
   User deletes task → contract attachment removed from storage if exists
   User deletes parent booking → associated tasks deleted
   Completed tasks older than 30 days → contract attachments cleaned (not task record)
   User deletes account → all tasks deleted
```

## Reminder Lifecycle

```
1. CREATE
   Vehicle reminders: Fleet → Vehicle → Reminders → Add
   User reminders: Home → Reminders widget → Add
   
2. STORE
   vehicle_reminders (vehicle-scoped) or user_reminders (general)
   Fields: title, due_date, frequency, is_completed
   
3. USE
   Fleet → Vehicle → Reminders tab
   Home → Reminders widget (both types merged)
   
4. PROCESS
   Recurring reminders: frequency field (one_time, daily, weekly, monthly, yearly)
   Completion tracking: is_completed + completed_at
   
5. DELETE
   User deletes individual reminder
   User deletes vehicle → vehicle_reminders cascaded
   User deletes account → vehicle_reminders deleted; ⚠️ user_reminders NOT deleted (gap)
```

## Notes Lifecycle

```
1. CREATE
   Home → Notebook widget → type content
   
2. STORE
   user_notes table (one note per date per user)
   Debounced save: 1000ms delay, force-save on blur
   
3. USE
   Home → Notebook widget (date-filtered view)
   
4. DELETE
   Notes persist until account deletion
   ⚠️ NOT deleted during account deletion (gap — see gdpr-compliance.md)
```
