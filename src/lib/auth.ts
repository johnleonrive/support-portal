import { useAuthStore } from '@/store/auth';
import { FrappeUser } from '@/types/auth';

// Auth utility functions
export const auth = {
  // Get current user from store
  getUser: (): FrappeUser | null => {
    return useAuthStore.getState().user;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return useAuthStore.getState().isAuthenticated;
  },

  // Check if user has specific role
  hasRole: (role: string): boolean => {
    const user = useAuthStore.getState().user;
    return user?.roles?.includes(role) || false;
  },

  // Check if user has any of the specified roles
  hasAnyRole: (roles: string[]): boolean => {
    const user = useAuthStore.getState().user;
    if (!user?.roles) return false;
    return roles.some(role => user.roles.includes(role));
  },

  // Check if user has all specified roles
  hasAllRoles: (roles: string[]): boolean => {
    const user = useAuthStore.getState().user;
    if (!user?.roles) return false;
    return roles.every(role => user.roles.includes(role));
  },

  // Get user's email
  getEmail: (): string | null => {
    return useAuthStore.getState().user?.email || null;
  },

  // Get user's full name
  getFullName: (): string | null => {
    return useAuthStore.getState().user?.full_name || null;
  },
};

// Hook for authentication (use this in components)
export const useAuth = () => {
  const store = useAuthStore();

  // Session validation is now handled in the store's onRehydrateStorage callback
  // This ensures it happens once when the app initializes, not on every component mount

  return {
    ...store,
    // Convenience methods
    hasRole: (role: string) => auth.hasRole(role),
    hasAnyRole: (roles: string[]) => auth.hasAnyRole(roles),
    hasAllRoles: (roles: string[]) => auth.hasAllRoles(roles),
  };
};

// Route protection utilities
export const requireAuth = (redirectTo: string = '/login') => {
  if (typeof window !== 'undefined' && !auth.isAuthenticated()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
};

export const requireRole = (role: string, redirectTo: string = '/unauthorized') => {
  if (!requireAuth()) return false;
  
  if (!auth.hasRole(role)) {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
    return false;
  }
  return true;
};

export const requireAnyRole = (roles: string[], redirectTo: string = '/unauthorized') => {
  if (!requireAuth()) return false;
  
  if (!auth.hasAnyRole(roles)) {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
    return false;
  }
  return true;
};