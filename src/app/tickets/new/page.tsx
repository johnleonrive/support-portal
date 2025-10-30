'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { CreateTicketData, HDTicket } from '@/types/frappe';

export default function NewTicketPage() {
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    contactName: '',
    contactEmail: '',
    phoneNumber: '',
    ticketType: 'Support'
  });

  // Initialize contact info with user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        contactName: user.full_name || '',
        contactEmail: user.email || ''
      }));
    }
  }, [user]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if not authenticated (only after hydration completes)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strip HTML tags to check if there's actual content
    const stripHtml = (html: string) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    if (!formData.subject.trim() || !stripHtml(formData.description).trim()) {
      setError('Subject and description are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ticketData: CreateTicketData = {
        subject: formData.subject,
        description: formData.description,
        raised_by: formData.contactEmail || user?.email || '',
      };

      // Always include ticket_type, default to "Support" if not specified
      ticketData.ticket_type = formData.ticketType || 'Support';

      // Include phone number if provided
      if (formData.phoneNumber.trim()) {
        ticketData.contact = formData.phoneNumber;
      }

      console.log('Creating ticket with data:', {
        ...ticketData,
        doctype: 'HD Ticket',
        status: 'Open',
        owner: user?.email || '',
        modified_by: user?.email || ''
      });

      try {
        const response = await apiClient.createTicket({
          ...ticketData,
          doctype: 'HD Ticket',
          status: 'Open',
          owner: user?.email || '',
          modified_by: user?.email || ''
        }) as { data: HDTicket };

        console.log('✅ Ticket created successfully via API:', response.data);
        
        // Show success message
        alert(`✅ Ticket "${response.data.name}" created successfully in Frappe!`);
        
        // Redirect to the new ticket
        router.push(`/tickets/${response.data.name}`);
      } catch (apiError: any) {
        console.error('❌ Create ticket API request failed:', apiError);
        
        // Check if it's an authentication error - if so, show more specific message
        if (apiError?.message?.includes('Authentication') || apiError?.status === 401) {
          setError('Authentication failed. Please check if you have permission to create tickets.');
          return;
        }
        
        // For other API errors, show the actual error but also offer to create locally
        const errorMsg = apiError?.message || 'Unknown API error';
        const createLocal = confirm(
          `API Error: ${errorMsg}\n\nWould you like to create a local ticket instead? ` +
          `(This will work in the portal but won't sync to Frappe)`
        );
        
        if (!createLocal) {
          setError(`Failed to create ticket: ${errorMsg}`);
          return;
        }
        
        // Create local ticket only if user confirms
        console.log('Creating local fallback ticket...');
        const mockTicketId = `TKT-${Date.now()}`;
        const mockTicket: HDTicket = {
          name: mockTicketId,
          subject: ticketData.subject,
          description: ticketData.description,
          status: 'Open',
          priority: ticketData.priority || 'Medium',
          ticket_type: ticketData.ticket_type,
          raised_by: formData.contactEmail || user?.email || '',
          contact: formData.phoneNumber || undefined,
          creation: new Date().toISOString(),
          modified: new Date().toISOString(),
          owner: user?.email || '',
          docstatus: 0,
          modified_by: user?.email || ''
        };

        // Store the mock ticket in user-specific localStorage for retrieval
        const userTicketsKey = `mockTickets_${user?.email}`;
        const existingTickets = JSON.parse(localStorage.getItem(userTicketsKey) || '[]');
        existingTickets.push(mockTicket);
        localStorage.setItem(userTicketsKey, JSON.stringify(existingTickets));
        
        alert(`📋 Local ticket "${mockTicketId}" created successfully!\n\nNote: This ticket exists only in your browser and won't sync to Frappe.`);
        
        // Redirect to the new ticket detail page
        router.push(`/tickets/${mockTicketId}`);
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ticket. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        <Card>
          <CardHeader>
            <CardTitle>Create New Support Ticket</CardTitle>
            <CardDescription>
              Describe your issue and we&apos;ll get back to you as soon as possible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Ticket Type */}
              <div className="space-y-2">
                <Label htmlFor="ticketType">Ticket Type (Optional)</Label>
                <Select
                  value={formData.ticketType}
                  onValueChange={(value) => handleInputChange('ticketType', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(content) => handleInputChange('description', content)}
                  placeholder="Provide detailed information about your issue. Include any error messages, steps to reproduce, and what you expected to happen. You can format text, add images, and more using the toolbar above."
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-500">
                  Use the toolbar to format your text, add images, links, and more
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="contactName">Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="Enter your name"
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-between pt-6">
                <Link href="/dashboard">
                  <Button type="button" variant="outline" disabled={isLoading}>
                    Cancel
                  </Button>
                </Link>
                
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="text-white"
                  style={{ 
                    background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                    border: 'none',
                    fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Ticket...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}