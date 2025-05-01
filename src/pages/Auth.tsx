
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Eye, EyeOff } from "lucide-react";
import { LanguageSwitcher } from "@/components/signup/LanguageSwitcher";
import { PasswordStrengthMeter } from "@/components/signup/PasswordStrengthMeter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Define strict schemas with proper field types
const signUpSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  businessName: z.string().min(2, { message: "Business name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  businessType: z.string().min(1, { message: "Business type is required" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;
type SignInFormValues = z.infer<typeof signInSchema>;

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "signup";
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signIn, signUp, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    // Redirect to home if already authenticated
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Use the correct form based on mode
  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      businessName: "",
      email: "",
      password: "",
      businessType: "",
    },
  });
  
  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Use the appropriate form based on current mode
  const form = mode === "signup" ? signUpForm : signInForm;

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const onSubmit = async (values: SignUpFormValues | SignInFormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const signUpValues = values as SignUpFormValues;
        await signUp(signUpValues.email, signUpValues.password, {
          full_name: signUpValues.fullName,
          business_name: signUpValues.businessName,
          business_type: signUpValues.businessType,
        });
      } else {
        const signInValues = values as SignInFormValues;
        await signIn(signInValues.email, signInValues.password);
      }
    } catch (error) {
      console.error("Auth error:", error);
      // Error is handled in the AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    navigate(`/auth?mode=${mode === "signup" ? "signin" : "signup"}`);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 md:p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "signup" ? t.signup.createAccount : t.signup.login}
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === "signup" ? t.signup.getStarted : t.signup.login}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {mode === "signup" && (
              <>
                <FormField
                  control={signUpForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signUpForm.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.signup.businessName}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.signup.enterBusinessName} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.signup.email}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t.signup.enterEmail} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.signup.password}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder={t.signup.enterPassword} 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (mode === "signup") {
                            const value = e.target.value;
                            let score = 0;
                            if (value.length > 8) score += 1;
                            if (/[A-Z]/.test(value)) score += 1;
                            if (/[0-9]/.test(value)) score += 1;
                            if (/[^A-Za-z0-9]/.test(value)) score += 1;
                            setPasswordScore(score);
                          }
                        }} 
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0" 
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </FormControl>
                  {mode === "signup" && <PasswordStrengthMeter score={passwordScore} />}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {mode === "signup" && (
              <FormField
                control={signUpForm.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.signup.businessType}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t.signup.selectBusinessType} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cars">{t.signup.carRental}</SelectItem>
                        <SelectItem value="boats">{t.signup.boatRental}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button 
              type="submit" 
              className="w-full mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Please wait..." : mode === "signup" ? t.signup.signUp : t.signup.login}
            </Button>
          </form>
        </Form>
        
        <div className="text-center text-sm">
          <p className="text-gray-600">
            {mode === "signup" ? t.signup.alreadyHaveAccount : "Don't have an account yet?"}
            {" "}
            <button 
              type="button" 
              onClick={toggleMode}
              className="text-primary hover:underline"
            >
              {mode === "signup" ? t.signup.login : t.signup.signUp}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
