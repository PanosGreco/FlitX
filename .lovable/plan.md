
# Finance Overview Layout Reorganization & New Vehicle Averages Metrics

## Overview

This plan reorganizes the Finance Overview section into a clean 3x2 grid layout and adds a new "Vehicle Daily Performance Averages" box with per-vehicle rental and cost metrics.

---

## Current State

The current layout has:
- **Top Row**: Total Revenue | Total Expenses | Net Income (3 columns)
- **Second Row**: Purchase Value + Remaining for Depreciation | Value Loss Over Time (2 columns, with odd margin)

**Issues to fix:**
1. The second row has inconsistent alignment (only 2 cards instead of 3)
2. The Purchase/Depreciation card has an odd `mx-[137px]` margin
3. No performance averages are displayed

---

## Target Layout

```text
┌────────────────────┬────────────────────┬────────────────────┐
│   Total Revenue    │   Total Expenses   │     Net Income     │
└────────────────────┴────────────────────┴────────────────────┘
┌────────────────────┬────────────────────┬────────────────────┐
│  Purchase Value +  │ Vehicle Averages   │  Value Loss Over   │
│  Remaining Deprec  │  (NEW BOX)         │  Time              │
└────────────────────┴────────────────────┴────────────────────┘
```

---

## Implementation Details

### 1. Layout Structure Changes

**File: `src/components/fleet/VehicleFinanceTab.tsx`**

Change the second row from `md:grid-cols-2` to `md:grid-cols-3` and remove the odd margin from the Purchase Value card:

```typescript
// Before:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card className="... mx-[137px]">  // Odd margin

// After:
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card className="...">  // No margin, same width as other cards
```

---

### 2. New Data Fetching

Add fetching for:
1. **Rental bookings** for this vehicle (to calculate booked days)
2. **User profile** (to get `created_at` for registration date)

```typescript
// New state variables
const [vehicleBookings, setVehicleBookings] = useState<Booking[]>([]);
const [userRegistrationDate, setUserRegistrationDate] = useState<Date | null>(null);

// Fetch in useEffect
const fetchVehicleBookings = async () => {
  const { data } = await supabase
    .from('rental_bookings')
    .select('start_date, end_date, total_amount')
    .eq('vehicle_id', vehicleId);
  setVehicleBookings(data || []);
};

const fetchUserProfile = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('user_id', userId)
    .single();
  if (data) {
    setUserRegistrationDate(new Date(data.created_at));
  }
};
```

---

### 3. Calculation Logic

#### A. Total Booked Days
```typescript
const calculateTotalBookedDays = (bookings: Booking[]): number => {
  return bookings.reduce((total, booking) => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const days = Math.max(1, differenceInDays(end, start) + 1); // Inclusive
    return total + days;
  }, 0);
};
```

#### B. Days Since Registration
```typescript
const getDaysSinceRegistration = (registrationDate: Date | null): number => {
  if (!registrationDate) return 0;
  return Math.max(1, differenceInDays(new Date(), registrationDate) + 1);
};
```

#### C. Average Metrics
```typescript
const totalBookedDays = calculateTotalBookedDays(vehicleBookings);
const daysSinceRegistration = getDaysSinceRegistration(userRegistrationDate);

// Average Rental Price = Total Income / Total Booked Days
const avgRentalPrice = totalBookedDays > 0 
  ? totalRevenue / totalBookedDays 
  : null;

// Average Income per Day = Total Income / Days Since Registration
const avgIncomePerDay = daysSinceRegistration > 0 
  ? totalRevenue / daysSinceRegistration 
  : 0;

// Average Cost per Day = Total Expenses / Days Since Registration
const avgCostPerDay = daysSinceRegistration > 0 
  ? totalExpenses / daysSinceRegistration 
  : 0;
```

---

### 4. New Vehicle Averages Card UI

```tsx
<Card className="border-border bg-card h-[106px] overflow-hidden">
  <CardContent className="p-4 h-full flex flex-col justify-center">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
      <BarChart3 className="h-3.5 w-3.5" />
      <span className="text-[10px] font-medium uppercase tracking-wide">
        {language === 'el' ? 'Μέσοι Όροι Οχήματος' : 'Vehicle Averages'}
      </span>
    </div>
    
    <div className="space-y-1">
      {/* Average Rental Price */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {language === 'el' ? 'Μ.Ο. Τιμή Ενοικίασης' : 'Avg Rental Price'}
        </span>
        <span className="font-medium">
          {avgRentalPrice !== null 
            ? `€${avgRentalPrice.toFixed(2)}/day` 
            : '—'}
        </span>
      </div>
      
      {/* Average Income per Day */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {language === 'el' ? 'Μ.Ο. Έσοδα/Ημέρα' : 'Avg Income/Day'}
        </span>
        <span className="font-medium text-green-600">
          €{avgIncomePerDay.toFixed(2)}
        </span>
      </div>
      
      {/* Average Cost per Day */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {language === 'el' ? 'Μ.Ο. Κόστος/Ημέρα' : 'Avg Cost/Day'}
        </span>
        <span className="font-medium text-red-600">
          €{avgCostPerDay.toFixed(2)}
        </span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### 5. Card Positioning (Second Row Order)

The second row will have this exact order:

| Position | Card | Description |
|----------|------|-------------|
| **Left** (under Total Revenue) | Purchase Value + Remaining Depreciation | Existing card, remove `mx-[137px]` |
| **Middle** (under Total Expenses) | Vehicle Averages | NEW card with 3 metrics |
| **Right** (under Net Income) | Value Loss Over Time | Existing card, unchanged |

---

### 6. Height Consistency

All three cards in the second row will have:
- Fixed height: `h-[106px]` (matches top row cards)
- `overflow-hidden` to prevent content expansion
- Same card styling for visual consistency

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/fleet/VehicleFinanceTab.tsx` | Add booking/profile fetching, calculations, new averages card, adjust grid to 3 columns |

---

## Edge Cases Handled

1. **No bookings yet**: Display `—` for Average Rental Price
2. **New user (0 days)**: Use minimum of 1 day to prevent division by zero
3. **No expenses**: Show €0.00 for cost metrics
4. **Greek/English**: All labels have bilingual support

---

## Expected Visual Result

The finance section will show:
- **Row 1**: Revenue (green) | Expenses (red) | Net Income (blue/orange)
- **Row 2**: Purchase + Depreciation Progress | Vehicle Performance Averages | Value Loss Over Time

All cards will be:
- Same height (106px)
- Same width (1/3 of container each)
- Properly aligned in a clean 3x2 grid
