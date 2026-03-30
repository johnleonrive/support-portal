// === AUTH TYPES (FR-02: User Authentication) ===

export interface FrappeAuthConfig {
  baseUrl: string;
  apiVersion?: string;
}

export interface FrappeUser {
  name: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  user_image?: string;
  roles: string[];
  enabled?: number;
  user_type?: string;
}

export interface FrappeAuthResponse {
  message: string;
  home_page: string;
  full_name: string;
  user: FrappeUser;
}

export interface FrappeErrorResponse {
  message: string;
  exc_type?: string;
  exception?: string;
}

export interface LoginCredentials {
  usr: string;
  pwd: string;
}

export interface AuthStore {
  user: FrappeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  checkSession: () => Promise<boolean>;
}