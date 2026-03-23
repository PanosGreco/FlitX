# Daily Program — AI Integration

## Current State

The Daily Program's data (`daily_tasks` table) is **NOT currently consumed** by the AI Assistant.

### What the AI reads
The `computeFinancialContext()` function in the `ai-chat` edge function reads:
- `vehicles` — vehicle attributes and fleet composition
- `rental_bookings` — booking history (last 12 months)
- `vehicle_maintenance` — maintenance costs (last 12 months)
- `recurring_transactions` — fixed cost rules

It does **NOT** read `daily_tasks`.

### Indirect Connection

Bookings that generate daily tasks also generate `financial_records`. The AI consumes the financial records, not the tasks themselves. The connection is:

```
Booking Created
  ├── daily_tasks (delivery + return)     ← NOT read by AI
  └── financial_records (income/expense)  ← READ by AI
```

The AI sees the financial impact of bookings but has no visibility into:
- Task completion rates
- Operational scheduling
- Time-based workload distribution
- Location patterns

---

## Future Potential

### Workload Analysis
AI could analyze `daily_tasks` to identify:
- **Busiest days of the week**: aggregate task counts by day-of-week
- **Peak hours**: aggregate by `due_time` to find delivery/return concentration
- **Seasonal patterns**: task volume trends across months

### Operational Efficiency
By reading `daily_tasks.status` and timestamps:
- **Task completion rate**: `completed / total` per day/week
- **Missed tasks**: tasks that remain `pending` past their `due_date`
- **Average tasks per day**: workload baseline

### Location Intelligence
If `daily_tasks.location` data is consistent:
- **Common pickup/dropoff points**: frequency analysis
- **Route optimization suggestions**: cluster nearby deliveries/returns

### Staffing Insights
- **Concurrent task detection**: multiple tasks at the same `due_time`
- **Workload forecasting**: predict task volume based on booking patterns

---

## Implementation Notes

To add AI consumption of Daily Program data, the `ai-chat` edge function would need:
1. A new query: `SELECT * FROM daily_tasks WHERE user_id = $1 AND due_date >= $2`
2. Pre-computation of operational metrics (task counts, completion rates)
3. A new context section in the AI prompt string
4. This would be a separate action type (e.g., `operational_analysis`) rather than modifying `financial_analysis`

---

## Key Distinction

> **Daily Program is NOT financial.** It is operational.
> 
> It does not track money, revenue, or costs. It tracks **actions** — what needs to happen, when, and where. Its value to AI lies in operational insights, not financial analysis.
