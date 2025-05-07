
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
import { useTestMode } from "@/contexts/TestModeContext";
import { toast } from "sonner";

// Define less strict schemas for testing
const signUpSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required" }),
  businessName: z.string().min(1, { message: "Business name is required" }),
  email: z.string().min(1, { message: "Email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  businessType: z.string().min(1, { message: "Business type is required" }),
});

const signInSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }),
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
  const { isTestMode, enableTestMode } = useTestMode();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    // Redirect if user is authenticated or in test mode
    if (user || isTestMode) {
      navigate("/");
    }
  }, [user, isTestMode, navigate]);

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
        console.log("Signing up with:", signUpValues);
        
        try {
          await signUp(signUpValues.email, signUpValues.password, {
            full_name: signUpValues.fullName,
            business_name: signUpValues.businessName,
            business_type: signUpValues.businessType,
          });
          
          // For testing - auto-redirect to home page even if signup fails
          toast.success("Testing account created");
          navigate('/');
        } catch (error: any) {
          console.error("Signup error:", error);
          // For testing - allow access anyway
          toast.success("Testing mode enabled - redirecting to home");
          setTimeout(() => navigate('/'), 1000);
        }
      } else {
        const signInValues = values as SignInFormValues;
        console.log("Signing in with:", signInValues);
        
        try {
          await signIn(signInValues.email, signInValues.password);
        } catch (error: any) {
          console.error("Signin error:", error);
          // For testing - allow access anyway
          toast.success("Testing mode enabled - redirecting to home");
          setTimeout(() => navigate('/'), 1000);
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Authentication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    navigate(`/auth?mode=${mode === "signup" ? "signin" : "signup"}`);
    form.reset();
  };

  const handleEnableTestMode = () => {
    enableTestMode();
    toast.success("Test mode enabled - bypassing authentication");
    navigate('/');
  };

  // For debugging
  console.log("Current form values:", form.getValues());
  console.log("Current mode:", mode);

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
                    <Input 
                      type="email" 
                      placeholder={t.signup.enterEmail} 
                      {...field} 
                    />
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
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full mt-2"
              onClick={handleEnableTestMode}
            >
              Enter Test Mode (Skip Authentication)
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
