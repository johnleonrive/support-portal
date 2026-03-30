export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '...');
}

export function truncateText(
  content: string | undefined,
  maxLength: number = 200,
  fallback: string = 'No content available'
): string {
  if (!content) return fallback;

  let text = stripHtml(content);
  text = decodeHtmlEntities(text).replace(/\s+/g, ' ').trim();

  if (!text) return fallback;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function transformFrappeUrls(html: string): string {
  if (!html) return html;
  const frappeBaseUrl = process.env.NEXT_PUBLIC_FRAPPE_BASE_URL || '';
  return html.replace(
    /src="(\/files\/[^"]+)"/g,
    `src="${frappeBaseUrl}$1"`
  );
}
