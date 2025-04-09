
import React from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { toast } from "sonner";

export const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "el" : "en";
    setLanguage(newLanguage);
    
    // Show toast with the language changed message
    toast.success(
      language === "en" ? "Η γλώσσα άλλαξε στα Ελληνικά" : "Language changed to English"
    );
  };

  return (
    <Button 
      onClick={toggleLanguage} 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span>{language === "en" ? "EN" : "EL"}</span>
    </Button>
  );
};
