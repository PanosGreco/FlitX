
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const usePageTitle = (titleKey: string) => {
  const { t, i18n } = useTranslation('common');
  
  useEffect(() => {
    const title = t(titleKey) || titleKey;
    document.title = `FlitX - ${title}`;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      const lang = i18n.language;
      metaDescription.setAttribute('content', `FlitX - ${title} | ${lang === 'el' ? 'Διαχείριση στόλου οχημάτων' : 'Fleet management software'}`);
    }
    
    return () => {
      document.title = 'FlitX';
    };
  }, [t, titleKey, i18n.language]);
};
