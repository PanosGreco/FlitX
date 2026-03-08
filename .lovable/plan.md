

## Plan — Password Strength, Confirmation & Default Signup View (Revised)

### Changes

#### 1. `src/pages/Auth.tsx`

- **Default to signup**: Change initial `activeTab` from `"login"` to `"signup"`
- **Step 1**: Email, Password, Password Strength Meter. `signupStep1Schema` validates only `email` + `password`. Email gets `autoFocus`.
- **Step 2**: Confirm Password (top), then Name, Company, Country, City. Step 2 schema validates `confirmPassword` matches `password` + profile fields. Name gets `autoFocus`.
- Real-time inline error on confirm password mismatch.

#### 2. `src/components/signup/PasswordStrengthMeter.tsx`

Rewrite to accept `password: string` prop and compute everything internally:
- Score 0-4 based on: length ≥ 8, uppercase, number, special character
- Animated 4-segment bar (red → yellow → green)
- Dynamic suggestion list showing unmet requirements, items disappear when satisfied
- When score = 4 (strong), show "Strong password" in green instead of suggestions

#### 3. No changes to
- Auth logic, database, AuthLayout, routing

