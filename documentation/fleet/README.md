# Fleet Section — System Context

## Overview

The Fleet section is the **core asset management hub** of FlitX. Every vehicle in the user's business is registered, tracked, and managed here. Fleet is the central node that feeds data to all other sections of the application.

- **Route**: `/fleet` (list view, rendered by `Fleet.tsx`)
- **Detail Route**: `/vehicle/:id` (single vehicle, rendered by `VehicleDetail.tsx`)

## Role in the System

Fleet is the **source of all vehicle-related data**. Without vehicles registered in Fleet, there are no bookings, no maintenance records, no financial data, and no AI analysis. It is the foundational layer of the entire application.

```
                    ┌─────────────┐
                    │   AI Chat   │
                    │  (reads all │
                    │  fleet data)│
                    └──────▲──────┘
                           │
    ┌──────────┐    ┌──────┴──────┐    ┌───────────┐
    │   Home   │◄───│    FLEET    │───►│ Analytics  │
    │(timeline │    │  (vehicles, │    │(financial  │
    │  tasks)  │    │  bookings,  │    │  records)  │
    └──────────┘    │maintenance) │    └───────────┘
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Daily     │
                    │  Program    │
                    │  (tasks)    │
                    └─────────────┘
```

### Connections to Other Sections

| Section | Relationship | Data Flow |
|---------|-------------|-----------|
| **Home** | Bookings created in Fleet generate `daily_tasks` (delivery/return) displayed on the Home timeline | Fleet → `daily_tasks` → Home |
| **Analytics** | Bookings generate income `financial_records`; maintenance generates expense `financial_records`; vehicle sales generate profit/loss records | Fleet → `financial_records` → Analytics |
| **AI Assistant** | AI reads `vehicles`, `rental_bookings`, `vehicle_maintenance`, `recurring_transactions` for financial analysis and pricing optimization | Fleet → AI context computation |
| **Daily Program** | Vehicle reminders appear in the Home reminders widget and link to the Daily Program page | Fleet → `vehicle_reminders` → Home/Daily Program |

## Vehicle Lifecycle

```
Creation          Operation                    Sale              Post-Sale
────────►  ──────────────────────────►  ─────────────►  ──────────────────►
                                        
Add Vehicle   Bookings, Maintenance,    Mark is_sold,    Sorted to bottom
dialog →      Reminders, Documents,     generate P&L     of grid, excluded
vehicles      Damage Reports            financial_record  from booking
INSERT                                                    selectors, time-
                                                          aware in AI
```

1. **Creation**: User fills Add Vehicle dialog (type, category, make, model, year, etc.) → `vehicles` INSERT with optional base64 image
2. **Operation**: Vehicle receives bookings (`rental_bookings`), maintenance (`vehicle_maintenance`), reminders (`vehicle_reminders`), documents (`vehicle_documents`), damage reports (`damage_reports`)
3. **Sale**: Finance tab triggers sale → `financial_records` INSERT with profit/loss calculation → `vehicles` UPDATE (`is_sold=true`, `sale_price`, `sale_date`)
4. **Post-sale**: Vehicle sorted to bottom of grid with reduced opacity, SOLD badge replaces status, excluded from booking/maintenance selectors, pre-sale data preserved for AI analysis

## Source of Truth Definitions

| Table | Authority | Notes |
|-------|-----------|-------|
| `vehicles` | Vehicle attributes (make, model, type, status, daily_rate, is_sold) | Central entity |
| `rental_bookings` | Reservations per vehicle | Links to `financial_records` via booking_id |
| `vehicle_maintenance` | Maintenance history per vehicle | Cost > 0 also creates `financial_records` |
| `maintenance_blocks` | Scheduled unavailability periods | Used for calendar blocking + status computation |
| `vehicle_reminders` | Vehicle-specific reminders | Due dates shown in Home widget |
| `vehicle_documents` | Uploaded documents | Files in `vehicle-documents` storage bucket |
| `damage_reports` | Damage history with photos | Images in `damage-images` storage bucket |
| `financial_records` | **Derived** from bookings + maintenance | Not editable from Fleet directly |

## Vehicle Sub-Sections

Each vehicle detail page contains 6 tabs, each documented in detail:

1. **Reminders** — Schedule future actions (insurance renewal, inspections)
2. **Maintenance** — Track service history and costs
3. **Damages** — Photo-documented damage reports by vehicle zone
4. **Documents** — Upload and manage vehicle-related files
5. **Reservations** — Calendar view + booking list with full CRUD
6. **Finance** — Revenue, expenses, depreciation, and per-vehicle analytics

## Documentation Index

- [Data Flow](./data-flow.md) — Step-by-step lifecycles for all Fleet operations
- [Components](./components.md) — Component tree and per-sub-section breakdown
- [Formulas](./formulas.md) — All calculations and derived metrics
- [State Management](./state-management.md) — Where state lives and how it propagates
- [Edge Cases](./edge-cases.md) — Error handling and safeguards
- [AI Integration](./ai-integration.md) — How Fleet data feeds the AI Assistant
- [Performance](./performance.md) — Scaling considerations and optimizations
