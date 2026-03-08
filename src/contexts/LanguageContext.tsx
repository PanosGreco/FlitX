
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import i18n, { SupportedLanguage, SUPPORTED_LANGUAGES, ALL_NAMESPACES } from "@/i18n";

type LanguageContextType = {
  language: string;
  setLanguage: (lang: SupportedLanguage) => void;
  t: ReturnType<typeof useTranslation>['t'];
  isLanguageLoading: boolean;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const { t } = useTranslation(ALL_NAMESPACES as unknown as string[]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLanguageLoading, setIsLanguageLoading] = useState(true);

  // Initialize language from profile on mount
  useEffect(() => {
    const fetchUserLanguagePreference = async () => {
      try {
        setIsLanguageLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData?.session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('language')
            .eq('user_id', sessionData.session.user.id)
            .single();

          if (profile?.language && SUPPORTED_LANGUAGES.includes(profile.language as SupportedLanguage)) {
            await i18n.changeLanguage(profile.language);
          }
        }
        // If no profile language, i18next detector (localStorage → browser) handles it
      } catch (error) {
        console.error("Failed to fetch language preference:", error);
      } finally {
        setIsInitialized(true);
        setIsLanguageLoading(false);
      }
    };

    fetchUserLanguagePreference();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserLanguagePreference();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    try {
      setIsLanguageLoading(true);
      await i18n.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);

      // Save to profile if authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase
          .from('profiles')
          .update({ language: lang })
          .eq('user_id', sessionData.session.user.id);
      }
    } catch (error) {
      console.error("Error setting language:", error);
    } finally {
      setIsLanguageLoading(false);
    }
  }, []);

  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language: i18n.language, setLanguage, t, isLanguageLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};
