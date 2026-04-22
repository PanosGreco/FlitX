# CRM — State Management

## 1. State Topology

CRM is intentionally **stateless at the global level**. There is no Context or store dedicated to CRM. State is split across three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Server (Postgres)                                │
│  ────────────────────────────────────────                   │
│  customers, rental_bookings, accidents, damage_reports,     │
│  booking_contacts, booking_additional_costs, vehicles,      │
│  insurance_types                                            │
│                                                             │
│  Aggregates on `customers` are kept consistent by triggers  │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ supabase-js queries (fetch on mount + on refresh)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2 — Hook state                                       │
│  ────────────────────────────────────────                   │
│  useCustomers      → { customers, loading, refresh }        │
│  useCRMChartData   → derived chart datasets + flags         │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ props
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3 — Component-local state                            │
│  ────────────────────────────────────────                   │
│  CRM.tsx            → filters, isAccidentDialogOpen,        │
│                       accidentRefreshKey                    │
│  CustomerTable      → sortColumn, sortDirection,            │
│                       currentPage, rowsPerPage              │
│  AddAccidentDialog  → form fields + damage toggle state     │
│  AccidentHistory    → isOpen, showAll                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. `useCustomers` Lifecycle

```
mount ──▶ fetchCustomers (initial)
                │
                ├─ SELECT customers
                ├─ SELECT rental_bookings (customer_type, vehicles.type)
                └─ SELECT accidents (total_damage_cost)
                       │
                       └─ build customer_types[], vehicle_types[],
                          total_damage_cost_sum maps
                       │
                       └─ setCustomers(rows) → consumers re-render

refresh() ─▶ setRefreshKey(k+1)
                └─ effect deps include refreshKey → fetchCustomers re-runs
```

The hook **does not subscribe** to realtime. It refreshes only via:
- Initial mount
- User session change (auth context)
- An explicit caller-driven `refresh()` (today: only after accident creation)

---

## 3. `useCRMChartData` Lifecycle

Identical pattern to `useCustomers` but issues 4 parallel queries via `Promise.all`. Re-runs only when `user` changes. **Not** rebound to `refreshKey` — the charts will reflect a freshly inserted accident only on the next page mount or user change. This is acceptable because the percentage distributions are stable across single-row insertions.

> If we ever need live-refreshing charts after accident insert, wire `useCRMChartData` to the same `refreshKey` mechanism used by `useCustomers`.

---

## 4. Update Propagation Map

| Event | What re-runs |
|---|---|
| User changes a filter | `CRM.tsx` `filteredCustomers` `useMemo` recomputes → `CustomerTable` re-renders. No queries fire. Charts are unchanged. |
| User changes sort/page in table | Local `CustomerTable` state changes; only the visible rows re-render. |
| User clicks "Add Accident Record" | `isAccidentDialogOpen = true` → dialog mounts → its own `useEffect` fetches eligible bookings. |
| Accident saved successfully | `onSuccess()` → `CRM.tsx` calls `useCustomers.refresh()` (re-fetches customer list with new accident totals from triggers) AND bumps `accidentRefreshKey` → `AccidentHistory` re-fetches. Charts will refresh on next mount. |
| Damage save fails after accident saved | Toast warning shown; CRM still refreshes (the accident is persisted). |
| User closes the dialog | `resetForm()` clears all 4 damage-section state vars and the main accident form state. |

---

## 5. Why No Realtime?

CRM data has these properties:
- **Low write frequency** — operators add a few accidents per week, not per second.
- **Single-operator-per-account model** — no multi-user concurrent editing within a single CRM page.
- **DB triggers handle consistency** — totals on `customers` are always correct after a single round-trip; no client coordination is required.

Adding `postgres_changes` subscriptions would add complexity (filter scoping, dedup, race conditions on aggregate columns) without a corresponding UX benefit. We deliberately rely on imperative refresh.

---

## 6. Side-Effects of CRM on Other Sections

| Action in CRM | Side-effect elsewhere |
|---|---|
| Insert into `accidents` | `customers.total_accidents_*` updated by trigger → reflected on next CRM fetch and in any AI prompt that reads `customers`. |
| Insert into `damage_reports` (optional, via toggle) | Visible in Fleet → `VehicleDetail` → `DamageReport` for that vehicle. |
| (No other writes) | CRM does NOT write to `financial_records`, `rental_bookings`, `customers` (other than via triggers), `vehicles`, or `daily_tasks`. |

---

## 7. Reset Semantics

`AddAccidentDialog.resetForm()` clears, in addition to the existing accident fields:
- `addDamageEntry → false`
- `damageCategory → ''`
- `damageNotes → ''`
- `damageFiles → null`

This guarantees that opening the dialog twice in a row never carries over state from the previous accident.
