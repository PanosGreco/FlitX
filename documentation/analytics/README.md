# FlitX Analytics Section — System Documentation

## Table of Contents

1. [README.md](./README.md) — System context, source of truth, section index *(this file)*
2. [data-flow.md](./data-flow.md) — Step-by-step data lifecycles
3. [components.md](./components.md) — Component tree and responsibilities
4. [formulas.md](./formulas.md) — Calculations and derived metrics
5. [state-management.md](./state-management.md) — State architecture and propagation
6. [edge-cases.md](./edge-cases.md) — Error handling and safeguards
7. [ai-integration.md](./ai-integration.md) — How financial data feeds the AI Assistant
8. [performance.md](./performance.md) — Scaling considerations and optimizations

---

## 1. What is the Analytics Section?

The Analytics section is the financial hub of FlitX, accessible at the `/finances` route. It provides fleet operators with a centralized dashboard to track all income, expenses, net profit, asset valuations, and recurring costs across their entire fleet operation.

**Core purpose:** Answer the question *"Is my fleet business making money, and where?"*

It is rendered by `Finance.tsx` (page component) → `FinanceDashboard.tsx` (main dashboard orchestrator).

---

## 2. Where Analytics Fits in FlitX

Analytics is not an isolated section — it is the **financial aggregation layer** that connects to nearly every other part of the system.

```
┌─────────────────────────────────────────────────────────────┐
│                        FlitX System                         │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  Fleet    │───▶│ Reservations │───▶│                   │  │
│  │ (vehicles)│    │ (bookings)   │    │                   │  │
│  └──────────┘    └──────────────┘    │                   │  │
│       │                │             │    ANALYTICS       │  │
│       │                │             │  (Finance.tsx)     │  │
│       ▼                ▼             │                   │  │
│  ┌──────────┐    ┌──────────────┐    │  financial_records │  │
│  │Maintenance│───▶│ financial_   │───▶│  is the single    │  │
│  │ records   │    │ records      │    │  source of truth  │  │
│  └──────────┘    └──────────────┘    │                   │  │
│                        ▲             │                   │  │
│  ┌──────────┐          │             │                   │  │
│  │Recurring │──────────┘             │                   │  │
│  │ rules    │                        └─────────┬─────────┘  │
│  └──────────┘                                  │            │
│                                                ▼            │
│  ┌──────────────────────┐         ┌────────────────────┐    │
│  │   Home Dashboard     │◀────────│   AI Assistant     │    │
│  │ (calendar, overview) │         │ (financial analysis │    │
│  │ reads rental_bookings│         │  pricing optimizer) │    │
│  └──────────────────────┘         └────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Cross-Section Relationships

| Section | Relationship with Analytics |
|---|---|
| **Fleet** | Vehicles are the entities that income/expenses are attributed to. Vehicle data (type, fuel, year) enriches financial records for categorization. Vehicle sale creates a profit/loss financial record. |
| **Reservations (Bookings)** | Creating a booking automatically generates income records in `financial_records`. Deleting a booking cascades to delete all linked financial records. |
| **Home Dashboard** | Reads `rental_bookings` for the calendar view. The same bookings that drive the calendar also drive income in Analytics. |
| **AI Assistant** | Reads `financial_records`, `rental_bookings`, `vehicle_maintenance`, and `recurring_transactions` via the `ai-chat` edge function to provide Financial Analysis and Pricing Optimizer responses. |
| **Daily Program** | Booking creation generates daily tasks (pickup/dropoff). Deleting a booking from Analytics cascades to delete these tasks. |

---

## 3. Source of Truth per Data Type

Understanding which table is authoritative for each data type is critical to avoid inconsistencies.

| Data Type | Authoritative Table | Notes |
|---|---|---|
| **All displayed income & expenses** | `financial_records` | Every financial number shown in the Analytics dashboard comes from this table. It is the **single source of truth** for all monetary display. |
| **Booking data** | `rental_bookings` | Authoritative for booking details (dates, customer, vehicle). When a booking is created, it **syncs TO** `financial_records` by inserting income records. |
| **Maintenance data** | `vehicle_maintenance` | Authoritative for maintenance details (type, date, mileage). When a maintenance expense is added via Analytics, it **syncs TO** both `financial_records` AND `vehicle_maintenance`. |
| **Recurring cost rules** | `recurring_transactions` | Stores the rule definitions (amount, frequency, dates). The rules **generate** `financial_records` entries via the `process-recurring-transactions` edge function. |
| **Asset valuations** | `user_assets` + `user_asset_categories` | Independent from `financial_records`. Tracks current asset values (vehicles, custom assets) with inline editing. |
| **Vehicle metadata** | `vehicles` | Provides `type`, `fuel_type`, `year`, `vehicle_type`, `is_sold`, `sale_date`, `purchase_date`, `daily_rate` — used to enrich and categorize financial records. |

### Key Principle

> `financial_records` is a **denormalized aggregation table**. It receives data from multiple sources (bookings, maintenance, recurring rules, manual entry, vehicle sales) and serves as the unified view for all financial display and analysis.

---

## 4. Database Tables Used

| Table | Role in Analytics |
|---|---|
| `financial_records` | Core data table — all income/expense records |
| `recurring_transactions` | Rule definitions for auto-generated records |
| `rental_bookings` | Source for booking-linked income |
| `vehicle_maintenance` | Source for maintenance-linked expenses |
| `vehicles` | Vehicle metadata for categorization |
| `user_asset_categories` | Asset category definitions |
| `user_assets` | Individual asset values |
| `profiles` | User profile data (company name, avatar) for dashboard header |

All tables have RLS policies enforcing `user_id = auth.uid()` for all CRUD operations.

---

## 5. Supported Languages

Analytics uses `react-i18next` with translation files in `src/i18n/locales/{lang}/finance.json` for:
- English (`en`)
- Greek (`el`)
- German (`de`)
- French (`fr`)
- Italian (`it`)
- Spanish (`es`)

Date formatting uses `date-fns` locale objects via `getDateFnsLocale()` from `src/utils/localeMap.ts`.
Currency formatting uses `toLocaleString()` with BCP-47 locale codes via `getBcp47Locale()`.
