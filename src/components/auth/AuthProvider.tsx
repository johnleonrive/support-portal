'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    // Pure session-based authentication is now implemented
    // Session cookies are automatically managed by the browser and forwarded by our API proxy
    // No session validation needed here as Frappe handles session validation on each API request
  }, [isAuthenticated, user, logout]);

  return <>{children}</>;
};