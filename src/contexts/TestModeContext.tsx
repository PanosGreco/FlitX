
import React, { createContext, useState, useContext, useEffect } from 'react';

type TestModeContextType = {
  isTestMode: boolean;
  enableTestMode: () => void;
  disableTestMode: () => void;
};

const TestModeContext = createContext<TestModeContextType | undefined>(undefined);

export const TestModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTestMode, setIsTestMode] = useState<boolean>(false);

  // Check if test mode is saved in localStorage on mount
  useEffect(() => {
    const savedTestMode = localStorage.getItem('testMode');
    if (savedTestMode === 'true') {
      setIsTestMode(true);
    }
  }, []);

  const enableTestMode = () => {
    setIsTestMode(true);
    localStorage.setItem('testMode', 'true');
  };

  const disableTestMode = () => {
    setIsTestMode(false);
    localStorage.setItem('testMode', 'false');
  };

  return (
    <TestModeContext.Provider value={{ isTestMode, enableTestMode, disableTestMode }}>
      {children}
    </TestModeContext.Provider>
  );
};

export const useTestMode = () => {
  const context = useContext(TestModeContext);
  if (context === undefined) {
    throw new Error('useTestMode must be used within a TestModeProvider');
  }
  return context;
};
