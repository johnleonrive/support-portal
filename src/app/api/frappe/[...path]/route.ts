import { NextRequest, NextResponse } from 'next/server';

const FRAPPE_BASE_URL = process.env.NEXT_PUBLIC_FRAPPE_BASE_URL || 'https://intern-dev.frappe.cloud';
const API_KEY = process.env.NEXT_PUBLIC_FRAPPE_API_KEY;
const API_SECRET = process.env.NEXT_PUBLIC_FRAPPE_API_SECRET;

// Debug: Log API key status (first few characters only for security)
console.log(`[API Proxy] API_KEY: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'MISSING'}`);
console.log(`[API Proxy] API_SECRET: ${API_SECRET ? API_SECRET.substring(0, 8) + '...' : 'MISSING'}`);

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

    // Forward cookies from client to Frappe for session-based auth
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
      console.log(`[API Proxy] Forwarding cookies to Frappe`);
    }

    // Use admin tokens for reliable API access, with user-scoped filtering
    if (API_KEY && API_SECRET) {
      headers['Authorization'] = `token ${API_KEY}:${API_SECRET}`;

      // Check for user impersonation header to ensure correct attribution
      const userEmail = request.headers.get('x-user-email');
      if (userEmail) {
        headers['X-Frappe-User'] = userEmail;
        console.log(`[API Proxy] Impersonating user: ${userEmail}`);
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
    if (API_KEY && API_SECRET) {
      headers['Authorization'] = `token ${API_KEY}:${API_SECRET}`;

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
    if (API_KEY && API_SECRET) {
      headers['Authorization'] = `token ${API_KEY}:${API_SECRET}`;

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