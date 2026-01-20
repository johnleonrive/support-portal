import { NextRequest, NextResponse } from 'next/server';

const FRAPPE_BASE_URL = process.env.NEXT_PUBLIC_FRAPPE_BASE_URL || 'https://intern-dev.frappe.cloud';

// Admin API credentials (server-side only - NOT exposed to browser)
// Used for privileged operations like user impersonation and accessing private resources
const ADMIN_API_KEY = process.env.FRAPPE_ADMIN_API_KEY;
const ADMIN_API_SECRET = process.env.FRAPPE_ADMIN_API_SECRET;

// App API credentials (server-side only - NOT exposed to browser)
// Used for general app operations - falls back to admin credentials if not set
// Currently unused but available for future separation of concerns
const APP_API_KEY = process.env.FRAPPE_APP_API_KEY || ADMIN_API_KEY;
const APP_API_SECRET = process.env.FRAPPE_APP_API_SECRET || ADMIN_API_SECRET;
void APP_API_KEY; void APP_API_SECRET; // Suppress unused warnings

// Debug: Log API key status (first few characters only for security)
if (process.env.NEXT_PUBLIC_API_DEBUG === 'true') {
  console.log(`[API Proxy] ADMIN_API_KEY: ${ADMIN_API_KEY ? ADMIN_API_KEY.substring(0, 8) + '...' : 'MISSING'}`);
  console.log(`[API Proxy] APP_API_KEY: ${APP_API_KEY ? APP_API_KEY.substring(0, 8) + '...' : 'MISSING'}`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const searchParams = request.nextUrl.searchParams;
  
  const url = new URL(`${FRAPPE_BASE_URL}/api/${path}`);
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Check if we should skip user impersonation (for admin-level queries like clinic-based filtering)
    const skipImpersonation = request.headers.get('x-skip-impersonation') === 'true';

    // Forward cookies from client to Frappe for session-based auth
    // BUT NOT when skipping impersonation - session cookies would override admin token permissions
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader && !skipImpersonation) {
      headers['Cookie'] = cookieHeader;
      console.log(`[API Proxy] Forwarding cookies to Frappe`);
    } else if (skipImpersonation) {
      console.log(`[API Proxy] NOT forwarding cookies - using pure admin token auth`);
    }

    // Use admin tokens for reliable API access, with user-scoped filtering
    if (ADMIN_API_KEY && ADMIN_API_SECRET) {
      headers['Authorization'] = `token ${ADMIN_API_KEY}:${ADMIN_API_SECRET}`;

      // Check for user impersonation header to ensure correct attribution
      // Skip impersonation for ticket listing to allow clinic-based filtering across users
      const userEmail = request.headers.get('x-user-email');
      if (userEmail && !skipImpersonation) {
        headers['X-Frappe-User'] = userEmail;
        console.log(`[API Proxy] Impersonating user: ${userEmail}`);
      } else if (skipImpersonation) {
        console.log(`[API Proxy] Skipping user impersonation - using admin credentials only`);
      }
    }

    console.log(`[API Proxy] GET ${url.toString()}`);
    console.log(`[API Proxy] Headers:`, Object.keys(headers).includes('Cookie') ? {...headers, Cookie: '[FORWARDED]'} : headers);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies in the request
    });

    const data = await response.text();

    console.log(`[API Proxy] Response Status:`, response.status);
    console.log(`[API Proxy] Response Data:`, data);

    // Forward Set-Cookie headers from Frappe back to client
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`[API Proxy] Forwarding ${setCookieHeaders.length} Set-Cookie headers to client`);
    }

    const nextResponse = new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    });

    // Set cookies on the response
    setCookieHeaders.forEach(cookie => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error('Frappe API Error:', error);
    return NextResponse.json(
      { message: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const body = await request.text();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Forward cookies from client to Frappe for session-based auth
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
      console.log(`[API Proxy] Forwarding cookies to Frappe`);
    }

    // Use admin tokens for reliable API access, with user-scoped filtering
    if (ADMIN_API_KEY && ADMIN_API_SECRET) {
      headers['Authorization'] = `token ${ADMIN_API_KEY}:${ADMIN_API_SECRET}`;

      // Check for user impersonation header to ensure correct attribution
      const userEmail = request.headers.get('x-user-email');
      if (userEmail) {
        headers['X-Frappe-User'] = userEmail;
        console.log(`[API Proxy] Impersonating user: ${userEmail}`);
      }
    }

    console.log(`[API Proxy] POST ${FRAPPE_BASE_URL}/api/${path}`);
    console.log(`[API Proxy] Body:`, body);
    console.log(`[API Proxy] Headers:`, Object.keys(headers).includes('Cookie') ? {...headers, Cookie: '[FORWARDED]'} : headers);

    const response = await fetch(`${FRAPPE_BASE_URL}/api/${path}`, {
      method: 'POST',
      headers,
      body,
      credentials: 'include', // Include cookies in the request
    });

    const data = await response.text();

    console.log(`[API Proxy] Response Status:`, response.status);
    console.log(`[API Proxy] Response Data:`, data);

    // Forward Set-Cookie headers from Frappe back to client
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`[API Proxy] Forwarding ${setCookieHeaders.length} Set-Cookie headers to client`);
    }

    const nextResponse = new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    });

    // Set cookies on the response
    setCookieHeaders.forEach(cookie => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error('Frappe API Error:', error);
    return NextResponse.json(
      { message: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const body = await request.text();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Forward cookies from client to Frappe for session-based auth
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
      console.log(`[API Proxy] Forwarding cookies to Frappe`);
    }

    // Use admin tokens for reliable API access, with user-scoped filtering
    if (ADMIN_API_KEY && ADMIN_API_SECRET) {
      headers['Authorization'] = `token ${ADMIN_API_KEY}:${ADMIN_API_SECRET}`;

      // Check for user impersonation header to ensure correct attribution
      const userEmail = request.headers.get('x-user-email');
      if (userEmail) {
        headers['X-Frappe-User'] = userEmail;
        console.log(`[API Proxy] Impersonating user: ${userEmail}`);
      }
    }

    const response = await fetch(`${FRAPPE_BASE_URL}/api/${path}`, {
      method: 'PUT',
      headers,
      body,
      credentials: 'include', // Include cookies in the request
    });

    const data = await response.text();

    // Forward Set-Cookie headers from Frappe back to client
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`[API Proxy] Forwarding ${setCookieHeaders.length} Set-Cookie headers to client`);
    }

    const nextResponse = new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    });

    // Set cookies on the response
    setCookieHeaders.forEach(cookie => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error('Frappe API Error:', error);
    return NextResponse.json(
      { message: 'Proxy request failed' },
      { status: 500 }
    );
  }
}