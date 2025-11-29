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

          // Fetch user details for basic info
          let fullName = authData.full_name || authData.message?.full_name || 'Unknown User';
          let firstName = authData.first_name || authData.message?.first_name || '';
          let lastName = authData.last_name || authData.message?.last_name || '';

          try {
            const userDoc = await apiClient.getUserDetails(credentials.usr);
            const userDocData = userDoc as {
              message?: {
                full_name?: string;
                first_name?: string;
                last_name?: string;
              }
            };
            fullName = userDocData.message?.full_name || fullName;
            firstName = userDocData.message?.first_name || firstName;
            lastName = userDocData.message?.last_name || lastName;
          } catch (fetchError) {
            console.warn('Could not fetch user details during login:', fetchError);
          }

          // Fetch clinic from Contact's linked Company (not User.clinic)
          // This is the reliable way to get clinic based on Contact → Company linking
          let clinic: string | undefined;
          try {
            clinic = await apiClient.getCompanyFromContact(credentials.usr);
            console.log('Login - fetched clinic from Contact links:', clinic);
          } catch (fetchError) {
            console.warn('Could not fetch clinic from Contact during login:', fetchError);
          }

          // Create user object from login response + fetched clinic from Contact
          const user: FrappeUser = {
            name: credentials.usr,
            email: credentials.usr,
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            roles: [], // We'll populate this later if needed
            enabled: 1,
            user_type: 'System User',
            clinic: clinic,
          };

          console.log('Login - user object:', user);

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
        // Get the current persisted user before making API calls
        const currentUser = useAuthStore.getState().user;

        set({ isLoading: true });

        try {
          // Call Frappe's getCurrentUser to check if session cookie is valid
          const response = await apiClient.getCurrentUser();
          const userData = response as { message?: string; email?: string };

          // getCurrentUser only returns the email
          const sessionEmail = userData.message || userData.email;

          if (!sessionEmail) {
            throw new Error('No user email returned from session check');
          }

          // IMPORTANT: If sessionEmail is "Administrator" but we have a persisted user,
          // this likely means the API token is being used without proper session cookies.
          // In this case, trust the persisted user and just mark loading as done.
          if (sessionEmail === 'Administrator' && currentUser && currentUser.email !== 'Administrator') {
            console.log('Session check returned Administrator but we have a persisted user, keeping:', currentUser.email);
            set({ isLoading: false });
            return true;
          }

          // If the session email matches our persisted user, no need to re-fetch everything
          if (currentUser && currentUser.email === sessionEmail) {
            console.log('Session valid for user:', sessionEmail);
            set({ isLoading: false });
            return true;
          }

          // Session email differs from persisted user - need to update
          // Fetch the full user document to get name, roles, etc.
          // Use frappe.client.get_value method which bypasses REST API caching
          try {
            const userDoc = await apiClient.getUserDetails(sessionEmail);
            const userDocData = userDoc as {
              message?: {
                name?: string;
                full_name?: string;
                first_name?: string;
                last_name?: string;
                enabled?: number;
                user_type?: string;
              }
            };

            // Log the response to debug
            console.log('User details response:', userDocData);

            // Fetch clinic from Contact's linked Company (not User.clinic)
            // This is the reliable way to get clinic based on Contact → Company linking
            let clinic: string | undefined;
            try {
              clinic = await apiClient.getCompanyFromContact(sessionEmail);
              console.log('Session check - fetched clinic from Contact links:', clinic);
            } catch (fetchError) {
              console.warn('Could not fetch clinic from Contact during session check:', fetchError);
            }

            const user: FrappeUser = {
              name: userDocData.message?.name || sessionEmail,
              email: sessionEmail,
              full_name: userDocData.message?.full_name || userDocData.message?.name || sessionEmail,
              first_name: userDocData.message?.first_name || '',
              last_name: userDocData.message?.last_name || '',
              roles: [], // Roles are in a child table, we'll fetch separately if needed
              enabled: userDocData.message?.enabled || 1,
              user_type: userDocData.message?.user_type || 'System User',
              clinic: clinic,
            };

            console.log('User object with clinic:', user);

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

            // Still try to get clinic from Contact
            let clinic: string | undefined;
            try {
              clinic = await apiClient.getCompanyFromContact(sessionEmail);
            } catch {
              // Ignore error
            }

            const user: FrappeUser = {
              name: sessionEmail,
              email: sessionEmail,
              full_name: sessionEmail,
              first_name: '',
              last_name: '',
              roles: [],
              enabled: 1,
              user_type: 'System User',
              clinic: clinic,
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