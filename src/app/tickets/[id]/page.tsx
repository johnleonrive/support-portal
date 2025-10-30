'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { HDTicket, HDCommunication } from '@/types/frappe';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

export default function TicketDetailsPage() {
  const params = useParams();
  const ticketId = params?.id as string;
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [ticket, setTicket] = useState<HDTicket | null>(null);
  const [replies, setReplies] = useState<HDCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newReply, setNewReply] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const router = useRouter();

  // Redirect if not authenticated (only after hydration completes)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Load ticket details
  useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId || !user) return;
      
      try {
        setIsLoading(true);
        
        // Try to load real data first, fallback to mock data if API fails
        try {
          const response = await apiClient.getTicket(ticketId) as { data: HDTicket };
          
          // Check if user has permission to view this ticket
          if (response.data.raised_by !== user.email) {
            setError('You do not have permission to view this ticket');
            return;
          }
          
          setTicket(response.data);
        } catch (apiError) {
          console.warn('Ticket detail API request failed, checking localStorage and mock data:', apiError);
          
          // First check user-specific localStorage for recently created tickets
          const userTicketsKey = `mockTickets_${user.email}`;
          const localTickets = JSON.parse(localStorage.getItem(userTicketsKey) || '[]') as HDTicket[];
          const localTicket = localTickets.find(t => t.name === ticketId);
          
          if (localTicket && localTicket.raised_by === user.email) {
            setTicket(localTicket);
            return;
          }
          
          // Mock ticket data based on ticketId - matches the dashboard mock data
          const mockTickets: Record<string, HDTicket> = {
            'TKT-2024-001': {
              name: 'TKT-2024-001',
              subject: 'Login Issues with SMYLS Portal',
              description: 'Unable to access the dashboard after recent updates. Getting authentication errors.\n\nSteps to reproduce:\n1. Navigate to login page\n2. Enter correct credentials\n3. Click login button\n4. Redirected back to login\n\nExpected: Should be taken to dashboard\nActual: Stuck on login page with no error message\n\nThis started happening after the latest update yesterday. Other users are reporting similar issues.',
              status: 'Open',
              priority: 'High',
              raised_by: user.email,
              creation: new Date().toISOString(),
              modified: new Date().toISOString(),
              owner: user.email,
              ticket_type: 'Technical Support'
            },
            'TKT-2024-002': {
              name: 'TKT-2024-002', 
              subject: 'Feature Request: Dark Mode',
              description: 'It would be great to have a dark mode option for better user experience.\n\nDetails:\n- Dark theme for main interface\n- Toggle switch in user preferences\n- Remember preference across sessions\n- Apply to all pages including login\n\nThis would help reduce eye strain during extended use, especially in low-light environments.',
              status: 'Replied',
              priority: 'Medium',
              raised_by: user.email,
              creation: new Date(Date.now() - 86400000).toISOString(),
              modified: new Date().toISOString(),
              owner: user.email,
              ticket_type: 'Feature Request'
            },
            'TKT-2024-003': {
              name: 'TKT-2024-003',
              subject: 'Email Notification Setup',
              description: 'Need help configuring email notifications for ticket updates.\n\nRequirements:\n- Email when ticket status changes\n- Email when new comments are added\n- Option to disable notifications per ticket\n- Summary email for multiple updates\n\nPlease provide step-by-step instructions for setting this up in my account preferences.',
              status: 'Resolved',
              priority: 'Low',
              raised_by: user.email,
              creation: new Date(Date.now() - 172800000).toISOString(),
              modified: new Date().toISOString(),
              owner: user.email,
              ticket_type: 'General Inquiry'
            }
          };
          
          const mockTicket = mockTickets[ticketId];
          if (mockTicket) {
            setTicket(mockTicket);
          } else {
            setError('Ticket not found');
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load ticket details';
        setError(errorMessage);
        console.error('Failed to load ticket:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && ticketId) {
      loadTicket();
    }
  }, [user, ticketId]);

  // Load ticket replies
  const loadReplies = useCallback(async () => {
    if (!ticketId) return;

    try {
      setIsLoadingReplies(true);

      // Use mock data for now due to permissions issues with HD Ticket Comment
      // TODO: Fix permissions for customer users to read HD Ticket Comment
      console.log('📋 Loading mock replies for demo purposes');

      const mockReplies: HDCommunication[] = [
        {
          name: 'COMM-001',
          content: '<p>Thank you for reporting this issue. We are currently investigating the authentication problems and will update you shortly.</p>',
          sender: 'support@smyls.ca',
          sender_full_name: 'SMYLS Support Team',
          creation: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          modified: new Date(Date.now() - 3600000).toISOString(),
          owner: 'support@smyls.ca',
          docstatus: 0,
          communication_type: 'Comment',
          sent_or_received: 'Received',
          reference_doctype: 'HD Ticket',
          reference_name: ticketId,
          modified_by: 'support@smyls.ca',
          commented_by: 'support@smyls.ca',
          reference_ticket: ticketId
        },
        {
          name: 'COMM-002',
          content: '<p>Hi, thank you for the quick response. I tried the suggested steps but I\'m still having the same issue. Could you please provide additional guidance?</p>',
          sender: user?.email || 'user@example.com',
          sender_full_name: user?.full_name || 'User',
          creation: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          modified: new Date(Date.now() - 1800000).toISOString(),
          owner: user?.email || 'user@example.com',
          docstatus: 0,
          communication_type: 'Comment',
          sent_or_received: 'Sent',
          reference_doctype: 'HD Ticket',
          reference_name: ticketId,
          modified_by: user?.email || 'user@example.com',
          commented_by: user?.email || 'user@example.com',
          reference_ticket: ticketId
        }
      ];
      setReplies(mockReplies);
    } catch (error: unknown) {
      console.error('Failed to load replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [ticketId, user]);

  // Load replies when ticket is loaded
  useEffect(() => {
    if (ticket) {
      loadReplies();
    }
  }, [ticket, loadReplies]);

  // Submit new reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strip HTML tags to check if there's actual content
    const stripHtml = (html: string) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    if (!stripHtml(newReply).trim() || !ticketId || !user) return;

    try {
      setIsSubmittingReply(true);

      // Add reply locally (demo mode - permissions need to be fixed for API)
      console.log('📤 Adding reply locally (demo mode)');

      const mockReplyData: HDCommunication = {
        name: `COMM-MOCK-${Date.now()}`,
        content: newReply,
        sender: user.email,
        sender_full_name: user.full_name || user.email,
        creation: new Date().toISOString(),
        modified: new Date().toISOString(),
        owner: user.email,
        docstatus: 0,
        communication_type: 'Comment',
        sent_or_received: 'Sent',
        reference_doctype: 'HD Ticket',
        reference_name: ticketId,
        modified_by: user.email,
        commented_by: user.email,
        reference_ticket: ticketId
      };

      setReplies(prevReplies => [...prevReplies, mockReplyData]);
      setNewReply('');

      console.log('✅ Reply added successfully (local only)');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reply. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getStatusIcon = (status: HDTicket['status']) => {
    switch (status) {
      case 'Open':
        return <AlertCircle className="h-4 w-4" />;
      case 'Replied':
        return <MessageSquare className="h-4 w-4" />;
      case 'Resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'Closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">#{ticket.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ticket Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{ticket.subject}</CardTitle>
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <Badge 
                  className={`flex items-center space-x-1 ${
                    ticket.status === 'Open' || ticket.status === 'Replied'
                      ? 'text-white border-none'
                      : 'border-2 bg-transparent'
                  }`}
                  style={
                    ticket.status === 'Open' || ticket.status === 'Replied'
                      ? {
                          background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)'
                        }
                      : {
                          borderColor: '#00AEEF',
                          background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }
                  }
                >
                  <span className={ticket.status === 'Open' || ticket.status === 'Replied' ? 'text-white' : ''}>
                    {getStatusIcon(ticket.status)}
                  </span>
                  <span>{ticket.status}</span>
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Ticket Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose max-w-none prose-gray"
                  dangerouslySetInnerHTML={{ __html: ticket.description }}
                />
              </CardContent>
            </Card>

            {/* Resolution (if resolved) */}
            {ticket.resolution && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Resolution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose max-w-none prose-gray"
                    dangerouslySetInnerHTML={{ __html: ticket.resolution }}
                  />
                  {ticket.resolution_date && (
                    <div className="mt-4 text-sm text-gray-600">
                      Resolved on {new Date(ticket.resolution_date).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Conversation History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MessageSquare 
                    className="h-5 w-5" 
                    style={{
                      background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  />
                  <span>Conversation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Loading state */}
                  {isLoadingReplies ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading conversation...</p>
                    </div>
                  ) : (
                    <>
                      {/* Replies list */}
                      {replies.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p>No replies yet. Be the first to reply!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {replies
                            .sort((a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime())
                            .map((reply) => {
                              // Check if this message is from the current user (customer)
                              const isFromCurrentUser = reply.sender === user?.email;
                              
                              return (
                                <div
                                  key={reply.name}
                                  className={`p-4 rounded-lg border ${
                                    isFromCurrentUser 
                                      ? 'bg-gray-50 border-gray-200 ml-8' // Customer messages: right-aligned and gray
                                      : 'mr-8' // Admin/agent messages: left-aligned with gradient
                                  }`}
                                  style={!isFromCurrentUser ? {
                                    background: 'linear-gradient(135deg, #00AEEF 0%, #2ABDAD 100%)',
                                    borderColor: '#00AEEF',
                                    color: 'white'
                                  } : {}}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                        isFromCurrentUser 
                                          ? 'bg-gray-600' 
                                          : 'bg-white bg-opacity-20'
                                      }`}>
                                        {(reply.sender_full_name || reply.sender)?.charAt(0)?.toUpperCase() || 'U'}
                                      </div>
                                      <div>
                                        <p className={`text-sm font-medium ${
                                          isFromCurrentUser ? 'text-gray-900' : 'text-white'
                                        }`}>
                                          {reply.sender_full_name || reply.sender}
                                        </p>
                                        <p className={`text-xs ${
                                          isFromCurrentUser ? 'text-gray-500' : 'text-white text-opacity-80'
                                        }`}>
                                          {new Date(reply.creation).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={`prose max-w-none ${
                                      isFromCurrentUser ? 'prose-gray' : 'prose-invert'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: reply.content }}
                                  />
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Reply form */}
                      {ticket.status !== 'Closed' && (
                        <form onSubmit={handleSubmitReply} className="mt-6 pt-6 border-t">
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="reply" className="block text-sm font-medium text-gray-700 mb-2">
                                Add a reply
                              </label>
                              <RichTextEditor
                                content={newReply}
                                onChange={setNewReply}
                                placeholder="Type your reply here. You can format text, add images, links, and more using the toolbar above."
                                disabled={isSubmittingReply}
                              />
                              <p className="text-sm text-gray-500 mt-2">
                                Use the toolbar to format your text, add images, links, and more
                              </p>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                type="submit"
                                disabled={isSubmittingReply || !newReply.trim()}
                                className="text-white"
                                style={{
                                  background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                                  border: 'none',
                                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                                }}
                              >
                                {isSubmittingReply ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Send Reply
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Ticket ID</h4>
                  <p className="text-sm text-gray-600">#{ticket.name}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Status</h4>
                  <Badge 
                    className={`flex items-center space-x-1 w-fit ${
                      ticket.status === 'Open' || ticket.status === 'Replied'
                        ? 'text-white border-none'
                        : 'border-2 bg-transparent'
                    }`}
                    style={
                      ticket.status === 'Open' || ticket.status === 'Replied'
                        ? {
                            background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)'
                          }
                        : {
                            borderColor: '#00AEEF',
                            background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }
                    }
                  >
                    <span className={ticket.status === 'Open' || ticket.status === 'Replied' ? 'text-white' : ''}>
                      {getStatusIcon(ticket.status)}
                    </span>
                    <span>{ticket.status}</span>
                  </Badge>
                </div>

                {ticket.ticket_type && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Type</h4>
                      <p className="text-sm text-gray-600">{ticket.ticket_type}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Raised By</h4>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{ticket.raised_by}</span>
                  </div>
                </div>

                {ticket.assigned_to && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Assigned To</h4>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{ticket.assigned_to}</span>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Created</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(ticket.creation).toLocaleString()}
                  </p>
                </div>

                {ticket.modified !== ticket.creation && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Last Updated</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(ticket.modified).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}