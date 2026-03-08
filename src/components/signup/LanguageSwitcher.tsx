
import React from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, SupportedLanguage } from "@/i18n";

export const LanguageSwitcher = () => {
  const { language, setLanguage, isLanguageLoading } = useLanguage();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    if (lang === language) return;
    setLanguage(lang);
    toast.success(`Language changed to ${LANGUAGE_NAMES[lang]}`);
  };

  const currentLangCode = (SUPPORTED_LANGUAGES.includes(language as SupportedLanguage) ? language : 'en') as SupportedLanguage;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1.5"
          disabled={isLanguageLoading}
        >
          <Globe className={`h-4 w-4 ${isLanguageLoading ? "animate-spin" : ""}`} />
          <span className="uppercase text-xs font-medium">{isLanguageLoading ? "..." : currentLangCode}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={lang === currentLangCode ? "bg-accent" : ""}
          >
            {LANGUAGE_NAMES[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
