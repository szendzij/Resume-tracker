import { describe, it, expect } from 'vitest';
// Source of truth: the shared implementation used by the backend.
import { normalizeJobUrl } from '../shared/utils/urlUtils';
// Generated artifact bundled into the Chrome extension (see package.json build:extension-vendor).
import { normalizeJobUrl as normalizeJobUrlFromVendor } from '../extension/vendor/urlUtils.js';

/**
 * Parity contract: the extension must NOT carry its own copy of the URL
 * normalization rule. The bundled vendor artifact must be byte-for-byte
 * behaviorally identical to shared/utils/urlUtils.ts, otherwise the same
 * job offer could be stored twice.
 */

const URLS: string[] = [
  // utm_* tracking params, various cases, plus trailing slash
  'https://pracuj.pl/praca/qa,oferta,12345/?utm_source=linkedin&utm_campaign=ad&fbclid=abc123xyz/',
  // gclid + trailing slash
  'https://example.com/job/123/?gclid=CjwKCAjw12345',
  // fbclid
  'https://example.com/jobs/view/99999?fbclid=IwAR0abc',
  // gbraid
  'https://example.com/job/x?gbraid=0AAAAAbc',
  // short 's' param
  'https://nofluffjobs.com/job/senior-qa-engineer?s=abc123',
  // 's' plus utm_
  'https://linkedin.com/jobs/view/42/?s=xyz&utm_medium=social',
  // trailing slash only, no params
  'https://pracuj.pl/praca/developer/',
  // www prefix
  'https://www.indeed.com/viewjob?jk=abc',
  // www prefix + upper-case protocol/host
  'HTTPS://WWW.LINKEDIN.COM/jobs/view/99999/',
  // mixed case query params (UTM_Source / Gclid)
  'https://example.com/job/7?UTM_Source=news&Gclid=123',
  // fragment should be dropped
  'https://example.com/job/8?utm_source=fb#section-apply',
  // fragment only, no query
  'https://example.com/job/9#apply',
  // several tracking params mixed with a real one
  'https://example.com/job/10?utm_source=a&gclid=b&gbraid=c&refid=d&trackingid=e&keep=1',
  // 'origin', 'ebp', 'campaignid', 'adgroupid' exact params
  'https://example.com/job/11?origin=landing&ebp=1&campaignid=2&adgroupid=3&keyword=qa&searchid=4&source=gh',
  // non-tracking params must be preserved (case preserved, insertion order)
  'https://example.com/job/12?location=Warsaw&Seniority=Mid',
  // root path with trailing slash
  'https://example.com/?utm_source=x',
  // empty string
  '',
];

describe('URL normalization parity (shared source of truth vs extension vendor)', () => {
  it('exposes both implementations and they agree on at least 15 real URLs', () => {
    expect(typeof normalizeJobUrl).toBe('function');
    expect(typeof normalizeJobUrlFromVendor).toBe('function');
    expect(URLS.length).toBeGreaterThanOrEqual(15);

    for (const url of URLS) {
      expect(normalizeJobUrlFromVendor(url), `mismatch for ${url}`).toBe(
        normalizeJobUrl(url),
      );
    }
  });

  it('normalizes the exact popup-controller expectations (sanity, not just parity)', () => {
    expect(
      normalizeJobUrlFromVendor(
        'https://pracuj.pl/praca/qa,oferta,12345/?utm_source=linkedin&utm_campaign=ad&fbclid=abc123xyz/',
      ),
    ).toBe('https://pracuj.pl/praca/qa,oferta,12345');
    expect(normalizeJobUrlFromVendor('HTTPS://WWW.LINKEDIN.COM/jobs/view/99999/')).toBe(
      'https://linkedin.com/jobs/view/99999',
    );
  });
});
