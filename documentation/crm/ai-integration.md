# CRM — AI Assistant Integration

The AI Assistant (`/ai-assistant`, edge function `supabase/functions/ai-chat`) reads CRM-relevant data to answer customer-segmentation, lifetime-value, and accident-risk questions. CRM does **not** call the AI directly — instead, the AI's data-loading layer reads from the same authoritative tables CRM reads from, with strict per-user scoping.

## 1. Data Surface Exposed to AI

| Source | Used by AI for |
|---|---|
| `customers` | Per-customer aggregates: total bookings, lifetime value, accident counts, accident € paid by business, location, age (if `birth_date` known). |
| `rental_bookings` | `customer_type`, `vehicle_id` join, `total_amount`, dates — used to build the **customer-type vs vehicle-type** relationship that intentionally has no chart widget. |
| `accidents` | Per-event accident details with `customer_id`, `vehicle_id`, `payer_type`, the three split amounts, and `total_damage_cost`. |
| `booking_additional_costs` | Insurance revenue, used for risk-vs-revenue analysis per insurance type. |
| `insurance_types` | Insurance type names, joined for display in AI responses. |

All reads execute under the user's session (server-side auth claims scoping — see `mem://security/ai-assistant-isolation-hardening`). Cross-tenant leakage is structurally impossible.

## 2. Why "Customer Type vs Vehicle Type" is AI-Only

The team explicitly removed the "Customer Type vs Vehicle Type" stacked-bar chart. The relationship is more useful as a natural-language answer than as a fixed visual:

> *"Which vehicle types do my Family customers prefer?"*  
> *"Are Business customers driving up my SUV bookings?"*  
> *"What's the average ticket for Tourist customers on Vans vs Cars?"*

The AI can produce all of those from the same `rental_bookings` rows the chart would have used, plus any cross-cut the user requests. See `mem://logic/ai-business-intelligence-metrics`.

## 3. Sample Question Patterns

| Question | Tables consulted |
|---|---|
| "Who are my top 5 customers by lifetime value?" | `customers` (already aggregated by triggers) |
| "Which customer caused the most damage cost?" | `customers.total_damage_cost_sum` proxy via `accidents` join |
| "What's my net profit on Full Coverage insurance?" | `booking_additional_costs` (revenue) − `accidents.amount_paid_by_business` joined to `insurance_types` |
| "What % of accidents come from drivers under 30?" | `accidents` JOIN `customers.birth_date`; same buckets as the chart |
| "Do Family customers prefer Camper or Car rentals?" | `rental_bookings` (`customer_type` × `vehicles.type`) |

## 4. AI Sanity Checks Relevant to CRM

The AI's deterministic processing layer (see `mem://logic/ai-financial-analysis-validation`) flags suspicious CRM-derived values to prevent hallucinated insights:

- A single customer with `total_lifetime_value > 10×` the median is flagged as a possible duplicate or test record.
- An accident with `total_damage_cost = 0` is excluded from age/insurance aggregates.
- A customer with `accident_count > booking_count` is flagged as a data anomaly (should be impossible).

## 5. What the AI Does NOT Do

- The AI **never writes** to `customers`, `accidents`, or `damage_reports`.
- The AI **never modifies** filter state in CRM.tsx — it cannot drive UI; it only reports.
- The AI is **not** invoked from any CRM component. CRM is a pure read/CRUD UI; AI is a separate page.

## 6. Privacy Posture

- AI prompts are stored per user in `ai_chat_messages` (`mem://features/ai-assistant-persistence-layer`).
- Customer PII (names, emails, phones, birth dates) sent to the AI is the user's own data; cross-account leakage is blocked at the RLS + edge function auth boundary.
- The AI sees the same `customers.email/phone` the user sees in their own table — it does not expand the data surface beyond what the user can already query.
