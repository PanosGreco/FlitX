# Daily Program — System Documentation

## Overview

The Daily Program is the **operational execution layer** of FlitX. While Reservations serve as the planning layer and Fleet as the asset layer, the Daily Program transforms bookings into actionable, date-specific tasks that operators execute in the real world.

- **Route**: `/daily-program`
- **Page component**: `DailyProgram.tsx`
- **Primary table**: `daily_tasks`

## System Role

```
Reservations (Planning)  →  Daily Program (Execution)  →  Real-world action
       ↓                          ↑
  rental_bookings  ──────→  daily_tasks
       ↓                          ↑
     Fleet (Assets)  ─────→  vehicles referenced
```

The Daily Program answers one question: **"What needs to happen today?"**

It does NOT manage finances, vehicle attributes, or booking lifecycle — it only manages the physical actions derived from those systems.

## Three-Column Layout

The Daily Program organizes tasks into three operational categories:

| Column | Task Type | Source |
|--------|-----------|--------|
| **Drop-Offs** | `return` | Auto-generated from booking `end_date` |
| **Pick-Ups** | `delivery` | Auto-generated from booking `start_date` |
| **Other Tasks** | `other` | Manually created by user |

## Task Ownership Model

Every task in `daily_tasks` has:

| Field | Purpose | Required |
|-------|---------|----------|
| `booking_id` | Links to source booking | Only for delivery/return |
| `vehicle_id` | Links to vehicle involved | Required for delivery/return, optional for other |
| `user_id` | Owner of the task | Always required |
| `task_type` | `delivery` / `return` / `other` | Always required |
| `due_date` | Date the task should be executed | Always required |
| `due_time` | Time of execution | Optional |
| `location` | Where the action happens | Optional |
| `contract_path` | Path to contract photo in storage | Optional |
| `status` | `pending` / `in_progress` / `completed` / `cancelled` | Default: `pending` |
| `priority` | `low` / `medium` / `high` / `urgent` | Default: `medium` |

## Source of Truth

- `daily_tasks` = authoritative for task scheduling, status, and execution details
- `rental_bookings` = upstream source that generates delivery/return tasks (enrichment data: fuel level, payment status, customer name)
- `vehicles` = referenced for vehicle name display (joined via `vehicle_id`)
- `booking_additional_info` + `additional_info_categories` = supplementary booking metadata displayed on task cards

## System Connections

### Fleet → Daily Program
- Vehicles referenced in tasks via `vehicle_id`
- Vehicle name displayed on delivery/return task cards
- Sold vehicles (`is_sold = true`) excluded from AddTaskDialog vehicle selector

### Reservations → Daily Program
- Booking creation auto-generates 2 tasks: delivery (start_date) + return (end_date)
- Booking deletion cascades to delete linked tasks
- Booking data (customer name, fuel level, payment status) enriches task display

### Home → Daily Program
- Home's `TimelineCalendar` displays the same `daily_tasks` data
- Home's `RemindersWidget` links to `/daily-program` via navigation button
- Tasks are independently fetched by both sections (no shared state)

### Analytics → Daily Program (Indirect)
- Daily Program has no direct connection to `financial_records`
- Bookings that generate tasks also generate financial records — the link is through `rental_bookings`, not through `daily_tasks`

### AI Assistant → Daily Program
- `daily_tasks` is NOT currently consumed by the AI Assistant
- AI reads `rental_bookings` and `vehicle_maintenance` via `computeFinancialContext()` — task-level data is not included

## Task Types Definition

### `delivery` (Pick-Up)
- Auto-generated when a booking is created
- `due_date` = `booking.start_date`
- `due_time` = `booking.pickup_time`
- `location` = `booking.pickup_location`
- Vehicle is mandatory
- Title derived from vehicle name

### `return` (Drop-Off)
- Auto-generated when a booking is created
- `due_date` = `booking.end_date`
- `due_time` = `booking.return_time`
- `location` = `booking.dropoff_location`
- Vehicle is mandatory
- Title derived from vehicle name

### `other` (Manual Task)
- Created manually by user via AddTaskDialog
- Title is mandatory and user-defined
- Vehicle is optional
- Location field is NOT shown in creation form
- No booking linkage

## Sub-Documents

| Document | Content |
|----------|---------|
| [data-flow.md](./data-flow.md) | Task generation, update, delete lifecycles |
| [components.md](./components.md) | Component tree and responsibilities |
| [formulas.md](./formulas.md) | Sorting, pagination, title derivation rules |
| [state-management.md](./state-management.md) | Hook logic, state ownership, refresh patterns |
| [edge-cases.md](./edge-cases.md) | Error handling, empty states, edge cases |
| [ai-integration.md](./ai-integration.md) | AI relationship and future potential |
| [performance.md](./performance.md) | Query efficiency, rendering, scalability |
