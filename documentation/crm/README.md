# FlitX CRM Section — System Documentation

## Table of Contents

1. [README.md](./README.md) — System context, source of truth, section index *(this file)*
2. [data-flow.md](./data-flow.md) — Step-by-step data lifecycles
3. [components.md](./components.md) — Component tree and responsibilities
4. [formulas.md](./formulas.md) — Calculations and derived metrics
5. [state-management.md](./state-management.md) — State architecture and propagation
6. [edge-cases.md](./edge-cases.md) — Error handling and safeguards
7. [ai-integration.md](./ai-integration.md) — How CRM data feeds the AI Assistant
8. [performance.md](./performance.md) — Scaling considerations and optimizations

---

## 1. What is the CRM Section?

The CRM (Customer Relationship Management) section is the **customer intelligence layer** of FlitX, accessible at `/crm`. It aggregates booking data into a unified per-customer view, tracks accident/damage history, and provides analytical charts about customer demographics, geography, and insurance profitability.

**Core purpose:** Answer the question *"Who are my customers, what is each one worth, and which segments carry the most risk?"*

It is rendered by `CRM.tsx` (page) which composes:
- A 3-chart analytics row (Accidents-by-Age, Customer Distribution, Insurance Profitability)
- A filter bar (`CRMFilterBar`)
- The customer table (`CustomerTable` + `CustomerTableRow`)
- The accident history (`AccidentHistory`)
- An "Add Accident Record" dialog (`AddAccidentDialog`) that can optionally create a linked vehicle damage entry

---

## 2. Where CRM Fits in FlitX

CRM is a **read-mostly aggregation layer** built on top of `rental_bookings`, plus a small write surface for `accidents` and (optionally) `damage_reports`.

