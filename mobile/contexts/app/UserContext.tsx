import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { registerUser } from '../../services/db';
import { log } from '../../utils/logger';

interface UserContextValue {
  userId: string | null;
  isDbSynced: boolean;
  lastSyncError: string | null;
  clearSyncError: () => void;
  isLoadingUser: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isDbSynced, setIsDbSynced] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const register = async () => {
    try {
      const result = await registerUser();
      if (result.success && result.userId) {
        setUserId(result.userId);
        setIsDbSynced(true);
      }
    } catch (e) {
      setLastSyncError('Could not connect to server. Some features may be limited.');
      log('User sync failed:', e);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    register();
  }, []);

  return (
    <UserContext.Provider value={{ 
      userId, 
      isDbSynced, 
      lastSyncError, 
      clearSyncError: () => setLastSyncError(null),
      isLoadingUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
