import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'flitx-glass-enabled';

export function useGlassTheme() {
  const [isGlassEnabled, setIsGlassEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // Apply class to html element for CSS conditional styling
    if (isGlassEnabled) {
      document.documentElement.classList.add('glass-enabled');
    } else {
      document.documentElement.classList.remove('glass-enabled');
    }
  }, [isGlassEnabled]);

  const toggleGlass = useCallback(() => {
    setIsGlassEnabled(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const disableGlass = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'false');
    setIsGlassEnabled(false);
  }, []);

  const enableGlass = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsGlassEnabled(true);
  }, []);

  return { isGlassEnabled, toggleGlass, disableGlass, enableGlass };
}
