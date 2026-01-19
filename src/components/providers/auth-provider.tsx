"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, setAccessToken, getAccessToken } from '@/lib/api';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: string;
  role: string;
  school: string | null;
  grade: string | null;
  createdAt: string;
  preferences?: {
    theme: string;
    dailyGoalMinutes: number;
    weeklyGoalMinutes: number;
    pomodoroLength: number;
    shortBreakLength: number;
    longBreakLength: number;
  };
  streak?: {
    currentStreak: number;
    longestStreak: number;
  };
  stats?: {
    totalStudyMinutes: number;
    totalPomodoros: number;
    tasksCompleted: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const result = await authApi.me();
          if (result.success && result.data) {
            const data = result.data as { user: User };
            setUser(data.user);
          } else {
            setAccessToken(null);
          }
        } catch {
          setAccessToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    setError(null);
    try {
      const result = await authApi.login(email, password, rememberMe);
      if (result.success && result.data) {
        setUser((result.data as { user: User }).user);
        return true;
      } else {
        setError(result.error?.message || 'Login failed');
        return false;
      }
    } catch {
      setError('An unexpected error occurred');
      return false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; requiresVerification?: boolean; email?: string }> => {
    setError(null);
    try {
      const result = await authApi.register(email, password, name);
      if (result.success && result.data) {
        const data = result.data as { requiresVerification?: boolean; email?: string; accessToken?: string; user?: User };
        // Check if email verification is required
        if (data.requiresVerification) {
          return { success: true, requiresVerification: true, email: data.email };
        }
        // Legacy flow (if verification is disabled)
        if (data.accessToken) {
          setAccessToken(data.accessToken);
        }
        if (data.user) {
          setUser(data.user);
        }
        return { success: true };
      } else {
        setError(result.error?.message || 'Registration failed');
        return { success: false };
      }
    } catch {
      setError('An unexpected error occurred');
      return { success: false };
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const result = await authApi.me();
      if (result.success && result.data) {
        const data = result.data as { user: User };
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
