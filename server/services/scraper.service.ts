import dns from 'dns';
import net from 'net';

/**
 * Checks whether an IP address (IPv4 or IPv6) is a private, loopback, link-local,
 * multicast, broadcast, or reserved address.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return true; // Fail-closed
  }

  const trimmed = ip.trim().toLowerCase();

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1, ::ffff:192.168.1.1)
  if (trimmed.startsWith('::ffff:') || trimmed.includes(':ffff:')) {
    const lastColon = trimmed.lastIndexOf(':');
    const maybeIpv4 = trimmed.substring(lastColon + 1);
    if (net.isIPv4(maybeIpv4)) {
      return isPrivateOrReservedIp(maybeIpv4);
    }
  }

  // IPv6 checks
  if (trimmed.includes(':')) {
    // Loopback: ::1 or 0:0:0:0:0:0:0:1
    if (trimmed === '::1' || /^(0*:){7}0*1$/.test(trimmed)) {
      return true;
    }

    // Unspecified: :: or 0:0:0:0:0:0:0:0
    if (trimmed === '::' || /^(0*:){0,7}0*$/.test(trimmed)) {
      return true;
    }

    // IPv6 Unique Local Address: fc00::/7 (fc00... / fd00...)
    if (/^f[cd]/i.test(trimmed)) {
      return true;
    }

    // IPv6 Link-Local Address: fe80::/10 (fe8x, fe9x, feax, febx)
    if (/^fe[89ab]/i.test(trimmed)) {
      return true;
    }

    // Valid public IPv6
    if (net.isIPv6(trimmed)) {
      return false;
    }

    return true; // Malformed / unrecognized IPv6
  }

  // IPv4 checks
  const ipv4Match = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    return true;
  }

  const [o1, o2, o3, o4] = [
    Number(ipv4Match[1]),
    Number(ipv4Match[2]),
    Number(ipv4Match[3]),
    Number(ipv4Match[4]),
  ];

  if ([o1, o2, o3, o4].some((octet) => octet < 0 || octet > 255)) {
    return true;
  }

  // 0.0.0.0/8 (Default route / this host)
  if (o1 === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (o1 === 127) return true;
  // 10.0.0.0/8 (RFC 1918 Private)
  if (o1 === 10) return true;
  // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
  // 192.168.0.0/16 (RFC 1918 Private)
  if (o1 === 192 && o2 === 168) return true;
  // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
  if (o1 === 169 && o2 === 254) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
  if (o1 >= 224) return true;

  return false;
}

/**
 * Validates whether a URL is safe to fetch, preventing SSRF attacks and DNS rebinding.
 * Blocks non-http(s) protocols, credentials in URL (user:pass@), loopbacks,
 * RFC 1918 private subnets, link-local/cloud metadata IPs, internal domain names,
 * and domain names resolving to private/reserved IPs via DNS.
 */
export async function isSafeUrl(urlStr: string): Promise<boolean> {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }

  // Protocol check: only http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  // Reject URLs with embedded credentials (user:pass@)
  if (parsed.username || parsed.password) {
    return false;
  }

  // Strip IPv6 brackets if present and convert to lowercase
  const rawHost = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase().trim();
  if (!rawHost) {
    return false;
  }

  // Check localhost & localhost subdomains
  if (rawHost === 'localhost' || rawHost.endsWith('.localhost')) {
    return false;
  }

  // Check internal domain suffixes
  const internalSuffixes = [
    '.local',
    '.internal',
    '.lan',
    '.corp',
    '.home',
    '.home.arpa',
    '.test',
    '.example',
    '.invalid',
  ];
  if (internalSuffixes.some((suffix) => rawHost.endsWith(suffix))) {
    return false;
  }

  // Reject single-label hostnames without any dot (e.g. "intranet", "metadata")
  // unless it contains colons (IPv6 address)
  if (!rawHost.includes('.') && !rawHost.includes(':')) {
    return false;
  }

  // If hostname is a direct IP address (IPv4 or IPv6)
  if (net.isIP(rawHost) !== 0 || /^\d{1,3}(\.\d{1,3}){3}$/.test(rawHost)) {
    return !isPrivateOrReservedIp(rawHost);
  }

  // Hostname is a domain name -> resolve via DNS to protect against DNS rebinding
  try {
    const addresses = await dns.promises.lookup(rawHost, { all: true });
    if (!addresses || addresses.length === 0) {
      return false; // Fail-closed
    }

    // If ANY resolved IP is private or reserved, reject the request!
    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        return false;
      }
    }

    return true;
  } catch {
    // DNS resolution failure (e.g. ENOTFOUND) -> fail-closed
    return false;
  }
}

/**
 * Fetch webpage content safely with a short timeout and SSRF protection
 */
export async function fetchPageExcerpt(urlStr: string, timeoutMs: number = 6000): Promise<string> {
  if (!(await isSafeUrl(urlStr))) {
    return '';
  }

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
