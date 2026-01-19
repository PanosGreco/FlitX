import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  business_type: string | null;
  company_name: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name?: string, extraData?: { company_name?: string; country?: string; city?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Exception fetching profile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to prevent deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string, extraData?: { company_name?: string; country?: string; city?: string }) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name || email.split("@")[0],
          },
        },
      });

      if (error) {
        return { error };
      }

      // If we have extra data (company, location) and signup succeeded, update the profile
      if (data.user && extraData && (extraData.company_name || extraData.country || extraData.city)) {
        // Wait a bit for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            company_name: extraData.company_name,
            country: extraData.country,
            city: extraData.city,
          })
          .eq("user_id", data.user.id);

        if (profileError) {
          console.error("Failed to update profile with extra data:", profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: new Error("No user logged in") };
    }

    try {
      const currentAuthEmail = user.email;
      const newEmail = updates.email;
      const isEmailChange = newEmail && newEmail !== currentAuthEmail;

      // If email is changing, we need to update Auth first (atomic approach)
      if (isEmailChange) {
        console.log("Email change requested:", currentAuthEmail, "->", newEmail);
        
        // Step 1: Update Auth email (no confirmation required - temporary for dev)
        const { error: authError } = await supabase.auth.updateUser({
          email: newEmail,
        });

        if (authError) {
          // Auth update failed - do not proceed with profile update
          console.error("Auth email update failed:", authError);
          return { 
            error: new Error(
              authError.message.includes("already registered")
                ? "This email is already in use by another account"
                : `Failed to update email: ${authError.message}`
            ) 
          };
        }

        // Step 2: Update profile table
        const { error: profileError } = await supabase
          .from("profiles")
          .update(updates)
          .eq("user_id", user.id);

        if (profileError) {
          // Profile update failed - attempt to rollback Auth email
          console.error("Profile update failed, attempting rollback:", profileError);
          
          if (currentAuthEmail) {
            await supabase.auth.updateUser({ email: currentAuthEmail });
          }
          
          return { 
            error: new Error("Failed to sync email. Please try again.") 
          };
        }

        // Both succeeded - refresh profile
        await refreshProfile();
        return { error: null };
      }

      // Non-email updates - just update profile table
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) {
        return { error };
      }

      // Refresh profile after update
      await refreshProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
