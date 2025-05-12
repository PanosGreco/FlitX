
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const usePageTitle = (titleKey: keyof typeof import('@/contexts/LanguageContext').translations.en) => {
  const { t, language } = useLanguage();
  
  useEffect(() => {
    // Set the document title when language or page changes
    const title = t[titleKey] || titleKey;
    document.title = `FlitX - ${title}`;
    
    // Update the meta description for SEO
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `FlitX - ${title} | ${language === 'el' ? 'Διαχείριση στόλου οχημάτων' : 'Fleet management software'}`);
    }
    
    return () => {
      // Reset title when unmounting (optional)
      document.title = 'FlitX';
    };
  }, [t, titleKey, language]);
};
