
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const usePageTitle = (titleKey: keyof typeof import('@/contexts/LanguageContext').translations.en) => {
  const { t, language } = useLanguage();
  
  useEffect(() => {
    // Set the document title when language or page changes
    const title = t[titleKey] || titleKey;
    document.title = `FlitX - ${title}`;
    
    return () => {
      // Reset title when unmounting (optional)
      document.title = 'FlitX';
    };
  }, [t, titleKey, language]);
};
