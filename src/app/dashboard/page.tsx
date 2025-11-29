'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Ticket,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { HDTicket, FrappeResponse } from '@/types/frappe';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardPage() {
  const { user, logout, isAuthenticated, hasHydrated } = useAuth();
  const [tickets, setTickets] = useState<HDTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTickets, setAllTickets] = useState<HDTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [sortField, setSortField] = useState<'creation' | 'modified'>('modified');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  // Redirect if not authenticated (only after hydration completes)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Load user tickets
  useEffect(() => {
    const loadTickets = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Clear any old non-user-specific localStorage data to prevent cross-user contamination
        const oldTickets = localStorage.getItem('mockTickets');
        if (oldTickets) {
          localStorage.removeItem('mockTickets');
          console.log('Cleared old shared localStorage tickets for security');
        }
        
        // Try to load real data first, fallback to mock data if API fails
        try {
          // For clinic-based filtering:
          // 1. Use admin credentials (skip impersonation) to get ALL tickets with the clinic filter
          // 2. This bypasses Frappe's user permission restrictions
          // 3. Then filter client-side as an extra security measure
          //
          // If user has no clinic, fall back to filtering by raised_by (their own tickets only)
          const filters: Record<string, unknown> = user.clinic
            ? { clinic: user.clinic }
            : { raised_by: user.email };

          // Skip user impersonation to use admin credentials - this allows fetching ALL tickets
          // with the clinic filter, not just the current user's tickets
          const skipImpersonation = !!user.clinic;
          const response = await apiClient.getTickets(filters, skipImpersonation) as FrappeResponse<HDTicket>;

          console.log('API Response:', response);
          console.log('Tickets data:', response.data);
          const ticketsData = response.data || [];

          // IMPORTANT: Additional client-side filtering for security
          // Ensure tickets match the user's clinic (or raised_by if no clinic)
          const clinicTickets = user.clinic
            ? ticketsData.filter(ticket => ticket.clinic === user.clinic)
            : ticketsData.filter(ticket => ticket.raised_by === user.email);

          console.log('Filtered clinic tickets:', clinicTickets);
          setAllTickets(clinicTickets);
          setTickets(clinicTickets);
        } catch (apiError) {
          console.warn('API request failed, using mock data:', apiError);
          
          // Mock ticket data for demonstration
          const mockTickets: HDTicket[] = [
            {
              name: 'TKT-2024-001',
              subject: 'Login Issues with SMYLS Portal',
              description: 'Unable to access the dashboard after recent updates. Getting authentication errors.',
              status: 'Open',
              priority: 'High',
              raised_by: user.email,
              creation: new Date().toISOString(),
              modified: new Date().toISOString(),
              modified_by: user.email,
              owner: user.email,
              ticket_type: 'Technical Support',
              docstatus: 0
            },
            {
              name: 'TKT-2024-002',
              subject: 'Feature Request: Dark Mode',
              description: 'It would be great to have a dark mode option for better user experience.',
              status: 'Replied',
              priority: 'Medium',
              raised_by: user.email,
              creation: new Date(Date.now() - 86400000).toISOString(), // Yesterday
              modified: new Date().toISOString(),
              modified_by: user.email,
              owner: user.email,
              ticket_type: 'Feature Request',
              docstatus: 0
            },
            {
              name: 'TKT-2024-003',
              subject: 'Email Notification Setup',
              description: 'Need help configuring email notifications for ticket updates.',
              status: 'Resolved',
              priority: 'Low',
              raised_by: user.email,
              creation: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              modified: new Date().toISOString(),
              modified_by: user.email,
              owner: user.email,
              ticket_type: 'General Inquiry',
              docstatus: 0
            }
          ];
          
          // Add locally created tickets from user-specific localStorage
          const userTicketsKey = `mockTickets_${user.email}`;
          const userLocalTickets = JSON.parse(localStorage.getItem(userTicketsKey) || '[]') as HDTicket[];
          
          const allTickets = [...mockTickets, ...userLocalTickets];
          
          console.log('Using combined tickets (mock + local):', allTickets);
          setAllTickets(allTickets);
          setTickets(allTickets);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load tickets';
        setError(errorMessage);
        console.error('Failed to load tickets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadTickets();
    }
  }, [user]);

  const performAPISearch = useCallback(async () => {
    if (!searchQuery.trim() || !user) return;

    try {
      setIsLoading(true);
      // Search within the user's clinic (or no clinic filter if user has no clinic)
      // Skip impersonation for clinic-based filtering to use admin credentials
      const skipImpersonation = !!user.clinic;
      const response = await apiClient.searchTickets(searchQuery, user.clinic, skipImpersonation) as FrappeResponse<HDTicket>;
      console.log('Search API Response:', response);
      console.log('Search Tickets data:', response.data);

      // Additional client-side filtering for security
      const filteredResults = user.clinic
        ? (response.data || []).filter(ticket => ticket.clinic === user.clinic)
        : (response.data || []).filter(ticket => ticket.raised_by === user.email);

      setTickets(filteredResults);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, user]);

  // Debounced search effect
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (!searchQuery.trim()) {
        // If search is empty, show all tickets
        setTickets(allTickets);
      } else {
        // Filter tickets locally first for instant feedback
        const filteredTickets = allTickets.filter(ticket =>
          ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filteredTickets.length > 0) {
          setTickets(filteredTickets);
        } else {
          // If no local results, try API search
          performAPISearch();
        }
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, allTickets, performAPISearch]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };


  const getStatusBadgeVariant = (status: HDTicket['status']) => {
    // Open tickets get gradient styling, others get outline
    if (status === 'Open' || status === 'Replied') {
      return 'default';
    }
    return 'outline';
  };

  const getStatusBadgeStyle = (status: HDTicket['status']) => {
    if (status === 'Open' || status === 'Replied') {
      return {
        background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
        color: 'white',
        border: 'none'
      };
    }
    return {
      background: 'transparent',
      borderColor: '#00AEEF',
      color: '#00AEEF'
    };
  };

  const stripHtmlTags = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Filter and sort tickets
  const filteredAndSortedTickets = tickets
    .filter(ticket => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Open') return ticket.status === 'Open' || ticket.status === 'Replied';
      if (statusFilter === 'Closed') return ticket.status === 'Closed' || ticket.status === 'Resolved';
      return true;
    })
    .sort((a, b) => {
      // Only sorting by date fields (creation or modified)
      const aVal = new Date(a[sortField]).getTime();
      const bVal = new Date(b[sortField]).getTime();

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (will happen via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header Bar */}
        <div className="h-12 flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
          <h1
            className="text-xl font-medium"
            style={{
              color: '#000',
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
            }}
          >
            Tickets
          </h1>

          {/* Create Button */}
          <Link href="/tickets/new">
            <Button
              className="h-8 px-2 rounded-lg border text-white cursor-pointer"
              style={{
                background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                borderColor: '#00AEEF',
                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
              }}
            >
              <Plus className="h-2.5 w-2.5 mr-2" />
              <span className="text-lg font-medium">Create</span>
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 p-6" style={{ background: '#FFF' }}>
          {/* Search Bar */}
          <div className="mb-6 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-lg border-gray-300"
                style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-6 flex-shrink-0">
            <div className="flex space-x-2">
              <Button
                variant={statusFilter === 'All' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('All')}
                className={`h-8 px-3 ${statusFilter === 'All' ? 'cursor-default' : 'cursor-pointer'}`}
                style={{
                  background: statusFilter === 'All'
                    ? 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)'
                    : 'transparent',
                  borderColor: '#00AEEF',
                  color: statusFilter === 'All' ? 'white' : '#00AEEF',
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'Open' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('Open')}
                className={`h-8 px-3 ${statusFilter === 'Open' ? 'cursor-default' : 'cursor-pointer'}`}
                style={{
                  background: statusFilter === 'Open'
                    ? 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)'
                    : 'transparent',
                  borderColor: '#00AEEF',
                  color: statusFilter === 'Open' ? 'white' : '#00AEEF',
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                Open
              </Button>
              <Button
                variant={statusFilter === 'Closed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('Closed')}
                className={`h-8 px-3 ${statusFilter === 'Closed' ? 'cursor-default' : 'cursor-pointer'}`}
                style={{
                  background: statusFilter === 'Closed'
                    ? 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)'
                    : 'transparent',
                  borderColor: '#00AEEF',
                  color: statusFilter === 'Closed' ? 'white' : '#00AEEF',
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                Closed
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6 flex-shrink-0">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tickets Table */}
          <div className="border border-gray-200 rounded-lg flex flex-col min-h-0 flex-1">
            {/* Table Header - Fixed */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 flex-shrink-0" style={{ background: '#F3F4F6' }}>
              <div className="col-span-6 flex items-center">
                <span
                  className="text-sm font-medium"
                  style={{ color: '#6B7280', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                >
                  Subject
                </span>
              </div>
              <div className="col-span-2 flex items-center">
                <span
                  className="text-sm font-medium"
                  style={{ color: '#6B7280', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                >
                  Status
                </span>
              </div>
              <div className="col-span-2 flex items-center">
                <button
                  onClick={() => handleSort('creation')}
                  className="flex items-center text-sm font-medium hover:text-gray-900 transition-colors"
                  style={{ color: '#6B7280', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                >
                  Created
                  {getSortIcon('creation')}
                </button>
              </div>
              <div className="col-span-2 flex items-center">
                <button
                  onClick={() => handleSort('modified')}
                  className="flex items-center text-sm font-medium hover:text-gray-900 transition-colors"
                  style={{ color: '#6B7280', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                >
                  Last Updated
                  {getSortIcon('modified')}
                </button>
              </div>
            </div>

            {/* Table Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>Loading tickets...</p>
                </div>
              ) : filteredAndSortedTickets.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="mb-4" style={{ color: '#6B7280' }}>No tickets found</p>
                  <Link href="/tickets/new">
                    <Button
                      style={{
                        background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                      }}
                    >
                      Create a ticket
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  {filteredAndSortedTickets.map((ticket, index) => (
                    <Link key={ticket.name} href={`/tickets/${ticket.name}`}>
                      <div
                        className={`grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          index !== filteredAndSortedTickets.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="col-span-6 flex flex-col justify-center">
                          <h3
                            className="text-sm font-medium mb-1"
                            style={{ color: '#000', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                          >
                            {ticket.subject}
                          </h3>
                          <p
                            className="text-xs line-clamp-1"
                            style={{ color: '#6B7280', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                          >
                            {stripHtmlTags(ticket.description)}
                          </p>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <Badge
                            variant={getStatusBadgeVariant(ticket.status)}
                            className="text-xs"
                            style={getStatusBadgeStyle(ticket.status)}
                          >
                            {ticket.status}
                          </Badge>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span
                            className="text-xs"
                            style={{ color: '#6B7280', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                          >
                            {ticket.creation ? new Date(ticket.creation).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span
                            className="text-xs"
                            style={{ color: '#6B7280', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
                          >
                            {ticket.modified ? new Date(ticket.modified).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}