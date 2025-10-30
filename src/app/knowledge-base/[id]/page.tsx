'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Calendar,
  User,
  Eye,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Share2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { HDArticle } from '@/types/frappe';

export default function ArticleDetailsPage() {
  const params = useParams();
  const articleId = params?.id as string;
  const { isAuthenticated } = useAuth();
  const [article, setArticle] = useState<HDArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load article details
  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) return;
      
      try {
        setIsLoading(true);
        
        // Try to load real data first, fallback to mock data if API fails
        try {
          const response = await apiClient.getArticle(articleId) as { data: HDArticle };
          
          // Check if article is published (only show published articles to users)
          if (response.data.status !== 'Published') {
            setError('This article is not available or has not been published yet');
            return;
          }
          
          setArticle(response.data);
        } catch (apiError) {
          console.warn('Article detail API request failed, using mock data:', apiError);
          
          // Mock article data based on articleId - matches the knowledge base mock data
          const mockArticles: Record<string, HDArticle> = {
            'KB-001': {
              name: 'KB-001',
              title: 'Getting Started with SMYLS Support Portal',
              content: `# Getting Started with SMYLS Support Portal

Welcome to the SMYLS Support Portal! This comprehensive guide will help you navigate and use all the features effectively.

## Overview
The SMYLS Support Portal is designed to provide you with seamless access to support resources, ticket management, and knowledge base articles.

## Key Features

### 1. Dashboard
Your dashboard provides a quick overview of:
- Recent tickets and their status
- Quick actions for creating new tickets
- Important announcements and updates

### 2. Ticket Management
- **Create Tickets**: Submit new support requests with detailed descriptions
- **Track Progress**: Monitor the status of your tickets in real-time
- **Priority Levels**: Understand and set appropriate priority levels
- **Updates**: Receive notifications when tickets are updated

### 3. Knowledge Base
- **Search Articles**: Find solutions to common issues
- **Browse Categories**: Explore articles by topic
- **Helpful Ratings**: Help others by rating articles

## Getting Help
If you need additional assistance:
- Use the "Create Ticket" button for specific issues
- Browse the knowledge base for self-service solutions
- Check your email for ticket updates

## Tips for Success
- Be specific when describing issues
- Include relevant details and error messages
- Use the search function to find existing solutions
- Set appropriate priority levels for your requests

We're here to help! Don't hesitate to reach out through our support channels.`,
              category: 'Getting Started',
              status: 'Published',
              is_public: true,
              views: 156,
              helpful_count: 12,
              creation: new Date(Date.now() - 604800000).toISOString(),
              modified: new Date(Date.now() - 86400000).toISOString(),
              owner: 'Administrator'
            },
            'KB-002': {
              name: 'KB-002',
              title: 'How to Create and Manage Support Tickets',
              content: `# How to Create and Manage Support Tickets

This step-by-step guide will walk you through the process of creating, tracking, and managing your support tickets effectively.

## Creating a New Ticket

### Step 1: Access the Create Ticket Form
1. Navigate to the Dashboard
2. Click the "Create New Ticket" button
3. Or use the "New Ticket" option in the sidebar

### Step 2: Fill Out the Details
- **Subject**: Provide a clear, descriptive title
- **Priority**: Select appropriate priority level
- **Type**: Choose the ticket category
- **Description**: Include detailed information about the issue

### Step 3: Best Practices for Descriptions
Include the following when describing issues:
- Steps to reproduce the problem
- Expected vs actual behavior
- Error messages (exact text)
- Browser/device information
- Screenshots if helpful

## Managing Your Tickets

### Tracking Status
Tickets progress through these stages:
- **Open**: Newly created, awaiting review
- **In Progress**: Being worked on by support team
- **Waiting for Customer**: Requires your input
- **Resolved**: Issue has been fixed
- **Closed**: Ticket completed

## Tips for Effective Ticket Management
- Use clear, descriptive subjects
- Be specific about the problem
- Include relevant context
- Respond promptly to requests for information

Remember: Good communication leads to faster resolution times!`,
              category: 'Tickets',
              status: 'Published',
              is_public: true,
              views: 89,
              helpful_count: 8,
              creation: new Date(Date.now() - 432000000).toISOString(),
              modified: new Date(Date.now() - 172800000).toISOString(),
              owner: 'Support Team'
            },
            'KB-003': {
              name: 'KB-003',
              title: 'Troubleshooting Common Login Issues',
              content: `# Troubleshooting Common Login Issues

Having trouble logging in? This guide covers the most common authentication and login problems and their solutions.

## Common Login Problems

### Issue 1: "Invalid Credentials" Error
**Solutions**:
1. Double-check your email address for typos
2. Verify Caps Lock is off
3. Try typing your password manually
4. Use the "Forgot Password" link if you're unsure

### Issue 2: Login Page Keeps Refreshing
**Solutions**:
1. Enable cookies in your browser settings
2. Enable JavaScript
3. Clear browser cache and cookies
4. Try a different browser
5. Check your internet connection

### Issue 3: "Access Denied" After Login
**Solutions**:
1. Contact your administrator
2. Check your email for activation instructions
3. Verify your account status

## Advanced Troubleshooting

### Browser-Specific Issues
- **Chrome**: Clear browsing data, try incognito mode
- **Firefox**: Clear cookies, try private browsing
- **Safari**: Clear website data, try private browsing

### When to Contact Support
Contact our support team if none of the above solutions work.

Need additional help? Create a support ticket with the details of your login issue!`,
              category: 'Troubleshooting',
              status: 'Published',
              is_public: true,
              views: 234,
              helpful_count: 19,
              creation: new Date(Date.now() - 1209600000).toISOString(),
              modified: new Date(Date.now() - 259200000).toISOString(),
              owner: 'Technical Team'
            },
            'KB-004': {
              name: 'KB-004',
              title: 'Understanding Priority Levels for Tickets',
              content: `# Understanding Priority Levels for Tickets

Choosing the right priority level helps ensure your tickets receive appropriate attention and response times.

## Priority Levels Overview

### Critical Priority 🔴
**When to Use**: System completely down, security issues, critical business functions blocked
**Response Time**: Within 1 hour

### High Priority 🟠  
**When to Use**: Major functionality not working, significant productivity impact
**Response Time**: Within 4 hours (business hours)

### Medium Priority 🟡
**When to Use**: Minor functionality issues, easy workaround available
**Response Time**: Within 24 hours (business hours)

### Low Priority 🟢
**When to Use**: Questions, training requests, nice-to-have enhancements  
**Response Time**: Within 2-3 business days

## How Priority Affects Response

Priority affects both response time and escalation process. Critical and High priority tickets are immediately escalated to senior team members.

## Choosing the Right Priority

Ask yourself:
1. How many people are affected?
2. Is there a workaround?
3. What's the business impact?

## Tips for Better Prioritization
1. Be honest about impact
2. Consider other users
3. Think about business context
4. Include workaround information
5. Explain your reasoning

Remember: Accurate prioritization helps everyone get the right level of support!`,
              category: 'Best Practices',
              status: 'Published',
              is_public: true,
              views: 67,
              helpful_count: 5,
              creation: new Date(Date.now() - 259200000).toISOString(),
              modified: new Date().toISOString(),
              owner: 'Support Team'
            }
          };
          
          const mockArticle = mockArticles[articleId];
          if (mockArticle) {
            setArticle(mockArticle);
          } else {
            setError('Article not found');
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load article';
        setError(errorMessage);
        console.error('Failed to load article:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  const handleFeedback = async (isHelpful: boolean) => {
    // This would typically update the article's helpful/not helpful count
    // For now, we'll just show a message
    console.log(`Feedback: ${isHelpful ? 'Helpful' : 'Not Helpful'}`);
    // TODO: Implement feedback API call
  };

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
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
              <Link href="/knowledge-base">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Knowledge Base
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

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Article not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/knowledge-base">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Knowledge Base
              </Button>
            </Link>
            
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Article Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="space-y-4">
              {/* Category and Badges */}
              <div className="flex items-center space-x-2">
                {article.category && (
                  <Badge variant="outline">{article.category}</Badge>
                )}
                <Badge variant="secondary">{article.status}</Badge>
              </div>

              {/* Title */}
              <CardTitle className="text-2xl md:text-3xl leading-tight">
                {article.title}
              </CardTitle>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>By {article.author || article.owner || 'Unknown'}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Published {article.creation ? new Date(article.creation).toLocaleDateString() : 'No date'}</span>
                </div>

                {article.modified && article.modified !== article.creation && (
                  <div className="flex items-center space-x-1">
                    <span>Updated {new Date(article.modified).toLocaleDateString()}</span>
                  </div>
                )}

                {article.views !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{article.views} views</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Article Content */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div 
              className="prose max-w-none prose-gray prose-headings:text-gray-900 prose-a:text-blue-600"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium">Was this article helpful?</h3>
              
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(true)}
                  className="flex items-center space-x-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Yes</span>
                  {article.helpful_count && (
                    <Badge variant="secondary" className="ml-2">
                      {article.helpful_count}
                    </Badge>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(false)}
                  className="flex items-center space-x-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>No</span>
                  {article.not_helpful_count && (
                    <Badge variant="secondary" className="ml-2">
                      {article.not_helpful_count}
                    </Badge>
                  )}
                </Button>
              </div>
              
              <p className="text-sm text-gray-600">
                Your feedback helps us improve our documentation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Need More Help */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <BookOpen className="h-12 w-12 text-blue-600 mx-auto" />
              <h3 className="text-lg font-medium">Still need help?</h3>
              <p className="text-gray-600">
                If this article didn&apos;t solve your problem, our support team is here to help.
              </p>
              
              <div className="flex justify-center space-x-4">
                <Link href="/tickets/new">
                  <Button>Create Support Ticket</Button>
                </Link>
                <Link href="/knowledge-base">
                  <Button variant="outline">Browse More Articles</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Article Details Sidebar (could be moved to a sidebar in larger screens) */}
        {article.tags && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {article.tags.split(',').map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}