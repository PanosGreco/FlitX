# Home Section — AI Integration

## Current State

The Home section has **no direct communication** with the AI Assistant. No edge function calls are made from any Home component.

## Indirect Data Flow

Home feeds the AI system indirectly through booking creation:

```
Home → CreateDialog → UnifiedBookingDialog
    │
    ▼
rental_bookings INSERT + financial_records INSERT
    │
    ▼
ai-chat edge function reads these via computeFinancialContext()
    │  - rental_bookings (12-month window) for booking metrics
    │  - financial_records for revenue/expense analysis
    │
    ▼
AI provides financial analysis, pricing optimization
```

### What AI reads (sourced from Home actions):

| Data Created via Home | Table | AI Consumption |
|---|---|---|
| Rental bookings | `rental_bookings` | `computeFinancialContext()` reads bookings for avg revenue, booking count, duration, utilization |
| Rental income records | `financial_records` (type=income) | Revenue totals, vehicle profitability |
| Additional cost records | `financial_records` (type=expense) | Variable cost per booking |
| VAT expense records | `financial_records` (type=expense) | Tax cost tracking |

### What AI does NOT read:

| Data Type | Table | Reason |
|---|---|---|
| Manual "other" tasks | `daily_tasks` (task_type=other) | AI analyzes financials, not scheduling |
| Vehicle reminders | `vehicle_reminders` | Operational, not financial |
| User notes | `user_notes` | Personal notes, not structured data |
| Task completion status | `daily_tasks.status` | Not relevant to financial analysis |

## Future Potential

Areas where Home data could enhance AI capabilities:

1. **Operational insights**: AI could read `daily_tasks` to identify busiest days of the week, peak delivery/return hours, and scheduling patterns.

2. **Reminder effectiveness**: AI could analyze `vehicle_reminders` completion rates to suggest better reminder timing or frequency.

3. **Booking-to-task gap analysis**: AI could compare `rental_bookings` with their generated `daily_tasks` to identify bookings missing operational tasks.

4. **Workload prediction**: AI could use historical task density to forecast upcoming busy periods and suggest staffing or scheduling adjustments.

Currently, none of these are implemented — the AI operates purely on financial and booking data.
