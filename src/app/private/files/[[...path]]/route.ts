import { NextRequest, NextResponse } from 'next/server';

const FRAPPE_BASE_URL = process.env.NEXT_PUBLIC_FRAPPE_BASE_URL || 'https://intern-dev.frappe.cloud';

// Admin API credentials (server-side only - NOT exposed to browser)
// Used for accessing private files with admin privileges
const ADMIN_API_KEY = process.env.FRAPPE_ADMIN_API_KEY;
const ADMIN_API_SECRET = process.env.FRAPPE_ADMIN_API_SECRET;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const params = await context.params;
    const filePath = params.path?.join('/') || '';

    // Construct the full URL to Frappe file
    const frappeFileUrl = `${FRAPPE_BASE_URL}/private/files/${filePath}${request.nextUrl.search}`;

    console.log(`[File Proxy] Proxying file request: ${frappeFileUrl}`);

    // Build headers - use admin API token for reliable file access
    const headers: Record<string, string> = {};

    if (ADMIN_API_KEY && ADMIN_API_SECRET) {
      headers['Authorization'] = `token ${ADMIN_API_KEY}:${ADMIN_API_SECRET}`;
    } else {
      // Fallback to forwarding cookies if no API token
      const cookie = request.headers.get('cookie');
      if (cookie) {
        headers['Cookie'] = cookie;
      }
    }

    // Forward the request to Frappe
    const response = await fetch(frappeFileUrl, { headers });

    if (!response.ok) {
      console.error(`[File Proxy] Frappe file request failed: ${response.status}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: response.status }
      );
    }

    // Get the file data
    const fileData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    console.log(`[File Proxy] Successfully proxied file (${contentType}, ${fileData.byteLength} bytes)`);

    // Return the file with appropriate headers
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[File Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy file' },
      { status: 500 }
    );
  }
}
