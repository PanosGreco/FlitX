
# Transmission Type - End-to-End Implementation Plan

## Overview

This plan adds **Transmission Type** (Manual / Automatic) as a first-class vehicle attribute across the entire FlitX system, including database schema, UI components, filters, calendar booking logic, and AI Assistant awareness.

---

## Database Changes

### Schema Migration

Add a new column to the `vehicles` table:

```sql
ALTER TABLE public.vehicles 
ADD COLUMN transmission_type text NOT NULL DEFAULT 'manual'
CONSTRAINT transmission_type_check CHECK (transmission_type IN ('manual', 'automatic'));
```

**Column Details:**
- Type: `text` with check constraint
- Values: `manual`, `automatic`
- Default: `manual` (for backward compatibility with existing vehicles)
- NOT NULL: Yes (mandatory field going forward)

---

## File-by-File Implementation

### 1. Constants File (NEW)

**File:** `src/constants/transmissionTypes.ts`

Create a centralized constants file for transmission type definitions:

```text
- TRANSMISSION_TYPES constant array: ['manual', 'automatic']
- TRANSMISSION_TYPE_LABELS with bilingual labels (English/Greek)
- getTransmissionTypeLabel(type, language) helper function
```

---

### 2. Vehicle Card Component

**File:** `src/components/fleet/VehicleCard.tsx`

**Changes:**
- Add `transmissionType?: string` to the `VehicleData` interface
- Display transmission type in the vehicle info line alongside category, fuel type, and passenger capacity
- Add bilingual labels using the constants file
- Use a compact icon + text format (e.g., gear icon or just text)

**UI Placement:**
```text
{category} • {licensePlate} • {fuelType} • {passengerCapacity} • {transmissionType}
```

---

### 3. Vehicle Details Page

**File:** `src/components/fleet/VehicleDetails.tsx`

**Changes:**
- Display transmission type in the vehicle header info section
- Add it after fuel type and passenger capacity
- Format: `Manual` or `Automatic` with bilingual support

---

### 4. Edit Vehicle Dialog

**File:** `src/components/fleet/EditVehicleDialog.tsx`

**Changes:**
- Add `transmissionType` to the component's props interface
- Add state: `const [transmissionType, setTransmissionType] = useState(vehicle.transmission_type || 'manual')`
- Add a dropdown/select field for transmission type selection between Fuel Type and Passenger Capacity fields
- Include in the `handleSave` update query
- Add bilingual labels

**UI Field:**
```text
Label: "Transmission Type" / "Τύπος Κιβωτίου"
Options: Manual/Χειροκίνητο, Automatic/Αυτόματο
```

---

### 5. Fleet Page - Add Vehicle Dialog

**File:** `src/pages/Fleet.tsx`

**Changes:**
- Add form state: `const [transmissionType, setTransmissionType] = useState<string>("manual")`
- Add transmission type select field in the form (after fuel type)
- Include in `resetForm()` function
- Include in the `supabase.from('vehicles').insert({...})` call
- Use bilingual labels from constants

**Form Position:** Between Fuel Type and Passenger Capacity selectors

---

### 6. Vehicle Filter Panel

**File:** `src/components/fleet/VehicleFilterPanel.tsx`

**Changes:**
- Add `transmissionTypes: string[]` to `VehicleFilters` interface
- Add `TRANSMISSION_TYPES` constant import
- Add transmission type filter section with checkboxes (similar to fuel type)
- Add `handleTransmissionTypeToggle` function
- Update `hasActiveFilters` check
- Update `clearFilters` to reset `transmissionTypes: []`

**Filter UI:**
```text
Label: "Transmission" / "Κιβώτιο"
Options: [x] Manual [x] Automatic
```

---

### 7. Vehicle Grid Component

**File:** `src/components/fleet/VehicleGrid.tsx`

**Changes:**
- Update filtering logic to include transmission type filter
- Add filter condition: `if (filters.transmissionTypes.length > 0) { ... }`

---

### 8. Unified Booking Dialog

**File:** `src/components/booking/UnifiedBookingDialog.tsx`

