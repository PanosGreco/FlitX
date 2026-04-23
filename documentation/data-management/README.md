# Data Management — System Overview

## What This Section Covers

Data Management defines how FlitX handles, protects, stores, optimizes, and governs all data across the system. This is production-level documentation covering security, GDPR compliance, data lifecycle, and governance — not UI documentation.

## Why Data Management Is Critical

FlitX is a multi-tenant SaaS platform where each user manages sensitive business data: financial records, customer information, vehicle documents, and operational schedules. Proper data management ensures:

- **Privacy**: no user can access another user's data
- **Compliance**: GDPR right to access, rectify, and erase
- **Efficiency**: storage and AI costs are controlled
- **Trust**: users retain full control over their data at all times

## Data Layers

FlitX data is organized into five distinct layers:

### 1. User Data
- **Table**: `profiles`
- **Contains**: name, email, phone, company_name, country, city, language, business_type, avatar_url
- **Used by**: all sections (display name, language preference, business type filtering)

### 2. Operational Data
- **Tables**: `rental_bookings`, `daily_tasks`, `vehicle_reminders`, `user_reminders`, `maintenance_blocks`, `booking_contacts`, `booking_additional_info`, `booking_additional_costs`
- **Contains**: reservations, task schedules, reminders, booking metadata
- **Used by**: Home (timeline), Fleet (calendar/reservations), Daily Program (task execution), AI Chat (booking context)

### 3. Financial Data
- **Tables**: `financial_records`, `recurring_transactions`, `user_assets`, `user_asset_categories`
- **Contains**: income/expense records, recurring costs, asset tracking
- **Used by**: Analytics (charts/totals), Fleet (per-vehicle finance tab), AI Chat (financial analysis)

### 4. AI Data
- **Tables**: `ai_chat_conversations`, `ai_chat_messages`, `ai_chat_usage`
- **Contains**: conversation history, message content, daily usage counts
- **Used by**: AI Chat (conversation persistence, usage limiting)

### 5. Stored Files
- **Buckets**: `vehicle-documents` (private), `rental-contracts` (public, path-scoped), `damage-images` (public, path-scoped)
- **Contains**: PDFs, images, contracts, damage photos
- **Used by**: Fleet (documents tab, damage reports), Daily Program (contract attachments)

## Cross-Section Data Flow

```
User Data (profiles)
    │
    ├── Fleet ←→ vehicles, vehicle_maintenance, vehicle_documents, damage_reports
    │     │
    │     ├── Reservations ←→ rental_bookings, booking_contacts, booking_additional_*
    │     │     │
    │     │     ├── Daily Program ←→ daily_tasks (auto-generated from bookings)
    │     │     │
    │     │     └── Analytics ←→ financial_records (generated from bookings)
    │     │
    │     └── Maintenance ←→ vehicle_maintenance → financial_records (expense)
    │
    ├── AI Chat ←→ ai_chat_conversations, ai_chat_messages, ai_chat_usage
    │     │
    │     └── READS: vehicles, rental_bookings, financial_records, vehicle_maintenance,
    │              recurring_transactions, damage_reports, profiles, customers, accidents
    │
    └── Home ←→ daily_tasks, user_notes, user_reminders, vehicle_reminders
```

## Document Index

| Document | Purpose |
|---|---|
| [security.md](./security.md) | RLS, storage isolation, input validation, defense-in-depth |
| [gdpr-compliance.md](./gdpr-compliance.md) | Right to access/rectify/erase, data retention, consent |
| [data-lifecycle.md](./data-lifecycle.md) | Create → Store → Use → Process → Delete for each data type |
| [storage-optimization.md](./storage-optimization.md) | Upload limits, compression, bucket strategy, cleanup |
| [ai-usage-limits.md](./ai-usage-limits.md) | Daily limits, token optimization, cost control |
| [user-data-control.md](./user-data-control.md) | View, edit, delete capabilities for users |
| [admin-monitoring.md](./admin-monitoring.md) | Planned admin dashboard for cost/usage tracking |
