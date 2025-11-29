'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search,
  BookOpen,
  Eye,
  ThumbsUp,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { HDArticle, FrappeResponse } from '@/types/frappe';
import { Sidebar } from '@/components/layout/Sidebar';

export default function KnowledgeBasePage() {
  const { isAuthenticated, logout } = useAuth();
  const [articles, setArticles] = useState<HDArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArticles, setFilteredArticles] = useState<HDArticle[]>([]);
  const [usingMockData, setUsingMockData] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load articles
  useEffect(() => {
    const loadArticles = async () => {
      try {
        setIsLoading(true);

        // Load articles from Frappe API
        try {
          console.log('🔍 Loading articles from Frappe API...');
          const response = await apiClient.getArticles() as FrappeResponse<HDArticle>;
          
          console.log('📄 API Response:', response);
          const articlesData = response.data || [];
          
          if (articlesData.length > 0) {
            console.log('✅ Found real articles:', articlesData.length);
            
            // Filter for published articles only for customer portal
            const publishedArticles = articlesData.filter(article => 
              article.status === 'Published'
            );
            
            console.log('📋 Published articles found:', publishedArticles.length);
            
            if (publishedArticles.length > 0) {
              // Map Frappe fields to our expected format
              const mappedArticles = publishedArticles.map(article => ({
                ...article,
                // Ensure we have all required fields
                title: article.title || 'Untitled',
                content: article.content || '',
                // Convert category ID to readable name, or use a generic name
                category: article.category && article.category.length > 10 ? 'Knowledge Base' : (article.category || 'General'),
                views: article.views || 0,
                creation: article.creation,
                modified: article.modified,
                owner: article.owner || article.author || 'Unknown',
                is_public: true, // All published articles are considered public
                helpful_count: 0 // HD Article doesn't seem to have this field
              }));
              
              setArticles(mappedArticles);
              setFilteredArticles(mappedArticles);
              setUsingMockData(false);
              return;
            } else {
              console.log('📭 No published articles found, using mock data');
            }
          } else {
            console.log('📭 No articles found in API, using mock data');
          }
        } catch (apiError) {
          console.warn('❌ Articles API request failed, using mock data:', apiError);
        }
        
        // If API failed or no real data, use mock data
        console.log('Using demo articles for knowledge base');
        setUsingMockData(true);
        
        // Mock articles data for demonstration
          const mockArticles: HDArticle[] = [
            {
              name: 'KB-001',
              title: 'Getting Started with SMYLS Support Portal',
              content: 'Welcome to the SMYLS Support Portal! This guide will help you navigate the system effectively. First, log in using your company credentials. Once logged in, you\'ll see the main dashboard with your recent tickets and announcements. Use the sidebar to navigate between Tickets and Knowledge Base sections. The search functionality allows you to quickly find relevant information across both tickets and articles.',
              category: 'Getting Started',
              status: 'Published',
              is_public: true,
              views: 156,
              helpful_count: 12,
              creation: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
              modified: new Date(Date.now() - 86400000).toISOString(),
              owner: 'Administrator'
            },
            {
              name: 'KB-002',
              title: 'How to Create and Manage Support Tickets',
              content: 'Creating support tickets is simple and efficient. Click the "Create a ticket" button from the dashboard. First, select your ticket type (Bug Report, Feature Request, Technical Support, etc.) to help us route your request properly. Write a clear, descriptive subject line. In the description, provide detailed information including steps to reproduce issues, expected vs actual behavior, and any error messages you encountered.',
              category: 'Tickets',
              status: 'Published',
              is_public: true,
              views: 89,
              helpful_count: 8,
              creation: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
              modified: new Date(Date.now() - 172800000).toISOString(),
              owner: 'Support Team'
            },
            {
              name: 'KB-003',
              title: 'Troubleshooting Common Login Issues',
              content: 'Having trouble logging in? Here are the most common solutions: 1) Verify your email address is correct and matches your company domain. 2) Check if Caps Lock is on when entering your password. 3) Clear your browser cache and cookies. 4) Try using an incognito/private browsing window. 5) Ensure JavaScript is enabled in your browser. If you\'re still experiencing issues, contact your system administrator or create a support ticket.',
              category: 'Troubleshooting',
              status: 'Published',
              is_public: true,
              views: 234,
              helpful_count: 19,
              creation: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
              modified: new Date(Date.now() - 259200000).toISOString(),
              owner: 'Technical Team'
            },
            {
              name: 'KB-004',
              title: 'Understanding Priority Levels for Tickets',
              content: 'Choosing the right priority level helps us respond appropriately to your needs. Critical: System down, blocking multiple users, security issues. High: Significant functionality broken, affecting business operations. Medium: Feature requests, non-critical bugs, general inquiries. Low: Documentation updates, minor enhancements, questions. Response times vary by priority: Critical (2 hours), High (4-8 hours), Medium (24 hours), Low (48-72 hours).',
              category: 'Best Practices',
              status: 'Published',
              is_public: true,
              views: 67,
              helpful_count: 5,
              creation: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
              modified: new Date().toISOString(),
              owner: 'Support Team'
            }
          ];
          
          console.log('Using mock articles:', mockArticles);
          console.log('First mock article title:', mockArticles[0]?.title);
          setArticles(mockArticles);
          setFilteredArticles(mockArticles);
      } catch (error: unknown) {
        console.error('Failed to load articles:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load knowledge base articles';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticles();
  }, []);

  const getUniqueCategories = useCallback(() => {
    const categories = articles
      .map(article => article.category)
      .filter(Boolean)
      .filter((category, index, self) => self.indexOf(category) === index);
    return categories as string[];
  }, [articles]);

  const performAPISearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      const response = await apiClient.searchArticles(searchQuery) as FrappeResponse<HDArticle>;
      const searchResults = response.data || [];
      setFilteredArticles(searchResults);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // Debounced search effect (like tickets page)
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFilteredArticles(articles);
        setSelectedCategory(null);
      } else {
        // Clear selected category if user manually types something different
        const categories = getUniqueCategories();
        if (!categories.includes(searchQuery)) {
          setSelectedCategory(null);
        }

        // Filter articles locally first for instant feedback
        const filtered = articles.filter(article =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.category?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filtered.length > 0) {
          setFilteredArticles(filtered);
        } else {
          // If no local results, try API search
          performAPISearch();
        }
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, articles, getUniqueCategories, performAPISearch]);

  const truncateContent = (content: string | undefined, maxLength: number = 200) => {
    if (!content) return 'No content available';
    
    // Remove HTML tags and decode HTML entities
    let textContent = content.replace(/<[^>]*>/g, '');
    
    // Clean up common HTML entities
    textContent = textContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, '...')
      // Remove extra whitespace and line breaks
      .replace(/\s+/g, ' ')
      .trim();
    
    // If content is still too short or empty after cleaning, provide a default
    if (!textContent || textContent.length < 10) {
      return 'Click to read more about this article...';
    }
    
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category) {
      // If clicking the already selected category, deselect it
      setSelectedCategory(null);
      setSearchQuery('');
    } else {
      // Select the new category
      setSelectedCategory(category);
      setSearchQuery(category);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="h-12 flex items-center justify-between px-6 border-b border-gray-200">
          <h1 
            className="text-xl font-medium"
            style={{ 
              color: '#000',
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
            }}
          >
            Knowledge Base
          </h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto" style={{ background: '#FFF' }}>
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search articles, solutions, and guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-lg border-gray-300"
              style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}
            />
          </div>
          
          {getUniqueCategories().length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Popular Categories:</p>
              <div className="flex flex-wrap gap-2">
                {getUniqueCategories().slice(0, 5).map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryClick(category)}
                    style={{
                      background: selectedCategory === category
                        ? 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)'
                        : 'transparent',
                      borderColor: '#00AEEF',
                      color: selectedCategory === category ? 'white' : '#00AEEF',
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                    }}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Articles'}
            </h2>
            <p className="text-sm text-gray-600">
              {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'} found
              {usingMockData && (
                <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Demo Data
                </span>
              )}
            </p>
          </div>
          
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                setFilteredArticles(articles);
              }}
            >
              Clear Search
            </Button>
          )}
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading articles...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No articles found' : 'No articles available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms or browse all articles'
                : 'Check back later for helpful guides and solutions'
              }
            </p>
            {searchQuery && (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setFilteredArticles(articles);
                }}
              >
                View All Articles
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              console.log('Rendering filteredArticles:', filteredArticles);
              console.log('filteredArticles length:', filteredArticles.length);
              return filteredArticles.map((article, index) => {
                console.log(`Article ${index}:`, article);
                console.log(`Article ${index} title:`, article.title);
                return (
              <Link key={article.name} href={`/knowledge-base/${article.name}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle 
                        className="text-lg line-clamp-2 flex-1"
                        style={{ 
                          color: '#000',
                          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                        }}
                      >
                        {article.title || 'Untitled Article'}
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{article.creation ? new Date(article.creation).toLocaleDateString() : 'No date'}</span>
                      </div>
                      {article.views !== undefined && (
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{article.views}</span>
                        </div>
                      )}
                    </div>
                    
                    <Badge 
                      variant="outline" 
                      className="w-fit mt-2 text-white border-none"
                      style={{
                        background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                      }}
                    >
                      {article.category || 'General'}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {truncateContent(article.content)}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>By {article.author || article.owner || 'Unknown'}</span>
                      </div>
                      
                      {(article.helpful_count || article.not_helpful_count) && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{article.helpful_count || 0}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
                );
              });
            })()}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardContent className="py-4">
            <div className="text-center">
              <h3
                className="text-lg font-medium mb-3"
                style={{
                  color: '#000',
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                Can&apos;t find what you&apos;re looking for?
              </h3>
              <div className="flex flex-col items-center gap-2">
                <Link href="/tickets/new">
                  <Button
                    className="text-white"
                    style={{
                      background: 'linear-gradient(90deg, #00AEEF 0%, #2ABDAD 100%)',
                      border: 'none',
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                    }}
                  >
                    Create a ticket
                  </Button>
                </Link>
                <span className="text-sm text-gray-600">
                  Contact us: <a href="mailto:support@smyls.ca" className="text-blue-600 hover:underline">support@smyls.ca</a>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}