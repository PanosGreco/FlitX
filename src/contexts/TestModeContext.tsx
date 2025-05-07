
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
      
      // Always ensure test user exists when test mode is active
      createTestUser();
    }
  }, []);

  const createTestUser = () => {
    const testUser = {
      id: "test-user-id",
      email: "test@example.com",
      user_metadata: {
        full_name: "Test User",
      }
    };
    
    localStorage.setItem('testUser', JSON.stringify(testUser));
    
    // Also create test profile data
    const testProfile = {
      id: "test-user-id",
      full_name: "Test User",
      business_name: "Test Company",
      business_type: "cars",
      avatar_url: null,
      phone: "555-123-4567"
    };
    
    localStorage.setItem('testUserProfile', JSON.stringify(testProfile));
  };

  const enableTestMode = () => {
    setIsTestMode(true);
    localStorage.setItem('testMode', 'true');
    
    // Create test user data
    createTestUser();
  };

  const disableTestMode = () => {
    setIsTestMode(false);
    localStorage.setItem('testMode', 'false');
    localStorage.removeItem('testUser');
    localStorage.removeItem('testUserProfile');
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
