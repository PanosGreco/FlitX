import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { useTestMode } from "@/contexts/TestModeContext";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  userProfile: any;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const { isTestMode } = useTestMode();

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Check if in test mode and load test user from localStorage if available
    if (isTestMode) {
      const testUserString = localStorage.getItem('testUser');
      if (testUserString) {
        try {
          const testUser = JSON.parse(testUserString);
          setUser(testUser as any);
          setUserProfile({
            id: testUser.id,
            full_name: "Test User",
            business_name: "Test Company",
            business_type: "cars",
            avatar_url: null,
            phone: "555-123-4567"
          });
          setLoading(false);
          return;
        } catch (e) {
          console.error("Error parsing test user:", e);
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user) {
          await fetchUserProfile(data.session.user.id);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [isTestMode]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in with:", email);
      
      // For testing - create a mock user and session if using test credentials
      if (email === "test@example.com" && password === "123456") {
        const mockUser = {
          id: "test-user-id",
          email: "test@example.com",
          user_metadata: {
            full_name: "Test User",
          },
        };
        
        setUser(mockUser as any);
        setUserProfile({
          id: "test-user-id",
          full_name: "Test User",
          business_name: "Test Company",
          business_type: "cars",
          avatar_url: null,
          phone: "555-123-4567"
        });
        
        localStorage.setItem('testUser', JSON.stringify(mockUser));
        toast.success("Test account signed in successfully");
        navigate('/');
        return;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Signed in successfully");
      navigate('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || "Failed to sign in");
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log("Attempting to sign up with:", email, userData);
      
      // For testing - create a mock user and session if using test credentials
      if (email === "test@example.com" && password === "123456") {
        const mockUser = {
          id: "test-user-id",
          email: "test@example.com", 
          user_metadata: {
            full_name: userData.full_name || "Test User",
          },
        };
        
        setUser(mockUser as any);
        setUserProfile({
          id: "test-user-id",
          full_name: userData.full_name || "Test User",
          business_name: userData.business_name || "Test Company",
          business_type: userData.business_type || "cars",
          avatar_url: null,
          phone: "555-123-4567"
        });
        
        localStorage.setItem('testUser', JSON.stringify(mockUser));
        toast.success("Test account created successfully");
        navigate('/');
        return;
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      toast.success("Account created successfully! You can now sign in.");
      navigate('/auth?mode=signin');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || "Failed to create account");
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // For test accounts, just clear our mock state
      if (user?.email === "test@example.com" || isTestMode) {
        setUser(null);
        setSession(null);
        setUserProfile(null);
        localStorage.removeItem('testUser');
        navigate('/auth?mode=signin');
        toast.success("Signed out successfully");
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth?mode=signin');
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || "Failed to sign out");
    }
  };

  const updateProfile = async (data: any): Promise<void> => {
    try {
      if (!user && !isTestMode) throw new Error("User not authenticated");

      // For test accounts, just update our mock state
      if ((user?.email === "test@example.com") || isTestMode) {
        setUserProfile({
          ...userProfile,
          ...data
        });
        return;
      }

      if (user) {
        // Update the profile in the database
        const { error } = await supabase
          .from('profiles')
          .update(data)
          .eq('id', user.id);

        if (error) throw error;

        // Refresh the profile data
        await fetchUserProfile(user.id);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    userProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
