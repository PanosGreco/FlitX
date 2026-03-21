# Home Section — System Documentation

## Overview

The Home section (`/` route, rendered by `Home.tsx`) is the **operational command center** of FlitX. It provides a real-time daily view of all scheduled activities — vehicle deliveries, returns, and custom tasks — alongside quick-access widgets for reminders and notes.

Unlike Analytics (which looks backward at financial data) or Fleet (which manages vehicle lifecycle), Home is **present-focused**: it answers "What do I need to do today and this week?"

## System Position

```
┌─────────────────────────────────────────────────────────────┐
│                        FlitX System                         │
│                                                             │
│  ┌──────────┐    generates tasks    ┌──────────────────┐    │
│  │  Fleet   │ ──────────────────→   │                  │    │
│  │ Bookings │    (delivery/return)  │                  │    │
│  └──────────┘                       │       HOME       │    │
│  ┌──────────┐    reminders feed     │                  │    │
│  │ Vehicle  │ ──────────────────→   │  - Timeline Cal  │    │
│  │Reminders │                       │  - Monthly Cal   │    │
│  └──────────┘                       │  - Reminders     │    │
│  ┌──────────┐    notes per date     │  - Notebook      │    │
│  │  User    │ ←────────────────→    │  - Create Dialog │    │
│  │  Notes   │                       │                  │    │
│  └──────────┘                       └────────┬─────────┘    │
│                                              │              │
│                    booking creation           │              │
│                    via CreateDialog            ▼              │
│                                     ┌──────────────────┐    │
│                                     │    Analytics     │    │
│                                     │ (financial_records│    │
│                                     │  created on       │    │
│                                     │  booking save)    │    │
│                                     └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Connections

| Connected Section | Relationship | Direction |
|---|---|---|
| **Fleet / Bookings** | Bookings auto-generate `daily_tasks` (type=delivery on start_date, type=return on end_date). Home reads these tasks. | Fleet → Home |
| **Vehicle Reminders** | `vehicle_reminders` with today's `due_date` appear in the Reminders widget. | Fleet → Home |
| **Analytics** | Bookings created via Home's CreateDialog trigger `financial_records` INSERT (via `UnifiedBookingDialog`). | Home → Analytics |
| **AI Assistant** | AI reads `rental_bookings` and `financial_records` for analysis. Tasks created from Home feed this indirectly. | Home → AI (indirect) |
| **Daily Program** | Reminders widget links to `/daily-program` page for full task management. | Home → Daily Program |

## Source of Truth

| Data Type | Authoritative Table | Notes |
|---|---|---|
| Timeline calendar display | `daily_tasks` | All non-completed/cancelled tasks with joins to `vehicles` and `rental_bookings` |
| Daily reminders widget | `vehicle_reminders` | Filtered by `due_date = today` |
| Notebook content | `user_notes` | Keyed by `user_id + note_date` (one note per user per day) |
| Booking details (customer, contract) | `rental_bookings` | Enriches `daily_tasks` that have a `booking_id` |
| Additional booking info | `booking_additional_info` + `additional_info_categories` | Category/subcategory metadata attached to booking tasks |

## Documentation Index

- [Data Flow](./data-flow.md) — Step-by-step data lifecycles
- [Components](./components.md) — Component tree and responsibilities
- [Formulas](./formulas.md) — Calculations and derived logic
- [State Management](./state-management.md) — Where state lives and propagation
- [Edge Cases](./edge-cases.md) — Error handling and safeguards
- [AI Integration](./ai-integration.md) — How Home data feeds the AI
- [Performance](./performance.md) — Scaling considerations