```
┌──────────────────────────────────────────────────────────────────────┐
│                            FlitX System                              │
│                                                                      │
│  ┌──────────┐         ┌────────────────┐         ┌────────────────┐  │
│  │  Fleet   │────────▶│  Reservations  │────────▶│   customers    │  │
│  │(vehicles)│         │(rental_bookings)│ trigger │ (aggregated by │  │
│  └────┬─────┘         └───────┬────────┘ recompute│  user_id+name) │  │
│       │                       │                  └────────┬───────┘  │
│       │                       │                           │          │
│       │                       ▼                           ▼          │
│       │              ┌─────────────────┐         ┌─────────────────┐ │
│       │              │ booking_contacts│         │      CRM        │ │
│       │              │ (denorm contact │         │   (CRM.tsx)     │ │
│       │              │     fields)     │         │ table + charts  │ │
│       │              └─────────────────┘         └────────┬────────┘ │
│       │                                                   │          │
│       │           ┌───────────────────────┐               │          │
│       └──────────▶│      accidents        │◀──────────────┘          │
│                   │  (per-booking event,  │  AddAccidentDialog       │
│                   │   denormalised        │  inserts here            │
│                   │   customer_id+        │                          │
│                   │   vehicle_id)         │                          │
│                   └─────────┬─────────────┘                          │
│                             │ optional same-action insert            │
│                             ▼                                        │
│                   ┌───────────────────────┐                          │
│                   │    damage_reports     │                          │
│                   │  (independent record  │                          │
│                   │   in Fleet → Damages) │                          │
│                   └───────────────────────┘                          │
│                                                                      │
│                   ┌───────────────────────┐                          │
│                   │     AI Assistant      │                          │
│                   │  reads customers,     │                          │
│                   │  accidents, bookings  │                          │
│                   │  for risk analysis    │                          │
│                   └───────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Cross-Section Relationships

| Section | Relationship with CRM |
|---|---|
| **Fleet** | Vehicles supply the `vehicle_type` shown as colored tags in the customer table. Accidents are linked to a vehicle via the booking. The "Also record as vehicle damage" toggle in the accident dialog inserts an independent row into `damage_reports`, which appears in Fleet → Vehicle → Damages. |
| **Reservations (Bookings)** | `rental_bookings` is the upstream authoritative source. Database triggers (`recompute_customer_booking_totals`) automatically recompute `customers.total_bookings_count`, `total_lifetime_value`, `first_booking_date`, `last_booking_date` whenever a booking is inserted/updated/deleted. `booking_contacts` carries the per-booking customer contact fields (email, phone, birth_date, city, country) which feed the customer profile. |
| **Analytics (Finance)** | CRM does NOT write to `financial_records`. Booking income still flows to Finance via the booking lifecycle. The "Insurance Profitability" chart reads `booking_additional_costs` (revenue) and `accidents` (cost-to-business). |
| **Daily Program** | No direct dependency. Both read from `rental_bookings` independently. |
| **AI Assistant** | Reads `customers`, `accidents`, and `rental_bookings` to answer customer-segmentation, lifetime-value, and accident-risk questions. The Customer-Type vs Vehicle-Type relationship is intentionally served via AI rather than via a chart widget. |

---

## 3. Source of Truth per Data Type

| Data Type | Authoritative Table | Notes |
|---|---|---|
| **Customer identity & aggregates** | `customers` | One row per unique customer per user. Identity is resolved by `(user_id, name)` (and optionally email when present). Aggregates (`total_bookings_count`, `total_lifetime_value`, `total_accidents_count`, `total_accidents_amount`, `first_booking_date`, `last_booking_date`) are maintained by **DB triggers**, not by client code. |
| **Customer contact details** | `booking_contacts` (per booking) → joined back to `customers` for the most recent values shown in the table | The `customers` table itself stores `email`, `phone`, `birth_date`, `city`, `country`, `country_code` as the canonical "current" contact card; updates flow via the booking dialog and are propagated to `customers`. |
| **Accident events** | `accidents` | Each accident is bound to exactly one `booking_id`. `customer_id` and `vehicle_id` are denormalized columns automatically populated from the booking via the `sync_accident_denorm_fields` trigger. |
| **Customer-type per booking** | `rental_bookings.customer_type` | Drives the Customer Distribution pie and the customer-types tag column (a customer can be e.g. both "Family" and "Business" across different bookings). |
| **Vehicle-types per customer** | `rental_bookings.vehicle_id → vehicles.type` | Drives the Vehicle Types tag column. Aggregated in the client (`useCustomers`). |
| **Insurance revenue** | `booking_additional_costs` where `name = 'Insurance'` | Drives the revenue side of the Insurance Profitability chart. |
| **Insurance cost-to-business** | `accidents.amount_paid_by_business`, joined to the booking's `insurance_type_id → insurance_types.name_original` | Drives the cost side of Insurance Profitability. |
| **Linked vehicle damage** | `damage_reports` | Independent record. The CRM accident dialog can create one as a **non-blocking side effect**, but the two records have NO foreign key relationship. Deleting the damage does not affect the accident, and vice versa. |

### Key Principles

> **`customers` is a denormalized aggregation table.** Client code never writes to its aggregate columns. All totals are recomputed by triggers when the underlying `rental_bookings` or `accidents` rows change.

> **`accidents` and `damage_reports` are intentionally independent.** The accident report is the financial/customer-risk record. The damage report is the physical/visual vehicle record. Linking them at insert time is a UX convenience, not an architectural coupling.

---

## 4. Database Tables Used

| Table | Role in CRM |
|---|---|
| `customers` | Core entity. Read by table + charts. Aggregate columns maintained by DB triggers. |
| `rental_bookings` | Upstream source. Read for `customer_type`, `vehicle_id`, and to populate the booking selector in the accident dialog. |
| `booking_contacts` | Per-booking contact snapshot. Used to derive `customers.email/phone/birth_date/city/country`. |
| `accidents` | Insert target of `AddAccidentDialog`. Read by `AccidentHistory` and chart hook. |
| `damage_reports` | Optional insert target when the "Also record as vehicle damage" toggle is enabled. Independent record. |
| `vehicles` | Joined for `vehicles.type` (vehicle category tags) and `make`/`model` (booking selector labels). |
| `booking_additional_costs` | Read for insurance revenue (Insurance Profitability chart). |
| `insurance_types` | Joined via `rental_bookings.insurance_type_id` for insurance type name in profitability cost calc. |

All tables enforce RLS: every CRUD operation requires `auth.uid() = user_id`.

---

## 5. Database Triggers Powering CRM

These triggers run server-side and keep `customers` consistent without client coordination:

| Trigger function | Fires on | Purpose |
|---|---|---|
| `recompute_customer_booking_totals` | `rental_bookings` INSERT/UPDATE/DELETE | Recomputes `customers.total_bookings_count`, `total_lifetime_value`, `first_booking_date`, `last_booking_date`. |
| `recompute_customer_accident_totals` | `accidents` INSERT/UPDATE/DELETE | Recomputes `customers.total_accidents_count`, `total_accidents_amount` (sum of `amount_paid_by_business`). |
| `sync_accident_denorm_fields` | `accidents` INSERT (BEFORE) | Populates `accidents.customer_id` and `accidents.vehicle_id` from the parent booking. |

> Client code provides only `booking_id` when inserting an accident. The denormalized columns are filled by the database, ensuring a single point of truth.

---

## 6. Supported Languages

CRM uses `react-i18next` with translation files in `src/i18n/locales/{lang}/crm.json` for: `en`, `el`, `de`, `fr`, `it`, `es`. Damage-zone labels reuse the existing `fleet:damageCategories.*` keys. Date formatting uses `date-fns` locale objects via `getDateFnsLocale()`.

---

## 7. UI / UX Conventions Specific to CRM

- Customer numbers are displayed as `#XXXXX` (5-digit zero-padded) — same convention as booking numbers.
- The Customer Types and Vehicle Types columns render as small colored chips (`CustomerTypeTag`, `VehicleTypeTag`) so a customer who has both "Family" and "Business" bookings shows both chips.
- The "Customer Distribution" widget contains three side-by-side pies: Countries, Cities, Customer Types.
- The "Customer Type vs Vehicle Type" relationship is intentionally NOT a chart — that question is delegated to the AI Assistant, which can answer it with full natural-language context.
