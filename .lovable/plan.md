

## Plan — Auth Pages UI Enhancement (Revised)

### Files to Create/Modify

1. **Create `src/components/auth/AuthLayout.tsx`** — Reusable two-column layout
2. **Modify `src/pages/Auth.tsx`** — Use AuthLayout, replace tabs with link toggle, update headlines

---

### 1. AuthLayout Component

New reusable component accepting `children` (the form content).

Structure:
```text
┌──────────────────────┬──────────────────────┐
│  LEFT (form area)    │  RIGHT (marketing)   │
│  children prop       │  Blue gradient panel │
│                      │  FlitX messaging     │
│                      │  Dashboard mockups   │
└──────────────────────┴──────────────────────┘
```

- Desktop (`lg+`): `grid grid-cols-2`, both columns visible
- Mobile (`<lg`): single column stack — form first, marketing panel below with reduced padding
- Left column: white/background, centered form with max-width constraint, FlitX logo top-left
- Right column: `bg-gradient-to-br from-blue-600 to-blue-800`, rounded-2xl (with margin on desktop), contains marketing text + decorative cards

**Marketing panel content:**
- Headline: "Manage Your Rental Fleet in One Place"
- Subtitle: "Automate bookings, track vehicles, and monitor revenue with FlitX — the modern operating system for rental businesses."
- Three decorative CSS cards:
  - "Today's Revenue" — €2,450 with green arrow
  - "Active Vehicles" — 24 with a car icon
  - "Bookings This Week" — 18 with calendar icon
- Cards are static/decorative only, no real data

---

### 2. Auth.tsx Updates

- Remove the `<Card>` + `<Tabs>` wrapper
- Wrap everything in `<AuthLayout>`
- Replace tabs with conditional rendering based on `activeTab` state
- Add toggle link at bottom: "Already have an account? **Sign In**" / "Don't have an account? **Sign Up**"

**Headlines:**
- Signup: `<h1>Create Your FlitX Account</h1>` + subtitle "Start managing your fleet in minutes"
- Login: `<h1>Welcome Back</h1>` + subtitle "Sign in to your FlitX account"

All form fields, validation, handlers, schemas remain exactly as-is.

---

### No Changes To
- Authentication logic, signIn/signUp calls, zod schemas
- Form fields or validation
- Database or routing

