import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { FrappeAuthConfig, FrappeErrorResponse } from '@/types/auth';

class FrappeAPIClient {
  private client: AxiosInstance;
  private config: FrappeAuthConfig;

  constructor(config: FrappeAuthConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: '/api/frappe', // Use our Next.js API proxy
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for session-based authentication
    this.client.interceptors.request.use((config) => {
      config.withCredentials = true; // Ensure cookies are sent with requests
      
      // Get current user email for proper attribution (from auth store)
      if (typeof window !== 'undefined') {
        const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
        const userEmail = authStore?.state?.user?.email;
        if (userEmail) {
          config.headers = config.headers || {};
          config.headers['X-User-Email'] = userEmail;
        }
      }
      
      if (process.env.NEXT_PUBLIC_API_DEBUG === 'true') {
        console.log('API Request (with user context):', config);
      }
      
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if (process.env.NEXT_PUBLIC_API_DEBUG === 'true') {
          console.log('API Response:', response);
        }
        return response;
      },
      (error) => {
        if (process.env.NEXT_PUBLIC_API_DEBUG === 'true') {
          console.error('API Error:', error);
        }

        // For 417 errors on HD Article requests, don't create an error - let the calling code handle it
        if (error.response?.status === 417 && 
            (error.config?.url?.includes('HD Article') || error.config?.url?.includes('HD%20Article'))) {
          console.log('HD Article 417 error - likely doctype not available or invalid filter');
          // Return the error object but don't reject, so calling code can handle it
          return Promise.reject({ 
            status: 417, 
            response: error.response,
            message: 'HD Article API error - invalid filter or doctype not available',
            skipErrorHandling: true 
          });
        }

        // For 404 errors, also allow graceful handling
        if (error.response?.status === 404) {
          return Promise.reject({
            status: 404,
            response: error.response,
            message: error.response?.data?.message || 'Resource not found',
            skipErrorHandling: false
          });
        }

        let errorMessage = 'An unexpected error occurred';
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout - server took too long to respond';
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network error - could not connect to server. Check if CORS is configured.';
        } else if (error.response?.status === 0) {
          errorMessage = 'CORS error - server not allowing requests from localhost';
        } else if (error.response?.status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.response?.status === 403) {
          errorMessage = 'Access denied. Your account may not have permission to access this system.';
        } else if (error.response?.status === 404) {
          errorMessage = 'API endpoint not found. Please contact support.';
        } else if (error.response?.status === 417) {
          errorMessage = 'Resource not available. This feature may not be configured in your system.';
        } else if (error.response?.status >= 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Disable automatic redirect on 401 - we handle auth state in components
        // This prevents unwanted redirects when API token requests fail
        // if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
        //   window.location.href = '/login';
        // }

        const frappeError: FrappeErrorResponse = {
          message: errorMessage,
          exc_type: error.response?.data?.exc_type,
          exception: error.response?.data?.exception,
        };

        return Promise.reject(frappeError);
      }
    );
  }

  // Generic method for making requests
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  // GET request
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  // POST request
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  // PUT request
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  // DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Login method for session-based auth
  async login(usr: string, pwd: string) {
    return this.post('/method/login', { usr, pwd });
  }

  // Logout method
  async logout() {
    return this.post('/method/logout');
  }

  // Get current user info
  async getCurrentUser() {
    return this.get('/method/frappe.auth.get_logged_user');
  }

  // Get user details including custom fields (bypasses REST API caching)
  async getUserDetails(email: string) {
    return this.post('/method/frappe.client.get_value', {
      doctype: 'User',
      filters: { name: email },
      fieldname: ['name', 'full_name', 'first_name', 'last_name', 'email', 'enabled', 'user_type', 'clinic']
    });
  }

  // Get Contact document by user email (to find linked Company)
  async getContactByUser(userEmail: string) {
    try {
      // Search for Contact where user field matches the email
      const response = await this.get<{ data: Array<{ name: string }> }>('/resource/Contact', {
        params: {
          filters: JSON.stringify({ user: userEmail }),
          fields: JSON.stringify(['name']),
          limit_page_length: 1
        }
      });

      if (response.data && response.data.length > 0) {
        // Get the full Contact document with links
        const contactName = response.data[0].name;
        return this.get(`/resource/Contact/${encodeURIComponent(contactName)}`);
      }

      return null;
    } catch (error) {
      console.warn('Could not fetch Contact for user:', userEmail, error);
      return null;
    }
  }

  // Get Company from Contact's links
  async getCompanyFromContact(userEmail: string): Promise<string | undefined> {
    try {
      const contactResponse = await this.getContactByUser(userEmail);

      if (!contactResponse) {
        console.log('No Contact found for user:', userEmail);
        return undefined;
      }

      const contactData = contactResponse as { data?: { links?: Array<{ link_doctype: string; link_name: string }> } };
      const links = contactData.data?.links || [];

      // Find the Company link in the links array
      const companyLink = links.find(link => link.link_doctype === 'Company');

      if (companyLink) {
        console.log('Found Company from Contact links:', companyLink.link_name);
        return companyLink.link_name;
      }

      console.log('No Company link found in Contact:', contactData.data);
      return undefined;
    } catch (error) {
      console.warn('Error getting Company from Contact:', error);
      return undefined;
    }
  }

  // Frappe-specific methods for support portal
  
  // User signup
  async signUp(userData: { email: string; full_name: string; password: string }) {
    return this.post('/method/frappe.core.doctype.user.user.sign_up', userData);
  }

  // Assign role to user
  async assignRole(user: string, role: string) {
    return this.post('/resource/User Role', {
      user,
      role,
      doctype: 'User Role'
    });
  }

