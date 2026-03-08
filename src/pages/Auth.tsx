import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Building2, MapPin, ArrowLeft } from "lucide-react";
import { z } from "zod";
import AuthLayout from "@/components/auth/AuthLayout";
import { PasswordStrengthMeter } from "@/components/signup/PasswordStrengthMeter";

const COUNTRIES = [
  { value: "greece", label: "Greece" },
  { value: "italy", label: "Italy" },
  { value: "spain", label: "Spain" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
];

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupStep1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupStep2Schema = z.object({
  confirmPassword: z.string().min(1, "Please confirm your password"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  country: z.string().min(1, "Please select a country"),
  city: z.string().min(2, "City must be at least 2 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  country: z.string().min(1, "Please select a country"),
  city: z.string().min(2, "City must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form states
  const [signupName, setSignupName] = useState("");
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupCountry, setSignupCountry] = useState("");
  const [signupCity, setSignupCity] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please try again."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/", { replace: true });
    }
  };

  const handleStep1Continue = () => {
    setErrors({});
    const result = signupStep1Schema.safeParse({
      email: signupEmail,
      password: signupPassword,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    setSignupStep(2);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate step 2 fields including confirm password match
    const step2Result = signupStep2Schema.safeParse({
      confirmPassword: signupConfirmPassword,
      name: signupName,
      companyName: signupCompanyName,
      country: signupCountry,
      city: signupCity,
    });
    
    if (!step2Result.success) {
      const fieldErrors: Record<string, string> = {};
      step2Result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Check password match
    if (signupConfirmPassword !== signupPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    // Full validation as safety net
    const fullResult = signupSchema.safeParse({
      name: signupName,
      companyName: signupCompanyName,
      country: signupCountry,
      city: signupCity,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupPassword, // No confirm password field, use password directly
    });
    
    if (!fullResult.success) {
      const fieldErrors: Record<string, string> = {};
      fullResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, {
      company_name: signupCompanyName,
      country: signupCountry,
      city: signupCity,
    });
    setIsSubmitting(false);

    if (error) {
      let message = error.message;
      if (error.message.includes("already registered")) {
        message = "This email is already registered. Please log in instead.";
      }
      toast({
        title: "Sign up failed",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "You have successfully signed up and logged in.",
      });
      navigate("/", { replace: true });
    }
  };

  const handleTabSwitch = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setSignupStep(1);
    setErrors({});
    setShowPassword(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const signupHeadline = signupStep === 1 ? "Create Your FlitX Account" : "Complete Your Profile";
  const signupSubtitle = signupStep === 1 ? "Start managing your fleet in minutes" : "Tell us about your business";

  return (
    <AuthLayout>
      {/* Headline */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {activeTab === "login" ? "Welcome Back" : signupHeadline}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {activeTab === "login" ? "Sign in to your FlitX account" : signupSubtitle}
        </p>
      </div>

      {/* Step indicator for signup */}
      {activeTab === "signup" && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Step {signupStep} of 2 — {signupStep === 1 ? "Create Account" : "Complete Your Profile"}
            </span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className={`h-1 flex-1 rounded-full transition-colors ${signupStep === 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>
      )}

      {/* Login Form */}
      {activeTab === "login" ? (
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="pl-10 h-11"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="pl-10 pr-10 h-11"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      ) : signupStep === 1 ? (
        /* Signup Step 1 — Email + Password */
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleStep1Continue();
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-email"
                type="email"
                placeholder="Enter your email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="pl-10 h-11"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="pl-10 pr-10 h-11"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            <PasswordStrengthMeter password={signupPassword} />
          </div>

          <Button type="submit" className="w-full h-11 text-base">
            Create Account
          </Button>
        </form>
      ) : (
        /* Signup Step 2 — Profile */
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="signup-confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={signupConfirmPassword}
                onChange={(e) => {
                  setSignupConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => { const { confirmPassword, ...rest } = prev; return rest; });
                  }
                }}
                className="pl-10 pr-10 h-11"
                disabled={isSubmitting}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {signupConfirmPassword && signupConfirmPassword !== signupPassword && (
              <p className="text-sm text-destructive">Passwords do not match.</p>
            )}
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-name"
                type="text"
                placeholder="Enter your name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                className="pl-10 h-11"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-company">Company Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-company"
                type="text"
                placeholder="Enter your company name"
                value={signupCompanyName}
                onChange={(e) => setSignupCompanyName(e.target.value)}
                className="pl-10 h-11"
                disabled={isSubmitting}
              />
            </div>
            {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="signup-country">Country</Label>
              <Select value={signupCountry} onValueChange={setSignupCountry} disabled={isSubmitting}>
                <SelectTrigger id="signup-country" className="h-11">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-city">City</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-city"
                  type="text"
                  placeholder="Enter city"
                  value={signupCity}
                  onChange={(e) => setSignupCity(e.target.value)}
                  className="pl-10 h-11"
                  disabled={isSubmitting}
                />
              </div>
              {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>

          <button
            type="button"
            onClick={() => { setSignupStep(1); setErrors({}); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </form>
      )}

      {/* Toggle link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {activeTab === "login" ? (
          <>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => handleTabSwitch("signup")}
              className="font-semibold text-primary hover:underline"
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => handleTabSwitch("login")}
              className="font-semibold text-primary hover:underline"
            >
              Sign In
            </button>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
