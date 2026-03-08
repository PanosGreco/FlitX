

## Plan — Progressive Two-Step Signup Flow (Final)

### Changes — `src/pages/Auth.tsx` only

**1. New state**: `signupStep: 1 | 2`, reset to 1 on tab switch.

**2. Step 1** — Email + Password only. Button: "Create Account". Validates with `signupStep1Schema` (email + password). No confirm password. Email input gets `autoFocus`.

**3. Step 2** — Name, Company, Country, City. Button: "Complete Setup". "Back" link returns to step 1. Name input gets `autoFocus`. On submit: validates step 2 fields, then calls existing `handleSignup`.

**4. Step indicator** — "Step 1 of 2" / "Step 2 of 2" label + progress bar above the form fields (signup only).

**5. Headlines** — Step 1: "Create Your FlitX Account" / Step 2: "Complete Your Profile".

**6. No changes to**: AuthLayout, auth logic, database, routing.

