
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from "sonner";

const SignUpPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  
  const signUpSchema = z.object({
    businessName: z.string().min(2, { message: t.signup.businessNameRequired }),
    email: z.string().email({ message: t.signup.invalidEmail }),
    password: z.string().min(6, { message: t.signup.passwordLength }),
    businessType: z.string().min(1, { message: t.signup.businessTypeRequired }),
  });

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      businessName: "",
      email: "",
      password: "",
      businessType: "",
    },
  });

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    try {
      // In a real app, you would send this data to your backend
      console.log("Form values:", values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      toast.success(t.signup.accountCreated);
      
      // Redirect based on business type
      if (values.businessType === "cars") {
        navigate("/");
      } else if (values.businessType === "boats") {
        navigate("/boats");
      }
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error(t.signup.errorCreating);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 md:p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t.signup.createAccount}</h1>
          <p className="text-gray-600 mt-2">{t.signup.getStarted}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
                          // Calculate password strength somewhere
                          const value = e.target.value;
                          let score = 0;
                          if (value.length > 8) score += 1;
                          if (/[A-Z]/.test(value)) score += 1;
                          if (/[0-9]/.test(value)) score += 1;
                          if (/[^A-Za-z0-9]/.test(value)) score += 1;
                          setPasswordScore(score);
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
                  <PasswordStrengthMeter score={passwordScore} />
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
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
            
            <Button type="submit" className="w-full mt-6">
              {t.signup.signUp}
            </Button>
          </form>
        </Form>
        
        <div className="text-center text-sm">
          <p className="text-gray-600">
            {t.signup.alreadyHaveAccount}{" "}
            <a href="/login" className="text-primary hover:underline">
              {t.signup.login}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
