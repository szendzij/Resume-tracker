/**
 * Normalizes a URL by stripping tracking parameters, trailing slashes,
 * and standardizing protocols/hosts to reliably detect duplicates.
 */
export function normalizeJobUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Filter out marketing/tracking parameters
    const trackingPrefixes = ['utm_', 'gad_'];
    const exactTrackingParams = new Set([
      'gclid',
      'gbraid',
      'eclid',
      'fbclid',
      'refid',
      'trackingid',
      'origin',
      'origintolandingjobpostings',
      'ebp',
      'campaignid',
      'adgroupid',
      'keyword',
      'searchid',
      'source',
      's',
    ]);

    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      const isTracking =
        exactTrackingParams.has(lowerKey) ||
        trackingPrefixes.some((prefix) => lowerKey.startsWith(prefix));
      if (!isTracking) {
        cleanParams.append(key, val);
      }
    });

    const queryString = cleanParams.toString();
    return `${parsed.protocol}//${host}${pathname}${queryString ? `?${queryString}` : ''}`;
  } catch {
    // If URL parsing fails, return a cleaned string
    return trimmed.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }
}
