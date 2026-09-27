import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, AllianceSettings } from '../types/crm';
import { storageService } from '../services/storage';
import { apiService } from '../services/api';
import { sounds } from '../utils/sound';

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isMainAdmin: boolean;
  isLoading: boolean;
  login: (username: string, pass: string, settings: AllianceSettings) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    storageService.init();
    const stored = storageService.getAuth();
    if (stored) {
      setAdmin(stored);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, pass: string, settings: AllianceSettings) => {
    setIsLoading(true);
    const result = await apiService.login(username, pass, settings);
    setIsLoading(false);

    if (result.success && result.user) {
      setAdmin(result.user);
      storageService.setAuth(result.user);
      sounds.playSuccess();
      return { success: true };
    } else {
      sounds.playAlert();
      return { success: false, error: result.error || 'Authentication failed.' };
    }
  };

  const logout = () => {
    setAdmin(null);
    storageService.setAuth(null);
    sounds.playClick();
  };

  const isMainAdmin = Boolean(admin && admin.role === 'MainAdmin');

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: Boolean(admin),
        isMainAdmin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