**Changes:**
- Add `transmission_type` to the Vehicle interface
- Add `transmissionTypeFilter` state: `useState<string[]>([])`
- Add transmission type filter UI in the vehicle filter popover (alongside fuel type and vehicle type)
- Update `filteredAndSortedVehicles` to filter by transmission type
- Display transmission type in vehicle selection list items

**Filter Logic:**
```typescript
if (transmissionTypeFilter.length > 0) {
  filtered = filtered.filter(v => 
    v.transmission_type && transmissionTypeFilter.includes(v.transmission_type)
  );
}
```

---

### 9. AI Chat Edge Function

**File:** `supabase/functions/ai-chat/index.ts`

**Changes:**

#### A. Vehicle Interface Update
Add to the `Vehicle` interface:
```typescript
transmission_type?: string; // 'manual' or 'automatic'
```

#### B. Fleet Grouping by Transmission Type
Add a new section similar to `FleetByFuelType`:

```typescript
interface FleetByTransmissionType {
  transmissionType: string;
  count: number;
  vehicles: string[];
  maintenanceCost: number;
  maintenanceRecords: number;
}
```

#### C. Business Context Builder
- Create `vehicleTransmissionMap`
- Build `fleetByTransmissionType` aggregation
- Add maintenance cost breakdowns by transmission type
- Include in the returned context object

#### D. System Prompt Section
Add new section:
```text
═══════════════════════════════════════════════════════════
FLEET BY TRANSMISSION TYPE
═══════════════════════════════════════════════════════════
• MANUAL: X vehicles (Vehicle1, Vehicle2, ...)
  - Maintenance: €XXX from Y records
• AUTOMATIC: X vehicles (Vehicle3, Vehicle4, ...)
  - Maintenance: €XXX from Y records

USE THIS SECTION when user asks about "manual vehicles", "automatic cars", 
"transmission type comparison", etc.
```

#### E. Behavioral Rules
Add Rule 14:
```text
14. TRANSMISSION TYPE FILTERING RULES:
    • "manual vehicles" / "automatic cars" = use FLEET BY TRANSMISSION TYPE section
    • Never claim transmission data is unavailable - it IS provided
    • Filter maintenance/expenses by transmission type group
```

#### F. Data Dictionary Update
Add to the data dictionary:
```text
• "manual" / "stick shift" = vehicles with manual transmission
• "automatic" / "auto" = vehicles with automatic transmission
```

---

## Technical Summary

### Files to Modify

| File | Type of Change |
|------|----------------|
| Database migration | Add `transmission_type` column |
| `src/constants/transmissionTypes.ts` | NEW FILE - constants |
| `src/components/fleet/VehicleCard.tsx` | Add to interface & display |
| `src/components/fleet/VehicleDetails.tsx` | Add to header display |
| `src/components/fleet/EditVehicleDialog.tsx` | Add form field |
| `src/pages/Fleet.tsx` | Add to create form |
| `src/components/fleet/VehicleFilterPanel.tsx` | Add filter option |
| `src/components/fleet/VehicleGrid.tsx` | Update filter logic |
| `src/components/booking/UnifiedBookingDialog.tsx` | Add filter for bookings |
| `supabase/functions/ai-chat/index.ts` | Add AI awareness & analytics |

### Backward Compatibility

- Default value `'manual'` ensures existing vehicles remain valid
- UI gracefully handles missing transmission data with fallback
- AI Assistant uses `|| 'unknown'` pattern for null safety

---

## AI Assistant Test Questions

After implementation, verify with these test questions:

1. **"How many manual vehicles do I have?"**
   - Expected: Returns count from FLEET BY TRANSMISSION TYPE section

2. **"What are the total maintenance costs for automatic vehicles?"**
   - Expected: Returns pre-computed maintenance cost for automatic transmission group

3. **"Compare net profit between manual and automatic cars."**
   - Expected: Filters vehicle profitability by transmission type and compares

4. **"Which transmission type has more bookings?"**
   - Expected: Compares booking counts aggregated by transmission type

5. **"Show me my diesel automatic SUVs."**
   - Expected: Cross-filters by fuel type, transmission type, and category
