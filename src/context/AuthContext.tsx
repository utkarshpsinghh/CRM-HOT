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
  updateCurrentAdmin: (partial: Partial<AdminUser>) => void;
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
    // Keep inline button spinner in LoginView without unmounting to full-page loader
    const result = await apiService.login(username, pass, settings);

    if (result.success && result.user) {
      if (result.initialData) {
        // Pre-cache sheet data into storage for instant 0ms mount
        if (Array.isArray(result.initialData.members)) storageService.setMembers(result.initialData.members);
        if (Array.isArray(result.initialData.events)) storageService.setEvents(result.initialData.events);
        if (Array.isArray(result.initialData.attendance)) storageService.setAttendance(result.initialData.attendance);
        if (Array.isArray(result.initialData.strikes)) storageService.setStrikes(result.initialData.strikes);
        if (Array.isArray(result.initialData.communications)) storageService.setCommunications(result.initialData.communications);
        if (Array.isArray(result.initialData.admins)) storageService.setAdminAccounts(result.initialData.admins);
        if (Array.isArray(result.initialData.contributions)) storageService.setContributions(result.initialData.contributions);
      }
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

  const updateCurrentAdmin = (partial: Partial<AdminUser>) => {
    if (!admin) return;
    const updated = { ...admin, ...partial };
    setAdmin(updated);
    storageService.setAuth(updated);
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
        updateCurrentAdmin,
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
