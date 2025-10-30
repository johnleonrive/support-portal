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
  async getTickets(filters?: Record<string, unknown>) {
    const params: Record<string, string> = {};
    if (filters) {
      params.filters = JSON.stringify(filters);
    }
    // Request specific fields for the list view
    params.fields = JSON.stringify([
      'name', 'subject', 'description', 'status', 'priority', 
      'raised_by', 'creation', 'modified', 'owner', 'ticket_type'
    ]);
    return this.get(`/resource/HD Ticket`, { params });
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
  async getTicketReplies(ticketId: string) {
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
    return this.get(`/resource/HD Ticket Comment`, { params });
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
      
      // Don't apply client-side filters in the API call - get all articles and filter in code
      const result = await this.get(`/resource/HD Article`);
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

  // Helper method to test what doctypes are available
  async getAvailableDoctypes() {
    try {
      console.log('🔍 Testing available doctypes...');
      
      // Try some common Frappe doctypes to see what's available
      const tests = [
        { name: 'HD Ticket', url: '/resource/HD Ticket' },
        { name: 'HD Article', url: '/resource/HD Article' },
        { name: 'Knowledge Base Article', url: '/resource/Knowledge Base Article' },
        { name: 'Article', url: '/resource/Article' },
        { name: 'Help Article', url: '/resource/Help Article' }
      ];
      
      const results = [];
      for (const test of tests) {
        try {
          await this.get(`${test.url}?limit_page_length=1`);
          results.push({ doctype: test.name, available: true });
          console.log(`✅ ${test.name}: Available`);
        } catch (error: unknown) {
          const isErrorObj = (err: unknown): err is { response?: { status: number }; status?: number; message?: string } => {
            return typeof err === 'object' && err !== null;
          };
          const status = isErrorObj(error) ? (error?.response?.status || error?.status) : undefined;
          results.push({
            doctype: test.name,
            available: false,
            status,
            error: isErrorObj(error) ? error?.message : 'Unknown error' 
          });
          console.log(`❌ ${test.name}: Not available (${status})`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error testing doctypes:', error);
      return [];
    }
  }

  async getArticle(articleId: string) {
    return this.get(`/resource/HD Article/${articleId}`);
  }

  // Search
  async searchTickets(query: string, userEmail?: string) {
    const filters: Record<string, unknown> = {
      subject: ['like', `%${query}%`]
    };
    
    // Filter by user if provided
    if (userEmail) {
      filters.raised_by = userEmail;
    }
    
    return this.get('/resource/HD Ticket', {
      params: {
        filters: JSON.stringify(filters),
        fields: JSON.stringify([
          'name', 'subject', 'description', 'status', 'priority', 
          'raised_by', 'creation', 'modified', 'owner', 'ticket_type'
        ])
      }
    });
  }

  async searchArticles(query: string) {
    return this.get('/resource/HD Article', {
      params: {
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