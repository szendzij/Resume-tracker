/**
 * Fetch webpage content safely with a short timeout
 */
export async function fetchPageExcerpt(urlStr: string, timeoutMs: number = 6000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl,en-US;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return '';
    }

    const html = await res.text();
    // Quick cleanup to extract relevant text without massive HTML markup
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const desc = metaDescMatch ? metaDescMatch[1].trim() : '';
    const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';
    const ogDesc = ogDescMatch ? ogDescMatch[1].trim() : '';

    // Strip out script and style tags, convert block breaks to newlines
    const htmlWithBreaks = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');

    const cleanBody = htmlWithBreaks
      .replace(/<[^>]+>/g, ' ')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line) => line.length > 0)
      .join('\n')
      .slice(0, 3500);

    return `Page Title: ${title || ogTitle}\nDescription: ${desc || ogDesc}\nContent excerpt:\n${cleanBody}`;
  } catch {
    clearTimeout(timeoutId);
    return '';
  }
}
