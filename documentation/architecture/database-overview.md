# Database Overview — How FlitX Stores Data

This document explains how FlitX's database works at a conceptual level. No prior database experience is assumed.

---

## 1. The Filing Cabinet Mental Model

Think of the database as an office full of **filing cabinets**:

- Each **cabinet** = a **table** (e.g., "vehicles", "rental_bookings")
- Each **folder** inside a cabinet = a **row** (e.g., one specific vehicle, one specific booking)
- Each **field on a folder's label** = a **column** (e.g., "make", "model", "year")

FlitX's main filing cabinets (tables):

| Table | Purpose |
|---|---|
| `vehicles` | Every vehicle in the fleet — make, model, year, daily rate, status, etc. |
| `rental_bookings` | Every rental booking — customer name, dates, vehicle, amount |
| `booking_contacts` | Customer contact info — email, phone, birth date, city, country |
| `financial_records` | Every income and expense record — amount, category, date, linked vehicle/booking |
| `daily_tasks` | Daily program tasks — deliveries, returns, and custom tasks |
| `vehicle_maintenance` | Service history — type, date, cost per maintenance event |
| `damage_reports` | Photo-documented damage — zone, description, images |
| `vehicle_reminders` | Scheduled reminders — title, due date, completion status |
| `vehicle_documents` | Uploaded files — insurance papers, registration docs, etc. |
| `vehicle_images` | Additional photos per vehicle (beyond the primary image) |
| `camper_features` | Camper/motorhome-specific attributes — sleeping capacity, water tanks, amenities |
| `profiles` | User profile data — name, company, avatar, language preference |
| `ai_chat_conversations` | AI assistant conversation threads |
| `ai_chat_messages` | Individual messages within AI conversations |
| `recurring_transactions` | Rules for automatically generating periodic income/expense records |
| `price_seasons` | Seasonal pricing periods — date ranges and pricing modes |
| `price_season_rules` | Pricing adjustments per season — percentage or fixed amount changes |
| `user_assets` | Tracked assets for the finance dashboard — vehicles, equipment, property |

---

## 2. Primary Keys — The Unique ID on Every Folder

Every row in every table has a **unique identifier** called the **primary key**. In FlitX, primary keys are **UUIDs** — long random strings that look like this:

```
a7b3c9d1-4e5f-6789-abcd-ef0123456789
```

**The rule:** No two rows in the same table can ever share the same primary key. This is enforced by the database itself — if you tried to insert a duplicate, the database would reject it.

**Example — a row in the `vehicles` table:**

| id (primary key) | make | model | year |
|---|---|---|---|
| `a7b3c9d1-4e5f-...` | Toyota | Corolla | 2023 |

The `id` column is the primary key. It uniquely identifies this specific vehicle across the entire system.

---

## 3. Foreign Keys — The Pointer from One Folder to Another

When one row needs to reference another row in a **different** table, it doesn't copy all that data. Instead, it stores only the **other row's primary key**. This reference is called a **foreign key**.

**Why?** Because of the **single source of truth** principle — each piece of data should live in exactly one place.

**Concrete example:**

A `rental_bookings` row has a `vehicle_id` column that points to the `vehicles` table:

```
VEHICLES table                       RENTAL_BOOKINGS table
┌────────────────────┐               ┌─────────────────────────┐
│ id: a7b3c9d1...    │←──────────────│ vehicle_id: a7b3c9d1... │
│ make: Toyota       │               │ customer_name: John     │
│ model: Corolla     │               │ start_date: 2026-04-15  │
│ year: 2023         │               │ end_date: 2026-04-20    │
└────────────────────┘               └─────────────────────────┘
```

The booking doesn't store "Toyota Corolla 2023" — it stores only the vehicle's ID. When the app needs to display "Toyota Corolla 2023" on a booking, the database "stitches" the two tables together via a **JOIN** operation.

---

## 4. Why This Matters — The Single Source of Truth

Imagine if every booking stored "Toyota Corolla 2023" as text instead of a foreign key. Now imagine the user realizes the vehicle is actually a 2024 model and corrects it in the vehicles table. Every booking would still say "2023" — they'd all be wrong.

With foreign keys, the vehicle's data lives in exactly **one place** (the `vehicles` table). Every booking just points to it. Fix the vehicle data once, and every booking automatically shows the corrected information.

FlitX's entire database follows this principle.

---

## 5. ON DELETE CASCADE

When you delete a "parent" row (like a booking), what should happen to the "child" rows that point to it (like the booking's contact info, tasks, and financial records)?

**CASCADE** means: automatically delete the children too. This prevents **orphan data** — child rows left pointing to a parent that no longer exists.

**FlitX's cascade rules** (verified from database migrations):

| Parent Table | Child Table | On Delete Behavior |
|---|---|---|
| `vehicles` | `rental_bookings` | CASCADE — deleting a vehicle deletes all its bookings |
| `vehicles` | `vehicle_maintenance` | CASCADE |
| `vehicles` | `vehicle_reminders` | CASCADE |
| `vehicles` | `vehicle_documents` | CASCADE |
| `vehicles` | `vehicle_images` | CASCADE |
| `vehicles` | `damage_reports` | CASCADE |
| `vehicles` | `camper_features` | CASCADE |
| `vehicles` | `maintenance_blocks` | CASCADE |
| `vehicles` | `financial_records` | SET NULL — record kept, `vehicle_id` set to null |
| `vehicles` | `recurring_transactions` | SET NULL |
| `vehicles` | `price_season_rules` | CASCADE |
| `vehicles` | `user_reminders` | SET NULL |
| `rental_bookings` | `booking_contacts` | CASCADE |
| `rental_bookings` | `booking_additional_info` | CASCADE |
| `rental_bookings` | `booking_additional_costs` | CASCADE |
| `rental_bookings` | `financial_records` | SET NULL — record kept, `booking_id` set to null |
| `rental_bookings` | `damage_reports` | SET NULL |
| `price_seasons` | `price_season_rules` | CASCADE |
| `additional_info_categories` | `booking_additional_info` | CASCADE |
| `additional_cost_categories` | `booking_additional_costs` | SET NULL |
| `user_asset_categories` | `user_assets` | CASCADE |
| `ai_chat_conversations` | `ai_chat_messages` | CASCADE |

**SET NULL** means: don't delete the child, but clear its pointer to the deleted parent. This is used when the child record has independent value (e.g., a financial record should survive even if the vehicle is deleted).

---

## 6. Row-Level Security (RLS) in One Page

Row-Level Security (RLS) is a rule system built into the database itself that says:

> "User X can only see rows where `user_id` matches their own ID."

This is enforced at the **database level**, not the application level. Even if an attacker somehow bypassed the app's code and sent a direct query to the database, the database itself would refuse to return data belonging to other users.

**How it works in FlitX:**

1. Every table has a `user_id` column
2. Every table has an RLS policy that checks `auth.uid() = user_id`
3. When the app makes a query, the database automatically filters: "Only return rows where `user_id` matches the currently logged-in user"

This means:
- User A cannot see User B's vehicles, bookings, financial records, or any other data
- User A cannot modify or delete User B's data
- This protection works even if the app's front-end code has a bug

RLS is one of the strongest security guarantees in FlitX's architecture.
