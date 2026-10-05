import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'dns';
import { isSafeUrl, isPrivateOrReservedIp, fetchPageExcerpt } from './scraper.service';

describe('scraper.service - SSRF Protection, DNS Rebinding & Scraping', () => {
  describe('isPrivateOrReservedIp', () => {
    it('detects IPv4 private, loopback, link-local, and multicast ranges', () => {
      // Loopback
      expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('127.0.0.2')).toBe(true);
      expect(isPrivateOrReservedIp('127.255.255.255')).toBe(true);

      // Default route / unspecified
      expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);

      // RFC 1918 Private ranges
      expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('10.255.255.254')).toBe(true);
      expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('172.24.1.10')).toBe(true);
      expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.1.5')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.254.254')).toBe(true);

      // Link-local & cloud metadata
      expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIp('169.254.0.1')).toBe(true);

      // Carrier-grade NAT
      expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('100.127.255.255')).toBe(true);

      // Multicast and Broadcast/Reserved
      expect(isPrivateOrReservedIp('224.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('239.255.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('240.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('255.255.255.255')).toBe(true);

      // Public IPv4 addresses
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIp('172.32.0.1')).toBe(false); // outside 172.16.0.0/12
      expect(isPrivateOrReservedIp('93.184.216.34')).toBe(false);
    });

    it('detects IPv6 loopback, unspecified, unique local, link-local, and IPv4-mapped', () => {
      // Loopback
      expect(isPrivateOrReservedIp('::1')).toBe(true);
      expect(isPrivateOrReservedIp('0:0:0:0:0:0:0:1')).toBe(true);

      // Unspecified
      expect(isPrivateOrReservedIp('::')).toBe(true);
      expect(isPrivateOrReservedIp('0:0:0:0:0:0:0:0')).toBe(true);

      // Unique Local (fc00::/7)
      expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
      expect(isPrivateOrReservedIp('fd00::1')).toBe(true);
      expect(isPrivateOrReservedIp('fd12:3456:789a::1')).toBe(true);

      // Link-Local (fe80::/10)
      expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
      expect(isPrivateOrReservedIp('fe80::2c4:21ff:fe12:3456')).toBe(true);
      expect(isPrivateOrReservedIp('feb0::1')).toBe(true);

      // IPv4-mapped IPv6
      expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:192.168.1.1')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:8.8.8.8')).toBe(false);

      // Public IPv6
      expect(isPrivateOrReservedIp('2606:4700:4700::1111')).toBe(false);
      expect(isPrivateOrReservedIp('2001:4860:4860::8888')).toBe(false);
    });
  });

  describe('isSafeUrl', () => {
    it('allows valid public http and https URLs', async () => {
      expect(await isSafeUrl('https://172.32.0.1/job')).toBe(true); // Direct public IP
      expect(await isSafeUrl('http://8.8.8.8/')).toBe(true);
      expect(await isSafeUrl('https://[2001:4860:4860::8888]/test')).toBe(true);
    });

    it('rejects URLs with credentials (user:pass@)', async () => {
      expect(await isSafeUrl('http://user:password@example.com/job')).toBe(false);
      expect(await isSafeUrl('https://admin:secret@8.8.8.8/api')).toBe(false);
      expect(await isSafeUrl('http://attacker@example.com/')).toBe(false);
    });

    it('rejects unsupported or unsafe protocols', async () => {
      expect(await isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(await isSafeUrl('ftp://ftp.example.com/file')).toBe(false);
      expect(await isSafeUrl('gopher://evil.com/')).toBe(false);
      expect(await isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(await isSafeUrl('data:text/html,<h1>test</h1>')).toBe(false);
      expect(await isSafeUrl('ws://example.com')).toBe(false);
      expect(await isSafeUrl('not-a-url')).toBe(false);
      expect(await isSafeUrl('')).toBe(false);
    });

    it('rejects direct loopback and 0.0.0.0 addresses', async () => {
      expect(await isSafeUrl('http://localhost:3000')).toBe(false);
      expect(await isSafeUrl('https://localhost/admin')).toBe(false);
      expect(await isSafeUrl('http://sub.localhost:8080')).toBe(false);
      expect(await isSafeUrl('http://127.0.0.1:8080')).toBe(false);
      expect(await isSafeUrl('http://127.0.0.2')).toBe(false);
      expect(await isSafeUrl('http://127.255.255.255:3000')).toBe(false);
      expect(await isSafeUrl('http://2130706433:80')).toBe(false);
      expect(await isSafeUrl('http://0.0.0.0')).toBe(false);
      expect(await isSafeUrl('http://0.0.0.0:8000')).toBe(false);
      expect(await isSafeUrl('http://[::1]')).toBe(false);
      expect(await isSafeUrl('http://[::1]:8080')).toBe(false);
      expect(await isSafeUrl('http://[::]')).toBe(false);
    });

    it('rejects direct RFC 1918 private IPv4 ranges', async () => {
      // 10.0.0.0/8
      expect(await isSafeUrl('http://10.0.0.1')).toBe(false);
      expect(await isSafeUrl('http://10.255.255.254/secret')).toBe(false);

      // 172.16.0.0/12
      expect(await isSafeUrl('http://172.16.0.1:8080')).toBe(false);
      expect(await isSafeUrl('http://172.24.1.10')).toBe(false);
      expect(await isSafeUrl('http://172.31.255.255')).toBe(false);

      // 192.168.0.0/16
      expect(await isSafeUrl('http://192.168.0.1')).toBe(false);
      expect(await isSafeUrl('http://192.168.1.5:3000')).toBe(false);
      expect(await isSafeUrl('http://192.168.254.254')).toBe(false);
    });

    it('rejects link-local addresses (cloud metadata & IPv6 link-local)', async () => {
      // AWS/GCP/Azure metadata service (169.254.169.254)
      expect(await isSafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(await isSafeUrl('http://169.254.0.1')).toBe(false);

      // IPv6 link-local (fe80::/10)
      expect(await isSafeUrl('http://[fe80::1]')).toBe(false);
      expect(await isSafeUrl('http://[fe80::2c4:21ff:fe12:3456]')).toBe(false);
    });

    it('rejects internal and local top-level domains', async () => {
      expect(await isSafeUrl('http://service.local')).toBe(false);
      expect(await isSafeUrl('https://api.internal')).toBe(false);
      expect(await isSafeUrl('http://router.lan')).toBe(false);
      expect(await isSafeUrl('http://workstation.corp')).toBe(false);
      expect(await isSafeUrl('http://myserver.home')).toBe(false);
      expect(await isSafeUrl('http://testbox.home.arpa')).toBe(false);
      expect(await isSafeUrl('http://intranet/status')).toBe(false);
      expect(await isSafeUrl('http://metadata')).toBe(false);
    });

    describe('DNS Rebinding protection', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('rejects domain resolving to loopback IP (DNS Rebinding to 127.0.0.1)', async () => {
        vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
          { address: '127.0.0.1', family: 4 },
        ] as any);

        expect(await isSafeUrl('http://attacker-rebinding.com/job')).toBe(false);
      });

      it('rejects domain resolving to private RFC 1918 subnet', async () => {
        vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
          { address: '192.168.1.100', family: 4 },
        ] as any);

        expect(await isSafeUrl('http://internal-portal.evil.com')).toBe(false);
      });

      it('rejects domain resolving to cloud metadata IP (169.254.169.254)', async () => {
        vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
          { address: '169.254.169.254', family: 4 },
        ] as any);

        expect(await isSafeUrl('http://metadata-proxy.com/secret')).toBe(false);
      });

      it('rejects domain resolving to IPv6 loopback (::1)', async () => {
        vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
          { address: '::1', family: 6 },
        ] as any);

        expect(await isSafeUrl('http://ipv6-rebinding.com')).toBe(false);
      });

      it('rejects domain when ANY resolved address is private (mixed public & private)', async () => {
        vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
          { address: '93.184.216.34', family: 4 }, // public
          { address: '10.0.0.5', family: 4 },      // private
        ] as any);

        expect(await isSafeUrl('http://dual-homed-rebinding.com')).toBe(false);
      });

      it('rejects domain when DNS lookup fails (fail-closed)', async () => {
        vi.spyOn(dns.promises, 'lookup').mockRejectedValueOnce(new Error('ENOTFOUND'));

        expect(await isSafeUrl('http://non-existent-domain-xyz.com')).toBe(false);
      });

      it('allows domain resolving only to safe public IPs', async () => {
        vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
          { address: '93.184.216.34', family: 4 },
          { address: '2606:4700:4700::1111', family: 6 },
        ] as any);

        expect(await isSafeUrl('https://example.com/job/123')).toBe(true);
      });
    });
  });

  describe('fetchPageExcerpt with SSRF protection', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('blocks SSRF targets immediately without making any fetch request', async () => {
      const ssrfUrls = [
        'http://127.0.0.1:8080/admin',
        'http://169.254.169.254/latest/meta-data/',
        'http://192.168.1.5:3000',
        'file:///etc/passwd',
        'ftp://example.com/file',
        'http://localhost:3000',
        'http://intranet/dashboard',
        'http://user:pass@example.com/job',
      ];

      for (const url of ssrfUrls) {
        const result = await fetchPageExcerpt(url);
        expect(result).toBe('');
      }

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('allows safe URL and parses HTML metadata', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Senior Frontend Engineer - Acme Corp</title>
            <meta name="description" content="Join our dynamic team building awesome web apps." />
          </head>
          <body>
            <h1>Job Requirements</h1>
            <p>We are looking for a skilled React and TypeScript developer.</p>
          </body>
        </html>
      `;

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      } as unknown as Response);

      const result = await fetchPageExcerpt('https://acme.com/jobs/senior-frontend');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(result).toContain('Page Title: Senior Frontend Engineer - Acme Corp');
      expect(result).toContain('Description: Join our dynamic team building awesome web apps.');
      expect(result).toContain('We are looking for a skilled React and TypeScript developer.');
    });
  });
});
