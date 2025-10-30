import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthStore, LoginCredentials, FrappeUser } from '@/types/auth';
import { apiClient } from '@/lib/api';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.login(credentials.usr, credentials.pwd);
          const authData = response as { full_name?: string; first_name?: string; last_name?: string; message?: { full_name?: string; first_name?: string; last_name?: string } };

          // Create user object from login response
          const user: FrappeUser = {
            name: credentials.usr,
            email: credentials.usr,
            full_name: authData.full_name || authData.message?.full_name || 'Unknown User',
            first_name: authData.first_name || authData.message?.first_name || '',
            last_name: authData.last_name || authData.message?.last_name || '',
            roles: [], // We'll populate this later if needed
            enabled: 1,
            user_type: 'System User'
          };
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiClient.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      checkSession: async () => {
        set({ isLoading: true });

        try {
          // Call Frappe's getCurrentUser to check if session cookie is valid
          const response = await apiClient.getCurrentUser();
          const userData = response as { message?: string; email?: string };

          // getCurrentUser only returns the email, we need to fetch the full user details
          const userEmail = userData.message || userData.email;

          if (!userEmail) {
            throw new Error('No user email returned from session check');
          }

          // Fetch the full user document to get name, roles, etc.
          try {
            const userDoc = await apiClient.get(`/resource/User/${userEmail}`);
            const userDocData = userDoc as {
              data?: {
                name?: string;
                full_name?: string;
                first_name?: string;
                last_name?: string;
                roles?: Array<{ role: string }>;
                enabled?: number;
                user_type?: string;
              }
            };

            const user: FrappeUser = {
              name: userDocData.data?.name || userEmail,
              email: userEmail,
              full_name: userDocData.data?.full_name || userDocData.data?.name || userEmail,
              first_name: userDocData.data?.first_name || '',
              last_name: userDocData.data?.last_name || '',
              roles: userDocData.data?.roles?.map((r) => r.role) || [],
              enabled: userDocData.data?.enabled || 1,
              user_type: userDocData.data?.user_type || 'System User'
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          } catch (userFetchError) {
            // If we can't fetch user details, use just the email
            console.warn('Could not fetch user details, using email only:', userFetchError);

            const user: FrappeUser = {
              name: userEmail,
              email: userEmail,
              full_name: userEmail,
              first_name: '',
              last_name: '',
              roles: [],
              enabled: 1,
              user_type: 'System User'
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          }
        } catch {
          // Session is invalid or expired, clear auth state
          console.log('No valid session found, user needs to login');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          return false;
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.log('Error rehydrating auth store:', error);
            if (state) {
              state.hasHydrated = true;
            }
            return;
          }

          if (state) {
            // Mark as hydrated first
            state.hasHydrated = true;

            // Only validate session if user was previously authenticated
            // This prevents unnecessary API calls and doesn't interfere with fresh logins
            if (state.isAuthenticated) {
              console.log('Found persisted auth state, validating session...');
              state.checkSession();
            } else {
              console.log('No persisted auth state, skipping session check');
            }
          }
        };
      },
    }
  )
);