  // Tickets
  // When fetching tickets for clinic-based filtering, we need to skip user impersonation
  // to get ALL tickets (admin-level access) and then filter client-side by clinic
  async getTickets(filters?: Record<string, unknown>, skipImpersonation = false) {
    const params: Record<string, string> = {};
    if (filters) {
      params.filters = JSON.stringify(filters);
    }
    // Request specific fields for the list view (including clinic for filtering)
    params.fields = JSON.stringify([
      'name', 'subject', 'description', 'status', 'priority',
      'raised_by', 'creation', 'modified', 'owner', 'ticket_type', 'clinic'
    ]);

    // Create headers with optional skip impersonation
    const headers: Record<string, string> = {};
    if (skipImpersonation) {
      headers['X-Skip-Impersonation'] = 'true';
    }

    return this.get(`/resource/HD Ticket`, { params, headers });
  }

  async getTicket(ticketId: string) {
    return this.get(`/resource/HD Ticket/${ticketId}`);
  }

  async createTicket(ticketData: Record<string, unknown>) {
    return this.post(`/resource/HD Ticket`, ticketData);
  }

  async updateTicket(ticketId: string, ticketData: Record<string, unknown>) {
    return this.put(`/resource/HD Ticket/${ticketId}`, ticketData);
  }

  // Ticket Replies/Comments (using HD Ticket Comment doctype from Frappe Helpdesk)
  // skipImpersonation allows clinic users to see all comments on shared tickets
  async getTicketReplies(ticketId: string, skipImpersonation = false) {
    const params = {
      filters: JSON.stringify({
        reference_ticket: ticketId
      }),
      fields: JSON.stringify([
        'name', 'content', 'commented_by', 'creation', 'modified',
        'is_pinned', 'owner'
      ]),
      order_by: 'creation asc'
    };

    const headers: Record<string, string> = {};
    if (skipImpersonation) {
      headers['X-Skip-Impersonation'] = 'true';
    }

    return this.get(`/resource/HD Ticket Comment`, { params, headers });
  }

  async addTicketReply(ticketId: string, content: string, sender?: string) {
    return this.post(`/resource/HD Ticket Comment`, {
      reference_ticket: ticketId,
      content: content,
      commented_by: sender
    });
  }

  // Knowledge Base Articles
  async getArticles() {
    try {
      console.log('🔍 Attempting to load HD Articles from API...');

      // Specify fields to fetch - Frappe defaults to only 'name' if not specified
      // Note: Some fields like 'is_public', 'helpful_count' are not permitted in HD Article queries
      const fields = [
        'name',
        'title',
        'content',
        'status',
        'category',
        'author',
        'creation',
        'modified',
        'owner'
      ];

      const result = await this.get(`/resource/HD Article?fields=${JSON.stringify(fields)}`);
      console.log('✅ HD Articles loaded successfully:', result);
      return result;
    } catch (error: unknown) {
      console.error('❌ HD Article API error:', error);
      // Type guard for axios errors
      const isAxiosError = (err: unknown): err is { response?: { status: number }; status?: number; skipErrorHandling?: boolean } => {
        return typeof err === 'object' && err !== null;
      };
      // If HD Article doctype doesn't exist (417), return empty data instead of throwing
      if (isAxiosError(error) && (error?.response?.status === 417 || error?.status === 417 || error?.skipErrorHandling)) {
        console.log('⚠️ HD Article doctype not available, returning empty data');
        return { data: [] };
      }
      throw error; // Re-throw other errors
    }
  }

  async getArticle(articleId: string) {
    return this.get(`/resource/HD Article/${articleId}`);
  }

  // Search
  async searchTickets(query: string, clinic?: string, skipImpersonation = false) {
    const filters: Record<string, unknown> = {
      subject: ['like', `%${query}%`]
    };

    // Filter by clinic if provided (shows all tickets from the same clinic)
    if (clinic) {
      filters.clinic = clinic;
    }

    // Create headers with optional skip impersonation
    const headers: Record<string, string> = {};
    if (skipImpersonation) {
      headers['X-Skip-Impersonation'] = 'true';
    }

    return this.get('/resource/HD Ticket', {
      params: {
        filters: JSON.stringify(filters),
        fields: JSON.stringify([
          'name', 'subject', 'description', 'status', 'priority',
          'raised_by', 'creation', 'modified', 'owner', 'ticket_type', 'clinic'
        ])
      },
      headers
    });
  }

  async searchArticles(query: string) {
    // Specify fields to fetch - same as getArticles()
    // Note: Some fields like 'is_public', 'helpful_count' are not permitted in HD Article queries
    const fields = [
      'name',
      'title',
      'content',
      'status',
      'category',
      'author',
      'creation',
      'modified',
      'owner'
    ];

    return this.get('/resource/HD Article', {
      params: {
        fields: JSON.stringify(fields),
        filters: JSON.stringify({
          title: ['like', `%${query}%`],
          status: 'Published'
        })
      }
    });
  }
}

// Create and export the API client instance
export const createAPIClient = (): FrappeAPIClient => {
  const config: FrappeAuthConfig = {
    baseUrl: process.env.NEXT_PUBLIC_FRAPPE_BASE_URL || '',
    apiVersion: process.env.NEXT_PUBLIC_FRAPPE_API_VERSION || 'v2',
  };

  if (!config.baseUrl) {
    throw new Error('NEXT_PUBLIC_FRAPPE_BASE_URL is required');
  }

  return new FrappeAPIClient(config);
};

export const apiClient = createAPIClient();